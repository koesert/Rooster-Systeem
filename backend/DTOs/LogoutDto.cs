using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class LogoutDto
{
    [Required(ErrorMessage = "Refresh token is required")]
    public required string RefreshToken { get; set; }
}