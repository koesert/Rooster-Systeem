namespace backend.Models;

/// <summary>
/// Represents the availability status of an employee for a specific day
/// </summary>
public enum AvailabilityStatus
{
    /// <summary>
    /// Employee is available for work
    /// </summary>
    Available = 0,

    /// <summary>
    /// Employee is not available for work
    /// </summary>
    NotAvailable = 1,

    /// <summary>
    /// Employee has approved time off
    /// </summary>
    TimeOff = 2
}