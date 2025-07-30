using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Extensions;
using System.Globalization;

namespace backend.Services;

public class AvailabilityService : IAvailabilityService
{
    private readonly ApplicationDbContext _context;
    private readonly IEmployeeService _employeeService;

    public AvailabilityService(ApplicationDbContext context, IEmployeeService employeeService)
    {
        _context = context;
        _employeeService = employeeService;
    }

    public async Task<WeekAvailabilityDto> GetWeekAvailabilityAsync(int employeeId, string weekStart)
    {
        var weekStartDate = ParseDateString(weekStart);
        var mondayDate = GetMondayOfWeek(weekStartDate);

        // Validate employee exists
        var employee = await _employeeService.GetEmployeeByIdAsync(employeeId);
        if (employee == null)
        {
            throw new InvalidOperationException("Medewerker niet gevonden");
        }

        // Get all availability records for the week
        var weekEndDate = mondayDate.AddDays(6); // Sunday
        var availabilities = await _context.Availabilities
            .Where(a => a.EmployeeId == employeeId
                && a.Date >= mondayDate
                && a.Date <= weekEndDate)
            .ToListAsync();

        var weekAvailability = new WeekAvailabilityDto
        {
            WeekStart = FormatDateString(mondayDate),
            EmployeeId = employeeId,
            EmployeeName = employee.FullName,
            Days = new List<DayAvailabilityDto>()
        };

        // Create 7 days (Monday to Sunday)
        for (int i = 0; i < 7; i++)
        {
            var currentDate = mondayDate.AddDays(i);
            var availability = availabilities.FirstOrDefault(a => a.Date.Date == currentDate.Date);

            weekAvailability.Days.Add(new DayAvailabilityDto
            {
                Id = availability?.Id,
                Date = FormatDateString(currentDate),
                DayOfWeek = GetDutchDayName(currentDate),
                Status = availability?.Status,
                Notes = availability?.Notes
            });
        }

        return weekAvailability;
    }

    public async Task<List<WeekAvailabilityDto>> GetEmployeeAvailabilityAsync(int employeeId, string startDate, string endDate)
    {
        var start = ParseDateString(startDate);
        var end = ParseDateString(endDate);

        // Validate employee exists
        var employee = await _employeeService.GetEmployeeByIdAsync(employeeId);
        if (employee == null)
        {
            throw new InvalidOperationException("Medewerker niet gevonden");
        }

        var weeks = new List<WeekAvailabilityDto>();
        var currentMonday = GetMondayOfWeek(start);

        while (currentMonday <= end)
        {
            var week = await GetWeekAvailabilityAsync(employeeId, FormatDateString(currentMonday));
            weeks.Add(week);
            currentMonday = currentMonday.AddDays(7);
        }

        return weeks;
    }

