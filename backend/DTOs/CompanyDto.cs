using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class CompanyDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string PrimaryColor { get; set; } = string.Empty;
    public string SecondaryColor { get; set; } = string.Empty;
    public string AccentColor { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class CreateCompanyDto
{
    [Required(ErrorMessage = "Company name is required")]
    [MaxLength(100, ErrorMessage = "Company name cannot exceed 100 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Short name is required")]
    [MaxLength(20, ErrorMessage = "Short name cannot exceed 20 characters")]
    public string ShortName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Primary color is required")]
    [RegularExpression("^#([A-Fa-f0-9]{6})$", ErrorMessage = "Primary color must be a valid hex code (e.g., #FF5733)")]
    public string PrimaryColor { get; set; } = string.Empty;

    [Required(ErrorMessage = "Secondary color is required")]
    [RegularExpression("^#([A-Fa-f0-9]{6})$", ErrorMessage = "Secondary color must be a valid hex code (e.g., #FF5733)")]
    public string SecondaryColor { get; set; } = string.Empty;

    [Required(ErrorMessage = "Accent color is required")]
    [RegularExpression("^#([A-Fa-f0-9]{6})$", ErrorMessage = "Accent color must be a valid hex code (e.g., #FF5733)")]
    public string AccentColor { get; set; } = string.Empty;
}

public class UpdateCompanyDto
{
    [Required(ErrorMessage = "Company name is required")]
    [MaxLength(100, ErrorMessage = "Company name cannot exceed 100 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Short name is required")]
    [MaxLength(20, ErrorMessage = "Short name cannot exceed 20 characters")]
    public string ShortName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Primary color is required")]
    [RegularExpression("^#([A-Fa-f0-9]{6})$", ErrorMessage = "Primary color must be a valid hex code (e.g., #FF5733)")]
    public string PrimaryColor { get; set; } = string.Empty;

    [Required(ErrorMessage = "Secondary color is required")]
    [RegularExpression("^#([A-Fa-f0-9]{6})$", ErrorMessage = "Secondary color must be a valid hex code (e.g., #FF5733)")]
    public string SecondaryColor { get; set; } = string.Empty;

    [Required(ErrorMessage = "Accent color is required")]
    [RegularExpression("^#([A-Fa-f0-9]{6})$", ErrorMessage = "Accent color must be a valid hex code (e.g., #FF5733)")]
    public string AccentColor { get; set; } = string.Empty;
}

public class CompanyColorsDto
{
    public string Primary { get; set; } = string.Empty;
    public string Secondary { get; set; } = string.Empty;
    public string Accent { get; set; } = string.Empty;
}

public class CompanyInfoDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public CompanyColorsDto Colors { get; set; } = new();
}
