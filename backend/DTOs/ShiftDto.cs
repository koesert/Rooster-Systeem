using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs;

public class CreateShiftDto
{
    [Required(ErrorMessage = "Employee ID is required")]
    public int EmployeeId { get; set; }

    [Required(ErrorMessage = "Date is required")]
    public DateTime Date { get; set; }

    [Required(ErrorMessage = "Start time is required")]
    public TimeSpan StartTime { get; set; }

    /// <summary>
    /// End time for the shift. Not required if IsOpenEnded is true
    /// </summary>
    public TimeSpan? EndTime { get; set; }

    [Required(ErrorMessage = "Shift type is required")]
    public ShiftType ShiftType { get; set; } = ShiftType.Bedienen;

    /// <summary>
    /// Indicates if this is an open-ended shift
    /// </summary>
    public bool IsOpenEnded { get; set; } = false;

    /// <summary>
    /// Optional notes for the shift
    /// </summary>
    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
    public string? Notes { get; set; }
}

public class UpdateShiftDto
{
    [Required(ErrorMessage = "Employee ID is required")]
    public int EmployeeId { get; set; }

    [Required(ErrorMessage = "Date is required")]
    public DateTime Date { get; set; }

    [Required(ErrorMessage = "Start time is required")]
    public TimeSpan StartTime { get; set; }

    /// <summary>
    /// End time for the shift. Not required if IsOpenEnded is true
    /// </summary>
    public TimeSpan? EndTime { get; set; }

    [Required(ErrorMessage = "Shift type is required")]
    public ShiftType ShiftType { get; set; } = ShiftType.Bedienen;

    /// <summary>
    /// Indicates if this is an open-ended shift
    /// </summary>
    public bool IsOpenEnded { get; set; } = false;

    /// <summary>
    /// Optional notes for the shift
    /// </summary>
    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
    public string? Notes { get; set; }
}

public class ShiftResponseDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public ShiftType ShiftType { get; set; }
    public string ShiftTypeName { get; set; } = string.Empty;
    public bool IsOpenEnded { get; set; }
    public string? Notes { get; set; }
    public string TimeRange { get; set; } = string.Empty;
    public double? DurationInHours { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class WeekScheduleDto
{
    public string WeekNumber { get; set; } = string.Empty; // e.g., "2024-W01"
    public DateTime WeekStart { get; set; }
    public DateTime WeekEnd { get; set; }
    public List<ShiftResponseDto> Shifts { get; set; } = new();
}

public class MonthScheduleDto
{
    public string MonthYear { get; set; } = string.Empty; // e.g., "2024-01"
    public DateTime MonthStart { get; set; }
    public DateTime MonthEnd { get; set; }
    public List<ShiftResponseDto> Shifts { get; set; } = new();
}

public class ShiftFilterDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? EmployeeId { get; set; }
    public ShiftType? ShiftType { get; set; }
    public bool? IsOpenEnded { get; set; }
}