    public async Task<WeekAvailabilityDto> UpdateWeekAvailabilityAsync(UpdateWeekAvailabilityDto updateDto)
    {
        var weekStartDate = ParseDateString(updateDto.WeekStart);
        var mondayDate = GetMondayOfWeek(weekStartDate);

        // Validate employee exists
        var employee = await _employeeService.GetEmployeeByIdAsync(updateDto.EmployeeId);
        if (employee == null)
        {
            throw new InvalidOperationException("Medewerker niet gevonden");
        }

        // Validate dates are within allowed range
        for (int i = 0; i < 7; i++)
        {
            var dayDate = mondayDate.AddDays(i);
            if (!IsDateWithinAllowedRange(dayDate))
            {
                throw new InvalidOperationException($"Datum {FormatDateString(dayDate)} valt buiten het toegestane bereik");
            }
        }

        // Check if current week is locked (cannot be modified after Monday 00:00)
        var today = DateTime.Today;
        var currentWeekMonday = GetMondayOfWeek(today);

        if (mondayDate <= currentWeekMonday)
        {
            throw new InvalidOperationException("De huidige week kan niet meer worden aangepast");
        }

        // Get existing availability records for the week
        var weekEndDate = mondayDate.AddDays(6);
        var existingAvailabilities = await _context.Availabilities
            .Where(a => a.EmployeeId == updateDto.EmployeeId
                && a.Date >= mondayDate
                && a.Date <= weekEndDate)
            .ToListAsync();

        foreach (var day in updateDto.Days)
        {
            var dayDate = ParseDateString(day.Date);
            var existingAvailability = existingAvailabilities.FirstOrDefault(a => a.Date.Date == dayDate.Date);

            if (day.Status == null)
            {
                // Remove availability record if it exists
                if (existingAvailability != null)
                {
                    _context.Availabilities.Remove(existingAvailability);
                }
            }
            else
            {
                if (existingAvailability != null)
                {
                    // Update existing record, but only if it's not TimeOff (approved leave has priority)
                    if (existingAvailability.Status != AvailabilityStatus.TimeOff)
                    {
                        existingAvailability.Status = day.Status.Value;
                        existingAvailability.Notes = string.IsNullOrWhiteSpace(day.Notes) ? null : day.Notes.Trim();
                        existingAvailability.UpdatedAt = DateTime.UtcNow;
                        _context.Availabilities.Update(existingAvailability);
                    }
                }
                else
                {
                    // Create new availability record
                    var availability = new Availability
                    {
                        EmployeeId = updateDto.EmployeeId,
                        Date = dayDate.EnsureUtc(),
                        Status = day.Status.Value,
                        Notes = string.IsNullOrWhiteSpace(day.Notes) ? null : day.Notes.Trim(),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Availabilities.Add(availability);
                }
            }
        }

        await _context.SaveChangesAsync();

        // Return updated week data
        return await GetWeekAvailabilityAsync(updateDto.EmployeeId, FormatDateString(mondayDate));
    }

    public async Task<List<WeekAvailabilityDto>> GetAllEmployeesWeekAvailabilityAsync(string weekStart)
    {
        var weekStartDate = ParseDateString(weekStart);
        var mondayDate = GetMondayOfWeek(weekStartDate);

        // Get all employees
        var employees = await _employeeService.GetAllEmployeesAsync();
        var allWeekAvailabilities = new List<WeekAvailabilityDto>();

        foreach (var employee in employees)
        {
            var weekAvailability = await GetWeekAvailabilityAsync(employee.Id, FormatDateString(mondayDate));
            allWeekAvailabilities.Add(weekAvailability);
        }

        return allWeekAvailabilities.OrderBy(w => w.EmployeeName).ToList();
    }

    /// <summary>
    /// Update availability status for time off periods (called when time off is approved)
    /// </summary>
    public async Task UpdateAvailabilityForTimeOffAsync(int employeeId, DateTime startDate, DateTime endDate, AvailabilityStatus status)
    {
        var currentDate = startDate.Date;

        while (currentDate <= endDate.Date)
        {
            var existingAvailability = await _context.Availabilities
                .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date.Date == currentDate);

            if (existingAvailability != null)
            {
                // Update existing availability
                existingAvailability.Status = status;
                existingAvailability.UpdatedAt = DateTime.UtcNow;
                _context.Availabilities.Update(existingAvailability);
            }
            else
            {
                // Create new availability record
                var availability = new Availability
                {
                    EmployeeId = employeeId,
                    Date = currentDate,
                    Status = status,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Availabilities.Add(availability);
            }

            currentDate = currentDate.AddDays(1);
        }

        await _context.SaveChangesAsync();
    }

    public bool IsDateWithinAllowedRange(DateTime date)
    {
        var today = DateTime.Today;
        var currentWeekMonday = GetMondayOfWeek(today);
        var maxAllowedDate = currentWeekMonday.AddDays(4 * 7 - 1); // 4 weeks from current week start

        return date >= currentWeekMonday && date <= maxAllowedDate;
    }

    public DateTime GetMondayOfWeek(DateTime date)
    {
        var dayOfWeek = (int)date.DayOfWeek;
        var daysToSubtract = dayOfWeek == 0 ? 6 : dayOfWeek - 1; // Handle Sunday as 0
        return date.AddDays(-daysToSubtract).Date;
    }

    public DateTime ParseDateString(string dateString)
    {
        if (string.IsNullOrWhiteSpace(dateString))
        {
            throw new ArgumentException("Datum string mag niet leeg zijn");
        }

        // Use the extension method for robust UTC handling
        try
        {
            return DateTimeExtensions.ParseAsUtc(dateString, "dd-MM-yyyy");
        }
        catch
        {
            // Fallback to standard parsing
            return DateTimeExtensions.ParseAsUtc(dateString);
        }
    }

    public string FormatDateString(DateTime date)
    {
        return date.ToString("dd-MM-yyyy");
    }

    public string GetDutchDayName(DateTime date)
    {
        return date.DayOfWeek switch
        {
            DayOfWeek.Monday => "maandag",
            DayOfWeek.Tuesday => "dinsdag",
            DayOfWeek.Wednesday => "woensdag",
            DayOfWeek.Thursday => "donderdag",
            DayOfWeek.Friday => "vrijdag",
            DayOfWeek.Saturday => "zaterdag",
            DayOfWeek.Sunday => "zondag",
            _ => "onbekend"
        };
    }
}