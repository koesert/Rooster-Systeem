using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Availability
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Employee ID is required")]
    public int EmployeeId { get; set; }

    [Required(ErrorMessage = "Date is required")]
    public DateTime Date { get; set; }

    [Required(ErrorMessage = "Availability status is required")]
    public AvailabilityStatus Status { get; set; } = AvailabilityStatus.Available;

    /// <summary>
    /// Optional notes for availability (max 500 characters)
    /// </summary>
    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Employee Employee { get; set; } = null!;
}