using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;
using System.Globalization;

namespace backend.Services;

public class ShiftService : IShiftService
{
    private readonly ApplicationDbContext _context;
    private readonly IEmployeeService _employeeService;

    public ShiftService(ApplicationDbContext context, IEmployeeService employeeService)
    {
        _context = context;
        _employeeService = employeeService;
    }

    public async Task<IEnumerable<ShiftResponseDto>> GetAllShiftsAsync(ShiftFilterDto? filter = null)
    {
        var query = _context.Shifts
            .Include(s => s.Employee)
            .AsQueryable();

        // Apply filters
        if (filter != null)
        {
            if (filter.StartDate.HasValue)
            {
                query = query.Where(s => s.Date >= filter.StartDate.Value);
            }

            if (filter.EndDate.HasValue)
            {
                query = query.Where(s => s.Date <= filter.EndDate.Value);
            }

            if (filter.EmployeeId.HasValue)
            {
                query = query.Where(s => s.EmployeeId == filter.EmployeeId.Value);
            }

            if (filter.ShiftType.HasValue)
            {
                query = query.Where(s => s.ShiftType == filter.ShiftType.Value);
            }

            if (filter.IsOpenEnded.HasValue)
            {
                query = query.Where(s => s.IsOpenEnded == filter.IsOpenEnded.Value);
            }
        }

        var shifts = await query
            .OrderBy(s => s.Date)
            .ToListAsync();

        // Order by StartTime on the client side since SQLite doesn't support TimeSpan ordering
        var orderedShifts = shifts
            .OrderBy(s => s.Date)
            .ThenBy(s => s.StartTime)
            .ToList();

        return orderedShifts.Select(ConvertToResponseDto);
    }

    public async Task<ShiftResponseDto?> GetShiftByIdAsync(int id)
    {
        var shift = await _context.Shifts
            .Include(s => s.Employee)
            .FirstOrDefaultAsync(s => s.Id == id);

        return shift != null ? ConvertToResponseDto(shift) : null;
    }

