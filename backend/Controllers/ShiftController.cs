using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.DTOs;
using backend.Models;
using backend.Services;
using System.Security.Claims;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AllRoles")] // All authenticated users can access shifts
public class ShiftController : ControllerBase
{
    private readonly IShiftService _shiftService;
    private readonly ILogger<ShiftController> _logger;

    public ShiftController(IShiftService shiftService, ILogger<ShiftController> logger)
    {
        _shiftService = shiftService;
        _logger = logger;
    }

    /// <summary>
    /// Get all shifts with optional filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShiftResponseDto>>> GetAllShifts(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? employeeId = null,
        [FromQuery] ShiftType? shiftType = null,
        [FromQuery] bool? isOpenEnded = null,
        [FromQuery] bool? isStandby = null)
    {
        try
        {
            var filter = new ShiftFilterDto
            {
                StartDate = startDate,
                EndDate = endDate,
                EmployeeId = employeeId,
                ShiftType = shiftType,
                IsOpenEnded = isOpenEnded,
                IsStandby = isStandby
            };

            var shifts = await _shiftService.GetAllShiftsAsync(filter);
            return Ok(shifts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving shifts");
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de shifts");
        }
    }

    /// <summary>
    /// Get a specific shift by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ShiftResponseDto>> GetShift(int id)
    {
        try
        {
            var shift = await _shiftService.GetShiftByIdAsync(id);

            if (shift == null)
            {
                return NotFound($"Shift met ID {id} niet gevonden");
            }

            return Ok(shift);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving shift with ID {Id}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de shift");
        }
    }

    /// <summary>
    /// Get shifts for a specific employee
    /// </summary>
    [HttpGet("employee/{employeeId}")]
    public async Task<ActionResult<IEnumerable<ShiftResponseDto>>> GetShiftsByEmployee(
        int employeeId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var shifts = await _shiftService.GetShiftsByEmployeeAsync(employeeId, startDate, endDate);
            return Ok(shifts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving shifts for employee {EmployeeId}", employeeId);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de shifts");
        }
    }

    /// <summary>
    /// Get shifts for the current authenticated user
    /// </summary>
    [HttpGet("my-shifts")]
    public async Task<ActionResult<IEnumerable<ShiftResponseDto>>> GetMyShifts(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized("Gebruiker niet gevonden");
            }

            var shifts = await _shiftService.GetShiftsByEmployeeAsync(userId, startDate, endDate);
            return Ok(shifts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving current user's shifts");
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van je shifts");
        }
    }

    /// <summary>
    /// Get shifts by date range
    /// </summary>
    [HttpGet("date-range")]
    public async Task<ActionResult<IEnumerable<ShiftResponseDto>>> GetShiftsByDateRange(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            if (startDate > endDate)
            {
                return BadRequest("Startdatum mag niet na einddatum liggen");
            }

            var shifts = await _shiftService.GetShiftsByDateRangeAsync(startDate, endDate);
            return Ok(shifts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving shifts by date range");
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de shifts");
        }
    }

    /// <summary>
    /// Get week schedule
    /// </summary>
    [HttpGet("week/{weekNumber}")]
    public async Task<ActionResult<WeekScheduleDto>> GetWeekSchedule(string weekNumber)
    {
        try
        {
            var weekSchedule = await _shiftService.GetWeekScheduleAsync(weekNumber);
            return Ok(weekSchedule);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving week schedule for {WeekNumber}", weekNumber);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van het weekrooster");
        }
    }

    /// <summary>
    /// Get month schedule
    /// </summary>
    [HttpGet("month/{monthYear}")]
    public async Task<ActionResult<MonthScheduleDto>> GetMonthSchedule(string monthYear)
    {
        try
        {
            var monthSchedule = await _shiftService.GetMonthScheduleAsync(monthYear);
            return Ok(monthSchedule);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving month schedule for {MonthYear}", monthYear);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van het maandrooster");
        }
    }

    /// <summary>
    /// Get available employees for a specific date and time
    /// </summary>
    [HttpGet("available-employees")]
    [Authorize(Policy = "ManagerOnly")] // Only managers can see available employees
    public async Task<ActionResult<IEnumerable<EmployeeResponseDto>>> GetAvailableEmployees(
        [FromQuery] DateTime date,
        [FromQuery] TimeSpan startTime,
        [FromQuery] TimeSpan? endTime = null)
    {
        try
        {
            var availableEmployees = await _shiftService.GetAvailableEmployeesAsync(date, startTime, endTime);
            return Ok(availableEmployees);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving available employees");
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van beschikbare medewerkers");
        }
    }

    /// <summary>
    /// Create a new shift
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "ManagerOnly")] // Only managers can create shifts
    public async Task<ActionResult<ShiftResponseDto>> CreateShift([FromBody] CreateShiftDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var shift = await _shiftService.CreateShiftAsync(request);
            return CreatedAtAction(nameof(GetShift), new { id = shift.Id }, shift);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while creating shift");
            return StatusCode(500, "Er is een fout opgetreden bij het aanmaken van de shift");
        }
    }

    /// <summary>
    /// Update an existing shift
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "ManagerOnly")] // Only managers can update shifts
    public async Task<ActionResult<ShiftResponseDto>> UpdateShift(int id, [FromBody] UpdateShiftDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var shift = await _shiftService.UpdateShiftAsync(id, request);

            if (shift == null)
            {
                return NotFound($"Shift met ID {id} niet gevonden");
            }

            return Ok(shift);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating shift with ID {Id}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het bijwerken van de shift");
        }
    }

    /// <summary>
    /// Delete a shift
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "ManagerOnly")] // Only managers can delete shifts
    public async Task<IActionResult> DeleteShift(int id)
    {
        try
        {
            var result = await _shiftService.DeleteShiftAsync(id);

            if (!result)
            {
                return NotFound($"Shift met ID {id} niet gevonden");
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting shift with ID {Id}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het verwijderen van de shift");
        }
    }
}