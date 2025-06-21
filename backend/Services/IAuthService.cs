using backend.DTOs;
using backend.Models;

namespace backend.Services;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(string username, string password);
    Task<bool> LogoutAsync(string refreshToken);
    Task<LoginResponseDto?> RefreshTokenAsync(string refreshToken);
    string GenerateAccessToken(Employee employee);
    Task<string> GenerateRefreshTokenAsync(int employeeId);
    Task<bool> ValidateRefreshTokenAsync(string token);
    Task RevokeAllUserTokensAsync(int employeeId);
}