using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class UpdateEmployeeDto
{
    [Required(ErrorMessage = "First name is required")]
    [MaxLength(50, ErrorMessage = "First name cannot exceed 50 characters")]
    public required string FirstName { get; set; }

    [Required(ErrorMessage = "Last name is required")]
    [MaxLength(50, ErrorMessage = "Last name cannot exceed 50 characters")]
    public required string LastName { get; set; }

    [Required(ErrorMessage = "Username is required")]
    [MaxLength(30, ErrorMessage = "Username cannot exceed 30 characters")]
    public required string Username { get; set; }

    [MinLength(4, ErrorMessage = "Password must be at least 4 characters")]
    public string? Password { get; set; } // Optional for updates
}