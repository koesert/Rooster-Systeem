namespace backend.DTOs;

public class LoginResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public EmployeeResponseDto User { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
}