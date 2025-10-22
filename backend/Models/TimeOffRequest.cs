using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class TimeOffRequest
{
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public int CompanyId { get; set; }

    [Required]
    public TimeOffStatus Status { get; set; } = TimeOffStatus.Pending;

    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public int? ApprovedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public Employee Employee { get; set; } = null!;
    public Employee? Approver { get; set; }
    public Company Company { get; set; } = null!;
}

public enum TimeOffStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3
}