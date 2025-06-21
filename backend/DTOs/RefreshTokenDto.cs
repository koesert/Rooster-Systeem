using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class RefreshTokenDto
{
    [Required(ErrorMessage = "Refresh token is required")]
    public required string RefreshToken { get; set; }
}