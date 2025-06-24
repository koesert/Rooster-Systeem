using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IEmployeeService _employeeService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext context,
        IEmployeeService employeeService,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _context = context;
        _employeeService = employeeService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LoginResponseDto?> LoginAsync(string username, string password)
    {
        try
        {
            var isValid = await _employeeService.ValidatePasswordAsync(username, password);
            if (!isValid)
            {
                return null;
            }

            var employee = await _employeeService.GetEmployeeByUsernameAsync(username);
            if (employee == null)
            {
                return null;
            }

            // Security measure: invalidate all existing tokens for this user
            // Prevents token accumulation and ensures single-session behavior
            await RevokeAllUserTokensAsync(employee.Id);

            var accessToken = GenerateAccessToken(employee);
            var refreshToken = await GenerateRefreshTokenAsync(employee.Id);

            var response = new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = new EmployeeResponseDto
                {
                    Id = employee.Id,
                    FirstName = employee.FirstName,
                    LastName = employee.LastName,
                    Username = employee.Username,
                    FullName = employee.FullName,
                    Role = employee.Role,
                    HireDate = employee.HireDate,
                    BirthDate = employee.BirthDate,
                    CreatedAt = employee.CreatedAt,
                    UpdatedAt = employee.UpdatedAt
                },
                ExpiresAt = DateTime.UtcNow.AddMinutes(30)
            };

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during login for username: {Username}", username);
            return null;
        }
    }

    public async Task<bool> LogoutAsync(string refreshToken)
    {
        try
        {
            var token = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked);

            if (token == null)
            {
                return false;
            }

            // Mark token as revoked rather than deleting for audit trail
            token.IsRevoked = true;
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during logout");
            return false;
        }
    }

    public async Task<LoginResponseDto?> RefreshTokenAsync(string refreshToken)
    {
        try
        {
            // Find valid, non-revoked, non-expired refresh token
            var token = await _context.RefreshTokens
                .Include(rt => rt.Employee)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow);

            if (token == null)
            {
                return null;
            }

            // Revoke the used refresh token (single-use tokens)
            token.IsRevoked = true;

            // Generate new token pair
            var accessToken = GenerateAccessToken(token.Employee);
            var newRefreshToken = await GenerateRefreshTokenAsync(token.Employee.Id);

            await _context.SaveChangesAsync();

            return new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken,
                User = new EmployeeResponseDto
                {
                    Id = token.Employee.Id,
                    FirstName = token.Employee.FirstName,
                    LastName = token.Employee.LastName,
                    Username = token.Employee.Username,
                    FullName = token.Employee.FullName,
                    Role = token.Employee.Role,
                    HireDate = token.Employee.HireDate,
                    BirthDate = token.Employee.BirthDate,
                    CreatedAt = token.Employee.CreatedAt,
                    UpdatedAt = token.Employee.UpdatedAt
                },
                ExpiresAt = DateTime.UtcNow.AddMinutes(30)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during token refresh");
            return null;
        }
    }

    /// <summary>
    /// Generates a short-lived JWT access token (30 minutes)
    /// Contains user identity claims for API authorization including role information
    /// </summary>
    public string GenerateAccessToken(Employee employee)
    {
        var jwtKey = _configuration["JwtSettings:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, employee.Id.ToString()),
            new Claim(ClaimTypes.Name, employee.Username),
            new Claim("FullName", employee.FullName),
            new Claim("Role", employee.Role.ToString()), // Add role claim for authorization
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Generates a cryptographically secure refresh token (30 days lifespan)
    /// Stored in database for validation during token refresh requests
    /// </summary>
    public async Task<string> GenerateRefreshTokenAsync(int employeeId)
    {
        var randomBytes = new byte[64];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }

        var refreshToken = Convert.ToBase64String(randomBytes);

        var tokenEntity = new RefreshToken
        {
            Token = refreshToken,
            EmployeeId = employeeId,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };

        _context.RefreshTokens.Add(tokenEntity);
        await _context.SaveChangesAsync();

        return refreshToken;
    }

    public async Task<bool> ValidateRefreshTokenAsync(string token)
    {
        var refreshToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == token && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow);

        return refreshToken != null;
    }

    /// <summary>
    /// Revokes all active refresh tokens for a user
    /// Used during login for security and during account management
    /// </summary>
    public async Task RevokeAllUserTokensAsync(int employeeId)
    {
        var tokens = await _context.RefreshTokens
            .Where(rt => rt.EmployeeId == employeeId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
        }

        await _context.SaveChangesAsync();
    }
}