    public async Task<IEnumerable<ShiftResponseDto>> GetShiftsByEmployeeAsync(int employeeId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.Shifts
            .Include(s => s.Employee)
            .Where(s => s.EmployeeId == employeeId);

        if (startDate.HasValue)
        {
            query = query.Where(s => s.Date >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(s => s.Date <= endDate.Value);
        }

        var shifts = await query
            .OrderBy(s => s.Date)
            .ToListAsync();

        // Order by StartTime on the client side since SQLite doesn't support TimeSpan ordering
        var orderedShifts = shifts
            .OrderBy(s => s.Date)
            .ThenBy(s => s.StartTime)
            .ToList();

        return orderedShifts.Select(ConvertToResponseDto);
    }

    public async Task<WeekScheduleDto> GetWeekScheduleAsync(string weekNumber)
    {
        // Parse week number (e.g., "2024-W01")
        var (year, week) = ParseWeekNumber(weekNumber);
        var (weekStart, weekEnd) = GetWeekDateRange(year, week);

        var shifts = await GetShiftsByDateRangeAsync(weekStart, weekEnd);

        return new WeekScheduleDto
        {
            WeekNumber = weekNumber,
            WeekStart = weekStart,
            WeekEnd = weekEnd,
            Shifts = shifts.ToList()
        };
    }

    public async Task<MonthScheduleDto> GetMonthScheduleAsync(string monthYear)
    {
        // Parse month year (e.g., "2024-01")
        var parts = monthYear.Split('-');
        if (parts.Length != 2 || !int.TryParse(parts[0], out int year) || !int.TryParse(parts[1], out int month))
        {
            throw new ArgumentException("Invalid month format. Expected format: YYYY-MM");
        }

        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var shifts = await GetShiftsByDateRangeAsync(monthStart, monthEnd);

        return new MonthScheduleDto
        {
            MonthYear = monthYear,
            MonthStart = monthStart,
            MonthEnd = monthEnd,
            Shifts = shifts.ToList()
        };
    }

    public async Task<ShiftResponseDto> CreateShiftAsync(CreateShiftDto shiftDto)
    {
        // Validate business rules
        await ValidateShiftAsync(shiftDto.EmployeeId, shiftDto.Date, shiftDto.StartTime, shiftDto.EndTime, shiftDto.IsOpenEnded);

        // Check for overlapping shifts
        var hasOverlap = await HasOverlappingShiftsAsync(shiftDto.EmployeeId, shiftDto.Date, shiftDto.StartTime, shiftDto.EndTime);
        if (hasOverlap)
        {
            throw new InvalidOperationException("Deze medewerker heeft al een overlappende shift op deze datum en tijd");
        }

        var shift = new Shift
        {
            EmployeeId = shiftDto.EmployeeId,
            Date = shiftDto.Date.Date, // Ensure only date part
            StartTime = shiftDto.StartTime,
            EndTime = shiftDto.IsOpenEnded ? null : shiftDto.EndTime,
            ShiftType = shiftDto.ShiftType,
            IsOpenEnded = shiftDto.IsOpenEnded,
            Notes = shiftDto.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Shifts.Add(shift);
        await _context.SaveChangesAsync();

        // Reload with employee data
        await _context.Entry(shift)
            .Reference(s => s.Employee)
            .LoadAsync();

        return ConvertToResponseDto(shift);
    }

    public async Task<ShiftResponseDto?> UpdateShiftAsync(int id, UpdateShiftDto shiftDto)
    {
        var shift = await _context.Shifts
            .Include(s => s.Employee)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shift == null)
        {
            return null;
        }

        // Validate business rules
        await ValidateShiftAsync(shiftDto.EmployeeId, shiftDto.Date, shiftDto.StartTime, shiftDto.EndTime, shiftDto.IsOpenEnded);

        // Check for overlapping shifts (excluding current shift)
        var hasOverlap = await HasOverlappingShiftsAsync(shiftDto.EmployeeId, shiftDto.Date, shiftDto.StartTime, shiftDto.EndTime, id);
        if (hasOverlap)
        {
            throw new InvalidOperationException("Deze medewerker heeft al een overlappende shift op deze datum en tijd");
        }

        // Update shift properties
        shift.EmployeeId = shiftDto.EmployeeId;
        shift.Date = shiftDto.Date.Date;
        shift.StartTime = shiftDto.StartTime;
        shift.EndTime = shiftDto.IsOpenEnded ? null : shiftDto.EndTime;
        shift.ShiftType = shiftDto.ShiftType;
        shift.IsOpenEnded = shiftDto.IsOpenEnded;
        shift.Notes = shiftDto.Notes;
        shift.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Reload employee data if employee changed
        await _context.Entry(shift)
            .Reference(s => s.Employee)
            .LoadAsync();

        return ConvertToResponseDto(shift);
    }

    public async Task<bool> DeleteShiftAsync(int id)
    {
        var shift = await _context.Shifts.FindAsync(id);
        if (shift == null)
        {
            return false;
        }

        _context.Shifts.Remove(shift);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HasOverlappingShiftsAsync(int employeeId, DateTime date, TimeSpan startTime, TimeSpan? endTime, int? excludeShiftId = null)
    {
        var query = _context.Shifts
            .Where(s => s.EmployeeId == employeeId && s.Date.Date == date.Date);

        if (excludeShiftId.HasValue)
        {
            query = query.Where(s => s.Id != excludeShiftId.Value);
        }

        var existingShifts = await query.ToListAsync();

        foreach (var existingShift in existingShifts)
        {
            // Check for time overlap
            if (HasTimeOverlap(startTime, endTime, existingShift.StartTime, existingShift.EndTime, existingShift.IsOpenEnded))
            {
                return true;
            }
        }

        return false;
    }

    public async Task<IEnumerable<ShiftResponseDto>> GetShiftsByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        var shifts = await _context.Shifts
            .Include(s => s.Employee)
            .Where(s => s.Date >= startDate.Date && s.Date <= endDate.Date)
            .OrderBy(s => s.Date)
            .ToListAsync();

        // Order by StartTime on the client side since SQLite doesn't support TimeSpan ordering
        var orderedShifts = shifts
            .OrderBy(s => s.Date)
            .ThenBy(s => s.StartTime)
            .ToList();

        return orderedShifts.Select(ConvertToResponseDto);
    }

    public async Task<IEnumerable<EmployeeResponseDto>> GetAvailableEmployeesAsync(DateTime date, TimeSpan startTime, TimeSpan? endTime)
    {
        // Get all employees
        var allEmployees = await _employeeService.GetAllEmployeesAsync();

        // Get employees who don't have overlapping shifts
        var availableEmployees = new List<EmployeeResponseDto>();

        foreach (var employee in allEmployees)
        {
            var hasOverlap = await HasOverlappingShiftsAsync(employee.Id, date, startTime, endTime);
            if (!hasOverlap)
            {
                availableEmployees.Add(new EmployeeResponseDto
                {
                    Id = employee.Id,
                    FirstName = employee.FirstName,
                    LastName = employee.LastName,
                    Username = employee.Username,
                    FullName = employee.FullName,
                    Role = employee.Role,
                    HireDate = employee.HireDate,
                    BirthDate = employee.BirthDate,
                    CreatedAt = employee.CreatedAt,
                    UpdatedAt = employee.UpdatedAt
                });
            }
        }

        return availableEmployees;
    }

    public string GetShiftTypeName(ShiftType shiftType)
    {
        return shiftType switch
        {
            ShiftType.Schoonmaak => "Schoonmaak",
            ShiftType.Bedienen => "Bedienen",
            ShiftType.SchoonmaakBedienen => "Schoonmaak & Bedienen",
            _ => "Onbekend"
        };
    }

    // Private helper methods

    private ShiftResponseDto ConvertToResponseDto(Shift shift)
    {
        return new ShiftResponseDto
        {
            Id = shift.Id,
            EmployeeId = shift.EmployeeId,
            EmployeeName = shift.Employee.FullName,
            Date = shift.Date,
            StartTime = shift.StartTime,
            EndTime = shift.EndTime,
            ShiftType = shift.ShiftType,
            ShiftTypeName = GetShiftTypeName(shift.ShiftType),
            IsOpenEnded = shift.IsOpenEnded,
            Notes = shift.Notes,
            TimeRange = shift.TimeRange,
            DurationInHours = shift.DurationInHours,
            CreatedAt = shift.CreatedAt,
            UpdatedAt = shift.UpdatedAt
        };
    }

    private async Task ValidateShiftAsync(int employeeId, DateTime date, TimeSpan startTime, TimeSpan? endTime, bool isOpenEnded)
    {
        // Check if employee exists
        var employee = await _employeeService.GetEmployeeByIdAsync(employeeId);
        if (employee == null)
        {
            throw new InvalidOperationException("Medewerker niet gevonden");
        }

        // Validate times
        if (!isOpenEnded)
        {
            if (endTime == null)
            {
                throw new InvalidOperationException("Eindtijd is verplicht voor niet-open shifts");
            }

            if (endTime <= startTime)
            {
                throw new InvalidOperationException("Eindtijd moet na de starttijd liggen");
            }

            // Check for reasonable shift duration (not more than 16 hours)
            var duration = endTime.Value - startTime;
            if (duration.TotalHours > 16)
            {
                throw new InvalidOperationException("Shift kan niet langer dan 16 uur duren");
            }
        }

        // Validate business hours (assuming 06:00 - 02:00 next day)
        if (startTime < TimeSpan.FromHours(6) && startTime > TimeSpan.FromHours(2))
        {
            throw new InvalidOperationException("Starttijd moet tussen 06:00 en 02:00 liggen");
        }
    }

    private bool HasTimeOverlap(TimeSpan startTime1, TimeSpan? endTime1, TimeSpan startTime2, TimeSpan? endTime2, bool isOpenEnded2)
    {
        // Handle open-ended shifts
        if (isOpenEnded2)
        {
            // If existing shift is open-ended, any new shift starting after it would overlap
            return startTime1 >= startTime2;
        }

        if (endTime1 == null && endTime2 == null)
        {
            // Both open-ended - always overlap
            return true;
        }

        if (endTime1 == null)
        {
            // First shift is open-ended
            return startTime1 <= endTime2;
        }

        if (endTime2 == null)
        {
            // Second shift is open-ended (already handled above)
            return startTime2 <= endTime1;
        }

        // Normal time overlap check
        return startTime1 < endTime2 && endTime1 > startTime2;
    }

    private (int year, int week) ParseWeekNumber(string weekNumber)
    {
        // Expected format: "2024-W01"
        var parts = weekNumber.Split('-');
        if (parts.Length != 2 || !parts[1].StartsWith("W"))
        {
            throw new ArgumentException("Invalid week format. Expected format: YYYY-WNN");
        }

        if (!int.TryParse(parts[0], out int year) || !int.TryParse(parts[1][1..], out int week))
        {
            throw new ArgumentException("Invalid week format. Expected format: YYYY-WNN");
        }

        if (week < 1 || week > 53)
        {
            throw new ArgumentException("Week number must be between 1 and 53");
        }

        return (year, week);
    }

    private (DateTime weekStart, DateTime weekEnd) GetWeekDateRange(int year, int week)
    {
        // ISO 8601 week calculation
        var jan1 = new DateTime(year, 1, 1);
        var daysOffset = DayOfWeek.Thursday - jan1.DayOfWeek;
        var firstThursday = jan1.AddDays(daysOffset);
        var cal = CultureInfo.CurrentCulture.Calendar;
        var firstWeek = cal.GetWeekOfYear(firstThursday, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);

        var weekNum = week;
        if (firstWeek == 1)
        {
            weekNum -= 1;
        }

        var result = firstThursday.AddDays(weekNum * 7);
        var weekStart = result.AddDays(-3); // Monday of the week
        var weekEnd = weekStart.AddDays(6); // Sunday of the week

        return (weekStart, weekEnd);
    }
}