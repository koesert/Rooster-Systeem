using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Shift
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Employee ID is required")]
    public int EmployeeId { get; set; }

    [Required(ErrorMessage = "Date is required")]
    public DateTime Date { get; set; }

    [Required(ErrorMessage = "Start time is required")]
    public TimeSpan StartTime { get; set; }

    /// <summary>
    /// End time for the shift. Null if IsOpenEnded is true
    /// </summary>
    public TimeSpan? EndTime { get; set; }

    [Required(ErrorMessage = "Shift type is required")]
    public ShiftType ShiftType { get; set; } = ShiftType.Bedienen;

    /// <summary>
    /// Indicates if this is an open-ended shift (works until closing time)
    /// </summary>
    public bool IsOpenEnded { get; set; } = false;

    /// <summary>
    /// Optional notes for the shift
    /// </summary>
    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Employee Employee { get; set; } = null!;

    /// <summary>
    /// Computed property for display purposes
    /// Returns formatted time range (e.g., "13:00 - 22:00" or "13:00 - open einde")
    /// </summary>
    public string TimeRange => IsOpenEnded
        ? $"{StartTime:hh\\:mm} - open einde"
        : $"{StartTime:hh\\:mm} - {EndTime:hh\\:mm}";

    /// <summary>
    /// Computed property to calculate shift duration in hours
    /// Returns null for open-ended shifts
    /// </summary>
    public double? DurationInHours
    {
        get
        {
            if (IsOpenEnded || EndTime == null)
                return null;

            var duration = EndTime.Value - StartTime;
            return duration.TotalHours;
        }
    }

    /// <summary>
    /// Validates that the shift times are logical
    /// </summary>
    public bool IsValidTimeRange()
    {
        if (IsOpenEnded)
            return true; // Open-ended shifts only need a start time

        if (EndTime == null)
            return false; // Non-open-ended shifts must have an end time

        return EndTime > StartTime;
    }
}