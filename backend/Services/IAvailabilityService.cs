using backend.DTOs;
using backend.Models;

namespace backend.Services;

public interface IAvailabilityService
{
    /// <summary>
    /// Get week availability for a specific employee
    /// </summary>
    Task<WeekAvailabilityDto> GetWeekAvailabilityAsync(int employeeId, string weekStart);

    /// <summary>
    /// Get availability for multiple weeks for an employee
    /// </summary>
    Task<List<WeekAvailabilityDto>> GetEmployeeAvailabilityAsync(int employeeId, string startDate, string endDate);

    /// <summary>
    /// Update entire week availability for an employee
    /// </summary>
    Task<WeekAvailabilityDto> UpdateWeekAvailabilityAsync(UpdateWeekAvailabilityDto updateDto);

    /// <summary>
    /// Get all employees availability for a specific week (manager only)
    /// </summary>
    Task<List<WeekAvailabilityDto>> GetAllEmployeesWeekAvailabilityAsync(string weekStart);

    /// <summary>
    /// Update availability status for time off periods (called when time off is approved)
    /// If status is null, removes the availability records (back to "not specified")
    /// </summary>
    Task UpdateAvailabilityForTimeOffAsync(int employeeId, DateTime startDate, DateTime endDate, AvailabilityStatus? status);

    /// <summary>
    /// Remove availability records for time off periods (called when time off is deleted/cancelled)
    /// This makes the days return to "not specified" status
    /// </summary>
    Task RemoveAvailabilityForTimeOffAsync(int employeeId, DateTime startDate, DateTime endDate);

    /// <summary>
    /// Validate if date is within allowed range (max 4 weeks ahead)
    /// </summary>
    bool IsDateWithinAllowedRange(DateTime date);

    /// <summary>
    /// Get Monday date for a given date
    /// </summary>
    DateTime GetMondayOfWeek(DateTime date);

    /// <summary>
    /// Parse DD-MM-YYYY date string to DateTime
    /// </summary>
    DateTime ParseDateString(string dateString);

    /// <summary>
    /// Format DateTime to DD-MM-YYYY string
    /// </summary>
    string FormatDateString(DateTime date);

    /// <summary>
    /// Get Dutch day name for DateTime
    /// </summary>
    string GetDutchDayName(DateTime date);
}