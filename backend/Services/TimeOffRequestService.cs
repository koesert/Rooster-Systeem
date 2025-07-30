using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Extensions;

namespace backend.Services;

public class TimeOffRequestService : ITimeOffRequestService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TimeOffRequestService> _logger;
    private readonly IAvailabilityService _availabilityService;

    public TimeOffRequestService(ApplicationDbContext context, ILogger<TimeOffRequestService> logger, IAvailabilityService availabilityService)
    {
        _context = context;
        _logger = logger;
        _availabilityService = availabilityService;
    }

    public async Task<TimeOffRequest> CreateRequestAsync(int employeeId, CreateTimeOffRequestDto dto)
    {
        // Parse the date strings
        var startDate = DateTimeExtensions.ParseAsUtc(dto.StartDate, "dd-MM-yyyy");
        var endDate = DateTimeExtensions.ParseAsUtc(dto.EndDate, "dd-MM-yyyy");

        // Validatie: einddatum moet na of gelijk aan startdatum zijn
        if (endDate < startDate)
        {
            throw new InvalidOperationException("Einddatum moet na of gelijk aan startdatum zijn");
        }

        // Validatie: aanvraag moet minimaal 2 weken van tevoren
        var today = DateTime.UtcNow.Date;
        var minimumStartDate = today.AddDays(14);

        if (startDate.Date < minimumStartDate)
        {
            throw new InvalidOperationException("Vrij moet minimaal 2 weken van tevoren worden aangevraagd");
        }

        // Check voor overlappende aanvragen
        var hasOverlap = await HasOverlappingRequestsAsync(employeeId, startDate, endDate);
        if (hasOverlap)
        {
            throw new InvalidOperationException("Je hebt al een vrij aanvraag voor deze periode");
        }

        var request = new TimeOffRequest
        {
            EmployeeId = employeeId,
            Reason = dto.Reason,
            StartDate = startDate.Date,
            EndDate = endDate.Date,
            Status = TimeOffStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.TimeOffRequests.Add(request);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Vrij aanvraag aangemaakt voor werknemer {EmployeeId} van {StartDate} tot {EndDate}",
            employeeId, startDate, endDate);

        return request;
    }

    public async Task<IEnumerable<TimeOffRequestResponseDto>> GetAllRequestsAsync(TimeOffRequestFilterDto? filter = null)
    {
        var query = _context.TimeOffRequests
            .Include(r => r.Employee)
            .Include(r => r.Approver)
            .AsQueryable();

        if (filter != null)
        {
            if (filter.EmployeeId.HasValue)
            {
                query = query.Where(r => r.EmployeeId == filter.EmployeeId.Value);
            }

            if (!string.IsNullOrEmpty(filter.Status) && Enum.TryParse<TimeOffStatus>(filter.Status, out var status))
            {
                query = query.Where(r => r.Status == status);
            }

            if (!string.IsNullOrEmpty(filter.FromDate))
            {
                var fromDate = DateTimeExtensions.ParseAsUtc(filter.FromDate, "dd-MM-yyyy");
                query = query.Where(r => r.StartDate >= fromDate.Date);
            }

            if (!string.IsNullOrEmpty(filter.ToDate))
            {
                var toDate = DateTimeExtensions.ParseAsUtc(filter.ToDate, "dd-MM-yyyy");
                query = query.Where(r => r.EndDate <= toDate.Date);
            }
        }

        var requests = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return requests.Select(ConvertToResponseDto);
    }

    public async Task<TimeOffRequestResponseDto?> GetRequestByIdAsync(int id)
    {
        var request = await _context.TimeOffRequests
            .Include(r => r.Employee)
            .Include(r => r.Approver)
            .FirstOrDefaultAsync(r => r.Id == id);

        return request != null ? ConvertToResponseDto(request) : null;
    }

    public async Task<IEnumerable<TimeOffRequestResponseDto>> GetRequestsByEmployeeAsync(int employeeId)
    {
        var requests = await _context.TimeOffRequests
            .Include(r => r.Employee)
            .Include(r => r.Approver)
            .Where(r => r.EmployeeId == employeeId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return requests.Select(ConvertToResponseDto);
    }

    public async Task<TimeOffRequest> UpdateRequestStatusAsync(int id, UpdateTimeOffRequestStatusDto dto, int managerId)
    {
        var request = await _context.TimeOffRequests
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null)
        {
            throw new InvalidOperationException("Aanvraag niet gevonden");
        }

        if (request.Status != TimeOffStatus.Pending)
        {
            throw new InvalidOperationException("Alleen aanvragen met status 'Pending' kunnen worden bijgewerkt");
        }

        if (!Enum.TryParse<TimeOffStatus>(dto.Status, out var newStatus))
        {
            throw new InvalidOperationException("Ongeldige status");
        }

        var oldStatus = request.Status;
        var oldStartDate = request.StartDate;
        var oldEndDate = request.EndDate;

        request.Status = newStatus;
        request.ApprovedBy = managerId;
        request.UpdatedAt = DateTimeExtensions.UtcNow;

        _context.TimeOffRequests.Update(request);
        await _context.SaveChangesAsync();

        // Handle availability updates based on status changes
        if (newStatus == TimeOffStatus.Approved)
        {
            // If dates changed and was already approved, first clear old dates
            if (oldStatus == TimeOffStatus.Approved && (oldStartDate != request.StartDate || oldEndDate != request.EndDate))
            {
                await _availabilityService.UpdateAvailabilityForTimeOffAsync(
                    request.EmployeeId,
                    oldStartDate,
                    oldEndDate,
                    null  // Remove old records
                );
            }

            // Set new dates as time off
            await _availabilityService.UpdateAvailabilityForTimeOffAsync(
                request.EmployeeId,
                request.StartDate,
                request.EndDate,
                AvailabilityStatus.TimeOff
            );
        }
        // If was approved and now not approved, remove availability (back to "not specified")
        else if (oldStatus == TimeOffStatus.Approved && newStatus != TimeOffStatus.Approved)
        {
            await _availabilityService.UpdateAvailabilityForTimeOffAsync(
                request.EmployeeId,
                oldStartDate,
                oldEndDate,
                null  // Remove records - back to "not specified"
            );
        }

        _logger.LogInformation("Vrij aanvraag {Id} bijgewerkt door manager", id);

        return request;
    }

    public async Task<TimeOffRequest> UpdateRequestAsManagerAsync(int id, UpdateTimeOffRequestAsManagerDto dto, string userRole)
    {
        if (userRole != "Manager")
        {
            throw new InvalidOperationException("Alleen managers kunnen alle aanvragen bewerken");
        }

        var request = await _context.TimeOffRequests.FindAsync(id);

        if (request == null)
        {
            throw new InvalidOperationException("Aanvraag niet gevonden");
        }

        // Parse the date strings
        var startDate = DateTimeExtensions.ParseAsUtc(dto.StartDate, "dd-MM-yyyy");
        var endDate = DateTimeExtensions.ParseAsUtc(dto.EndDate, "dd-MM-yyyy");

        // Validatie: einddatum moet na of gelijk aan startdatum zijn
        if (endDate < startDate)
        {
            throw new InvalidOperationException("Einddatum moet na of gelijk aan startdatum zijn");
        }

        // Managers don't have the 2-week advance requirement
        // Check voor overlappende aanvragen (exclusief huidige aanvraag)
        var hasOverlap = await HasOverlappingRequestsAsync(request.EmployeeId, startDate, endDate, id);
        if (hasOverlap)
        {
            throw new InvalidOperationException("Deze medewerker heeft al een vrij aanvraag voor deze periode");
        }

        // Parse and validate status
        if (!Enum.TryParse<TimeOffStatus>(dto.Status, out var status))
        {
            throw new InvalidOperationException($"Ongeldige status: {dto.Status}");
        }

        var oldStatus = request.Status;
        var oldStartDate = request.StartDate;
        var oldEndDate = request.EndDate;

        // Update de aanvraag
        request.StartDate = startDate.EnsureUtc();
        request.EndDate = endDate.EnsureUtc();
        request.Reason = dto.Reason;
        request.Status = status;
        request.UpdatedAt = DateTimeExtensions.UtcNow;

        _context.TimeOffRequests.Update(request);
        await _context.SaveChangesAsync();

        // Handle availability updates based on status changes
        if (status == TimeOffStatus.Approved)
        {
            // If dates changed and was already approved, first clear old dates
            if (oldStatus == TimeOffStatus.Approved && (oldStartDate != startDate || oldEndDate != endDate))
            {
                await _availabilityService.UpdateAvailabilityForTimeOffAsync(
                    request.EmployeeId,
                    oldStartDate,
                    oldEndDate,
                    AvailabilityStatus.Available
                );
            }

            // Set new dates as time off
            await _availabilityService.UpdateAvailabilityForTimeOffAsync(
                request.EmployeeId,
                request.StartDate,
                request.EndDate,
                AvailabilityStatus.TimeOff
            );
        }
        // If was approved and now not approved, restore availability
        else if (oldStatus == TimeOffStatus.Approved && status != TimeOffStatus.Approved)
        {
            await _availabilityService.UpdateAvailabilityForTimeOffAsync(
                request.EmployeeId,
                oldStartDate,
                oldEndDate,
                AvailabilityStatus.Available
            );
        }

        _logger.LogInformation("Vrij aanvraag {Id} bijgewerkt door manager", id);

        return request;
    }

    public async Task<TimeOffRequest> UpdateRequestAsync(int id, int employeeId, CreateTimeOffRequestDto dto)
    {
        var request = await _context.TimeOffRequests.FindAsync(id);

        if (request == null)
        {
            throw new InvalidOperationException("Aanvraag niet gevonden");
        }

        // Check access: employees can only edit their own requests, managers can edit any
        var currentEmployee = await _context.Employees.FindAsync(employeeId);
        if (currentEmployee == null)
        {
            throw new InvalidOperationException("Werknemer niet gevonden");
        }

        var isManager = currentEmployee.Role == Role.Manager;

        if (!isManager && request.EmployeeId != employeeId)
        {
            throw new InvalidOperationException("Je kunt alleen je eigen aanvragen bewerken");
        }

        // Only pending requests can be edited by employees, managers can edit any status
        if (!isManager && request.Status != TimeOffStatus.Pending)
        {
            throw new InvalidOperationException("Alleen aanvragen met status 'Aangevraagd' kunnen worden bewerkt");
        }

        // Parse the date strings
        var startDate = DateTimeExtensions.ParseAsUtc(dto.StartDate, "dd-MM-yyyy");
        var endDate = DateTimeExtensions.ParseAsUtc(dto.EndDate, "dd-MM-yyyy");

        // Validatie: einddatum moet na of gelijk aan startdatum zijn
        if (endDate < startDate)
        {
            throw new InvalidOperationException("Einddatum moet na of gelijk aan startdatum zijn");
        }

        // Validatie: aanvraag moet minimaal 2 weken van tevoren (only for employees, not managers)
        if (!isManager)
        {
            var today = DateTime.UtcNow.Date;
            var minimumStartDate = today.AddDays(14);

            if (startDate.Date < minimumStartDate)
            {
                throw new InvalidOperationException("Vrij moet minimaal 2 weken van tevoren worden aangevraagd");
            }
        }

        // Check voor overlappende aanvragen (exclusief huidige aanvraag)
        var hasOverlap = await HasOverlappingRequestsAsync(request.EmployeeId, startDate, endDate, id);
        if (hasOverlap)
        {
            throw new InvalidOperationException("Deze medewerker heeft al een vrij aanvraag voor deze periode");
        }

        // Update de aanvraag
        request.StartDate = startDate.EnsureUtc();
        request.EndDate = endDate.EnsureUtc();
        request.Reason = dto.Reason;
        request.UpdatedAt = DateTimeExtensions.UtcNow;

        _context.TimeOffRequests.Update(request);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Vrij aanvraag {Id} bijgewerkt door {Role}",
            id, isManager ? "manager" : "werknemer");

        return request;
    }

    public async Task CancelRequestAsync(int id, int employeeId)
    {
        var request = await _context.TimeOffRequests
            .FirstOrDefaultAsync(r => r.Id == id && r.EmployeeId == employeeId);

        if (request == null)
        {
            throw new InvalidOperationException("Aanvraag niet gevonden of je hebt geen toegang");
        }

        if (request.Status != TimeOffStatus.Pending)
        {
            throw new InvalidOperationException("Alleen aanvragen met status 'Pending' kunnen worden geannuleerd");
        }

        var oldStatus = request.Status;
        request.Status = TimeOffStatus.Cancelled;
        request.UpdatedAt = DateTimeExtensions.UtcNow;

        _context.TimeOffRequests.Update(request);
        await _context.SaveChangesAsync();

        // If was approved, remove availability (back to "not specified")
        if (oldStatus == TimeOffStatus.Approved)
        {
            await _availabilityService.RemoveAvailabilityForTimeOffAsync(
                request.EmployeeId,
                request.StartDate,
                request.EndDate
            );
        }

        _logger.LogInformation("Vrij aanvraag {Id} geannuleerd door werknemer {EmployeeId}", id, employeeId);
    }


    public async Task DeleteRequestAsync(int id, int employeeId)
    {
        var request = await _context.TimeOffRequests
            .FirstOrDefaultAsync(r => r.Id == id && r.EmployeeId == employeeId);

        if (request == null)
        {
            throw new InvalidOperationException("Aanvraag niet gevonden of je hebt geen toegang");
        }

        // Check if user is manager
        var currentEmployee = await _context.Employees.FindAsync(employeeId);
        var isManager = currentEmployee?.Role == Role.Manager;

        // If not manager, only allow deletion of own pending requests
        if (!isManager)
        {
            if (request.EmployeeId != employeeId)
            {
                throw new InvalidOperationException("Je kunt alleen je eigen aanvragen verwijderen");
            }

            if (request.Status != TimeOffStatus.Pending)
            {
                throw new InvalidOperationException("Alleen aanvragen met status 'Pending' kunnen worden verwijderd");
            }
        }

        // If was approved, remove availability (back to "not specified")
        if (request.Status == TimeOffStatus.Approved)
        {
            await _availabilityService.RemoveAvailabilityForTimeOffAsync(
                request.EmployeeId,
                request.StartDate,
                request.EndDate
            );
        }

        _context.TimeOffRequests.Remove(request);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Vrij aanvraag {Id} verwijderd door {Role}",
            id, isManager ? "manager" : "werknemer");
    }

    public async Task<bool> HasOverlappingRequestsAsync(int employeeId, DateTime startDate, DateTime endDate, int? excludeRequestId = null)
    {
        var query = _context.TimeOffRequests
            .Where(r => r.EmployeeId == employeeId)
            .Where(r => r.Status == TimeOffStatus.Pending || r.Status == TimeOffStatus.Approved);

        if (excludeRequestId.HasValue)
        {
            query = query.Where(r => r.Id != excludeRequestId.Value);
        }

        // Check voor overlappende periodes
        var hasOverlap = await query.AnyAsync(r =>
            (r.StartDate <= endDate.Date && r.EndDate >= startDate.Date));

        return hasOverlap;
    }

    private TimeOffRequestResponseDto ConvertToResponseDto(TimeOffRequest request)
    {
        return new TimeOffRequestResponseDto
        {
            Id = request.Id,
            EmployeeId = request.EmployeeId,
            EmployeeName = request.Employee?.FullName ?? string.Empty,
            Status = request.Status.ToString(),
            Reason = request.Reason,
            StartDate = request.StartDate.ToString("dd-MM-yyyy"),
            EndDate = request.EndDate.ToString("dd-MM-yyyy"),
            ApprovedBy = request.ApprovedBy,
            ApproverName = request.Approver?.FullName,
            CreatedAt = request.CreatedAt.ToString("dd-MM-yyyy"),
            UpdatedAt = request.UpdatedAt.ToString("dd-MM-yyyy")
        };
    }
}