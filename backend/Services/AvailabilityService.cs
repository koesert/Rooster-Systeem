using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;
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
                IsAvailable = availability?.IsAvailable,
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

        // Validate all dates are within allowed range
        foreach (var day in updateDto.Days)
        {
            var dayDate = ParseDateString(day.Date);
            if (!IsDateWithinAllowedRange(dayDate))
            {
                throw new InvalidOperationException($"Datum {day.Date} ligt buiten het toegestane bereik (max 4 weken vooruit)");
            }
        }

        // Remove all existing availability records for this week
        var weekEndDate = mondayDate.AddDays(6);
        var existingRecords = await _context.Availabilities
            .Where(a => a.EmployeeId == updateDto.EmployeeId
                && a.Date >= mondayDate
                && a.Date <= weekEndDate)
            .ToListAsync();

        _context.Availabilities.RemoveRange(existingRecords);

        // Add new availability records
        foreach (var day in updateDto.Days)
        {
            // Only create records if availability is explicitly set (not null)
            if (day.IsAvailable.HasValue)
            {
                var dayDate = ParseDateString(day.Date);

                var availability = new Availability
                {
                    EmployeeId = updateDto.EmployeeId,
                    Date = dayDate,
                    IsAvailable = day.IsAvailable.Value,
                    Notes = string.IsNullOrWhiteSpace(day.Notes) ? null : day.Notes.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Availabilities.Add(availability);
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

        // Handle DD-MM-YYYY format
        if (DateTime.TryParseExact(dateString, "dd-MM-yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return date;
        }

        // Fallback to standard parsing
        if (DateTime.TryParse(dateString, out var fallbackDate))
        {
            return fallbackDate;
        }

        throw new ArgumentException($"Ongeldige datum format: {dateString}. Verwacht format: DD-MM-YYYY");
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