using System;

namespace backend.Extensions;

/// <summary>
/// Extension methods for DateTime handling to ensure PostgreSQL compatibility
/// </summary>
public static class DateTimeExtensions
{
    /// <summary>
    /// Ensures DateTime has UTC kind for PostgreSQL compatibility
    /// This is especially important for Railway deployment
    /// </summary>
    /// <param name="dateTime">The DateTime to ensure UTC kind</param>
    /// <returns>DateTime with UTC kind</returns>
    public static DateTime EnsureUtc(this DateTime dateTime)
    {
        return dateTime.Kind switch
        {
            DateTimeKind.Utc => dateTime,
            DateTimeKind.Local => dateTime.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc),
            _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
        };
    }

    /// <summary>
    /// Safely parses a date string and ensures UTC kind
    /// </summary>
    /// <param name="dateString">The date string to parse</param>
    /// <param name="format">Optional format string</param>
    /// <returns>DateTime with UTC kind</returns>
    public static DateTime ParseAsUtc(string dateString, string? format = null)
    {
        DateTime result;

        if (!string.IsNullOrEmpty(format))
        {
            result = DateTime.ParseExact(dateString, format, System.Globalization.CultureInfo.InvariantCulture);
        }
        else
        {
            result = DateTime.Parse(dateString);
        }

        return result.EnsureUtc();
    }

    /// <summary>
    /// Current UTC time - use this instead of DateTime.UtcNow for consistency
    /// </summary>
    public static DateTime UtcNow => DateTime.UtcNow.EnsureUtc();
}
