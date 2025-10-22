using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs;

public class CreateEmployeeDto
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

    [Required(ErrorMessage = "Password is required")]
    [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*\d).+$", ErrorMessage = "Password must contain at least 1 uppercase letter and 1 number")]
    public required string Password { get; set; }

    [Required(ErrorMessage = "Role is required")]
    public Role Role { get; set; } = Role.Werknemer;

    // CompanyId is required for non-SuperAdmin employees
    public int? CompanyId { get; set; }

    [Required(ErrorMessage = "Hire date is required")]
    public DateTime HireDate { get; set; } = DateTime.UtcNow;

    [Required(ErrorMessage = "Birth date is required")]
    public DateTime BirthDate { get; set; }
}