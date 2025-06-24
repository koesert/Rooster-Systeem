using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Employee
{
    public int Id { get; set; }

    [Required(ErrorMessage = "First name is required")]
    [MaxLength(50, ErrorMessage = "First name cannot exceed 50 characters")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Last name is required")]
    [MaxLength(50, ErrorMessage = "Last name cannot exceed 50 characters")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Username is required")]
    [MaxLength(30, ErrorMessage = "Username cannot exceed 30 characters")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required")]
    [MaxLength(100, ErrorMessage = "Password hash cannot exceed 100 characters")]
    public string PasswordHash { get; set; } = string.Empty;

    [Required(ErrorMessage = "Role is required")]
    public Role Role { get; set; } = Role.Werknemer;

    [Required(ErrorMessage = "Hire date is required")]
    public DateTime HireDate { get; set; } = DateTime.UtcNow;

    [Required(ErrorMessage = "Birth date is required")]
    public DateTime BirthDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Computed property that combines first and last name for display purposes
    /// </summary>
    public string FullName => $"{FirstName} {LastName}";
}