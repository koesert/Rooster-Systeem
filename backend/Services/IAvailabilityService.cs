using backend.DTOs;

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