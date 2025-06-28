using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.DTOs;
using backend.Services;
using System.Security.Claims;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AllRoles")] // All authenticated users can access availability
public class AvailabilityController : ControllerBase
{
    private readonly IAvailabilityService _availabilityService;
    private readonly ILogger<AvailabilityController> _logger;

    public AvailabilityController(IAvailabilityService availabilityService, ILogger<AvailabilityController> logger)
    {
        _availabilityService = availabilityService;
        _logger = logger;
    }

    /// <summary>
    /// Get current user's availability for a specific week
    /// </summary>
    [HttpGet("my-availability/week/{weekStart}")]
    public async Task<ActionResult<WeekAvailabilityDto>> GetMyWeekAvailability(string weekStart)
    {
        try
        {
            // Get current user's ID from JWT token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int currentUserId))
            {
                return Unauthorized("Ongeldige gebruikerstoken");
            }

            var weekAvailability = await _availabilityService.GetWeekAvailabilityAsync(currentUserId, weekStart);
            return Ok(weekAvailability);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving week availability for user {UserId}", User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de beschikbaarheid");
        }
    }

    /// <summary>
    /// Get current user's availability for multiple weeks
    /// </summary>
    [HttpGet("my-availability")]
    public async Task<ActionResult<List<WeekAvailabilityDto>>> GetMyAvailability(
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        try
        {
            // Get current user's ID from JWT token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int currentUserId))
            {
                return Unauthorized("Ongeldige gebruikerstoken");
            }

            // Default to current week if no dates provided
            var today = DateTime.Today;
            var defaultStart = _availabilityService.GetMondayOfWeek(today);
            var defaultEnd = defaultStart.AddDays(27); // 4 weeks

            var start = string.IsNullOrEmpty(startDate) ? _availabilityService.FormatDateString(defaultStart) : startDate;
            var end = string.IsNullOrEmpty(endDate) ? _availabilityService.FormatDateString(defaultEnd) : endDate;

            var availability = await _availabilityService.GetEmployeeAvailabilityAsync(currentUserId, start, end);
            return Ok(availability);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving availability for user {UserId}", User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de beschikbaarheid");
        }
    }

    /// <summary>
    /// Update current user's availability for a specific week
    /// </summary>
    [HttpPut("my-availability/week")]
    public async Task<ActionResult<WeekAvailabilityDto>> UpdateMyWeekAvailability([FromBody] UpdateWeekAvailabilityDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Get current user's ID from JWT token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int currentUserId))
            {
                return Unauthorized("Ongeldige gebruikerstoken");
            }

            // Ensure user can only update their own availability
            request.EmployeeId = currentUserId;

            var updatedWeek = await _availabilityService.UpdateWeekAvailabilityAsync(request);
            return Ok(updatedWeek);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating week availability for user {UserId}", User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            return StatusCode(500, "Er is een fout opgetreden bij het bijwerken van de beschikbaarheid");
        }
    }

    /// <summary>
    /// Get specific employee's availability for a week (managers only)
    /// </summary>
    [HttpGet("employee/{employeeId}/week/{weekStart}")]
    [Authorize(Policy = "ManagerOrShiftLeider")] // Only managers and shift leaders can view other employees
    public async Task<ActionResult<WeekAvailabilityDto>> GetEmployeeWeekAvailability(int employeeId, string weekStart)
    {
        try
        {
            var weekAvailability = await _availabilityService.GetWeekAvailabilityAsync(employeeId, weekStart);
            return Ok(weekAvailability);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving week availability for employee {EmployeeId}", employeeId);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de beschikbaarheid");
        }
    }

    /// <summary>
    /// Get specific employee's availability for multiple weeks (managers only)
    /// </summary>
    [HttpGet("employee/{employeeId}")]
    [Authorize(Policy = "ManagerOrShiftLeider")] // Only managers and shift leaders can view other employees
    public async Task<ActionResult<List<WeekAvailabilityDto>>> GetEmployeeAvailability(
        int employeeId,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        try
        {
            // Default to current week if no dates provided
            var today = DateTime.Today;
            var defaultStart = _availabilityService.GetMondayOfWeek(today);
            var defaultEnd = defaultStart.AddDays(27); // 4 weeks

            var start = string.IsNullOrEmpty(startDate) ? _availabilityService.FormatDateString(defaultStart) : startDate;
            var end = string.IsNullOrEmpty(endDate) ? _availabilityService.FormatDateString(defaultEnd) : endDate;

            var availability = await _availabilityService.GetEmployeeAvailabilityAsync(employeeId, start, end);
            return Ok(availability);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving availability for employee {EmployeeId}", employeeId);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de beschikbaarheid");
        }
    }

    /// <summary>
    /// Update specific employee's availability for a week (managers only)
    /// </summary>
    [HttpPut("employee/{employeeId}/week")]
    [Authorize(Policy = "ManagerOnly")] // Only managers can update other employees' availability
    public async Task<ActionResult<WeekAvailabilityDto>> UpdateEmployeeWeekAvailability(
        int employeeId,
        [FromBody] UpdateWeekAvailabilityDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Ensure the employee ID in the URL matches the request
            request.EmployeeId = employeeId;

            var updatedWeek = await _availabilityService.UpdateWeekAvailabilityAsync(request);
            return Ok(updatedWeek);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating week availability for employee {EmployeeId}", employeeId);
            return StatusCode(500, "Er is een fout opgetreden bij het bijwerken van de beschikbaarheid");
        }
    }

    /// <summary>
    /// Get all employees' availability for a specific week (managers only)
    /// </summary>
    [HttpGet("all-employees/week/{weekStart}")]
    [Authorize(Policy = "ManagerOrShiftLeider")] // Only managers and shift leaders can view all employees
    public async Task<ActionResult<List<WeekAvailabilityDto>>> GetAllEmployeesWeekAvailability(string weekStart)
    {
        try
        {
            var allAvailabilities = await _availabilityService.GetAllEmployeesWeekAvailabilityAsync(weekStart);
            return Ok(allAvailabilities);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving all employees week availability");
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de beschikbaarheid");
        }
    }

    /// <summary>
    /// Get date range validation info
    /// </summary>
    [HttpGet("date-range")]
    public ActionResult GetAllowedDateRange()
    {
        try
        {
            var today = DateTime.Today;
            var maxDate = today.AddDays(4 * 7 - 1);

            return Ok(new
            {
                MinDate = _availabilityService.FormatDateString(today),
                MaxDate = _availabilityService.FormatDateString(maxDate),
                CurrentWeekStart = _availabilityService.FormatDateString(_availabilityService.GetMondayOfWeek(today))
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while getting date range info");
            return StatusCode(500, "Er is een fout opgetreden");
        }
    }
}