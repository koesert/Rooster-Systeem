using backend.DTOs;
using backend.Models;

namespace backend.Services;

public interface IShiftService
{
    /// <summary>
    /// Get all shifts with optional filtering
    /// </summary>
    Task<IEnumerable<ShiftResponseDto>> GetAllShiftsAsync(ShiftFilterDto? filter = null);

    /// <summary>
    /// Get a specific shift by ID
    /// </summary>
    Task<ShiftResponseDto?> GetShiftByIdAsync(int id);

    /// <summary>
    /// Get all shifts for a specific employee
    /// </summary>
    Task<IEnumerable<ShiftResponseDto>> GetShiftsByEmployeeAsync(int employeeId, DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// Get week schedule for a specific week
    /// </summary>
    Task<WeekScheduleDto> GetWeekScheduleAsync(string weekNumber); // e.g., "2024-W01"

    /// <summary>
    /// Get month schedule for a specific month
    /// </summary>
    Task<MonthScheduleDto> GetMonthScheduleAsync(string monthYear); // e.g., "2024-01"

    /// <summary>
    /// Create a new shift
    /// </summary>
    Task<ShiftResponseDto> CreateShiftAsync(CreateShiftDto shiftDto);

    /// <summary>
    /// Update an existing shift
    /// </summary>
    Task<ShiftResponseDto?> UpdateShiftAsync(int id, UpdateShiftDto shiftDto);

    /// <summary>
    /// Delete a shift
    /// </summary>
    Task<bool> DeleteShiftAsync(int id);

    /// <summary>
    /// Check if an employee has overlapping shifts
    /// </summary>
    Task<bool> HasOverlappingShiftsAsync(int employeeId, DateTime date, TimeSpan startTime, TimeSpan? endTime, int? excludeShiftId = null);

    /// <summary>
    /// Get shifts for a specific date range
    /// </summary>
    Task<IEnumerable<ShiftResponseDto>> GetShiftsByDateRangeAsync(DateTime startDate, DateTime endDate);

    /// <summary>
    /// Get available employees for a specific date and time
    /// </summary>
    Task<IEnumerable<EmployeeResponseDto>> GetAvailableEmployeesAsync(DateTime date, TimeSpan startTime, TimeSpan? endTime);

    /// <summary>
    /// Convert ShiftType enum to Dutch display name
    /// </summary>
    string GetShiftTypeName(ShiftType shiftType);
}