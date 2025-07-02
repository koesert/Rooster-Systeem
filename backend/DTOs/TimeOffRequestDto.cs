using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class CreateTimeOffRequestDto
{
    [Required(ErrorMessage = "Reden is verplicht")]
    [MaxLength(500, ErrorMessage = "Reden mag maximaal 500 karakters zijn")]
    public string Reason { get; set; } = string.Empty;

    [Required(ErrorMessage = "Startdatum is verplicht")]
    public string StartDate { get; set; } = string.Empty; // DD-MM-YYYY format

    [Required(ErrorMessage = "Einddatum is verplicht")]
    public string EndDate { get; set; } = string.Empty; // DD-MM-YYYY format
}

public class UpdateTimeOffRequestStatusDto
{
    [Required(ErrorMessage = "Status is verplicht")]
    [RegularExpression("^(Approved|Rejected)$", ErrorMessage = "Status moet 'Approved' of 'Rejected' zijn")]
    public string Status { get; set; } = string.Empty;
}

public class TimeOffRequestResponseDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty; // DD-MM-YYYY format
    public string EndDate { get; set; } = string.Empty; // DD-MM-YYYY format
    public int? ApprovedBy { get; set; }
    public string? ApproverName { get; set; }
    public string CreatedAt { get; set; } = string.Empty; // DD-MM-YYYY format
    public string UpdatedAt { get; set; } = string.Empty; // DD-MM-YYYY format
}

public class TimeOffRequestFilterDto
{
    public int? EmployeeId { get; set; }
    public string? Status { get; set; }
    public string? FromDate { get; set; } // DD-MM-YYYY format
    public string? ToDate { get; set; } // DD-MM-YYYY format
}