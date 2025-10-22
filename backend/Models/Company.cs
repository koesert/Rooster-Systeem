using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Company
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Company name is required")]
    [MaxLength(100, ErrorMessage = "Company name cannot exceed 100 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Short name is required")]
    [MaxLength(20, ErrorMessage = "Short name cannot exceed 20 characters")]
    public string ShortName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Primary color is required")]
    [MaxLength(7, ErrorMessage = "Color must be a valid hex code (e.g., #FF5733)")]
    public string PrimaryColor { get; set; } = string.Empty;

    [Required(ErrorMessage = "Secondary color is required")]
    [MaxLength(7, ErrorMessage = "Color must be a valid hex code (e.g., #FF5733)")]
    public string SecondaryColor { get; set; } = string.Empty;

    [Required(ErrorMessage = "Accent color is required")]
    [MaxLength(7, ErrorMessage = "Color must be a valid hex code (e.g., #FF5733)")]
    public string AccentColor { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
