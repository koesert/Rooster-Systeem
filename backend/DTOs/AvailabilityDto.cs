using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class AvailabilityDto
{
    public int? Id { get; set; }

    [Required(ErrorMessage = "Employee ID is required")]
    public int EmployeeId { get; set; }

    [Required(ErrorMessage = "Date is required")]
    public string Date { get; set; } = string.Empty; // DD-MM-YYYY format

    [Required(ErrorMessage = "Availability status is required")]
    public bool IsAvailable { get; set; }

    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
    public string? Notes { get; set; }

    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class WeekAvailabilityDto
{
    [Required(ErrorMessage = "Week start date is required")]
    public string WeekStart { get; set; } = string.Empty; // DD-MM-YYYY format (Monday)

    [Required(ErrorMessage = "Employee ID is required")]
    public int EmployeeId { get; set; }

    public string? EmployeeName { get; set; } // For manager views

    [Required(ErrorMessage = "Days data is required")]
    public List<DayAvailabilityDto> Days { get; set; } = new();
}

public class DayAvailabilityDto
{
    public int? Id { get; set; }

    [Required(ErrorMessage = "Date is required")]
    public string Date { get; set; } = string.Empty; // DD-MM-YYYY format

    [Required(ErrorMessage = "Day of week is required")]
    public string DayOfWeek { get; set; } = string.Empty; // maandag, dinsdag, etc.

    public bool? IsAvailable { get; set; } // null = not set yet

    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
    public string? Notes { get; set; }
}

public class UpdateWeekAvailabilityDto
{
    [Required(ErrorMessage = "Week start date is required")]
    public string WeekStart { get; set; } = string.Empty; // DD-MM-YYYY format

    [Required(ErrorMessage = "Employee ID is required")]
    public int EmployeeId { get; set; }

    [Required(ErrorMessage = "Days data is required")]
    public List<UpdateDayAvailabilityDto> Days { get; set; } = new();
}

public class UpdateDayAvailabilityDto
{
    [Required(ErrorMessage = "Date is required")]
    public string Date { get; set; } = string.Empty; // DD-MM-YYYY format

    public bool? IsAvailable { get; set; } // null = remove availability record

    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
    public string? Notes { get; set; }
}