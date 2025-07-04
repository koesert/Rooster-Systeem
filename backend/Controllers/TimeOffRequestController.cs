using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.DTOs;
using backend.Services;
using System.Security.Claims;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimeOffRequestController : ControllerBase
{
    private readonly ITimeOffRequestService _timeOffRequestService;
    private readonly ILogger<TimeOffRequestController> _logger;

    public TimeOffRequestController(ITimeOffRequestService timeOffRequestService, ILogger<TimeOffRequestController> logger)
    {
        _timeOffRequestService = timeOffRequestService;
        _logger = logger;
    }

    /// <summary>
    /// Maakt een nieuwe vrij aanvraag aan
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "AllRoles")]
    public async Task<ActionResult<TimeOffRequestResponseDto>> CreateRequest([FromBody] CreateTimeOffRequestDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var employeeId = GetCurrentEmployeeId();
            var request = await _timeOffRequestService.CreateRequestAsync(employeeId, dto);
            var response = await _timeOffRequestService.GetRequestByIdAsync(request.Id);

            return CreatedAtAction(nameof(GetRequestById), new { id = request.Id }, response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fout bij aanmaken vrij aanvraag");
            return StatusCode(500, new { message = "Er is een fout opgetreden bij het aanmaken van de aanvraag" });
        }
    }

    /// <summary>
    /// Haalt alle vrij aanvragen op (managers zien alles, werknemers alleen eigen aanvragen)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "AllRoles")]
    public async Task<ActionResult<IEnumerable<TimeOffRequestResponseDto>>> GetAllRequests([FromQuery] TimeOffRequestFilterDto filter)
    {
        try
        {
            var currentRole = GetCurrentUserRole();
            var currentEmployeeId = GetCurrentEmployeeId();

            // Werknemers en shiftleiders kunnen alleen hun eigen aanvragen zien
            if (currentRole != "Manager" && (filter?.EmployeeId == null || filter.EmployeeId != currentEmployeeId))
            {
                filter = filter ?? new TimeOffRequestFilterDto();
                filter.EmployeeId = currentEmployeeId;
            }

            var requests = await _timeOffRequestService.GetAllRequestsAsync(filter);
            return Ok(requests);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fout bij ophalen vrij aanvragen");
            return StatusCode(500, new { message = "Er is een fout opgetreden bij het ophalen van de aanvragen" });
        }
    }

    /// <summary>
    /// Haalt een specifieke vrij aanvraag op
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Policy = "AllRoles")]
    public async Task<ActionResult<TimeOffRequestResponseDto>> GetRequestById(int id)
    {
        try
        {
            var request = await _timeOffRequestService.GetRequestByIdAsync(id);

            if (request == null)
            {
                return NotFound(new { message = "Aanvraag niet gevonden" });
            }

            var currentRole = GetCurrentUserRole();
            var currentEmployeeId = GetCurrentEmployeeId();

            // Check toegang: managers kunnen alles zien, anderen alleen eigen aanvragen
            if (currentRole != "Manager" && request.EmployeeId != currentEmployeeId)
            {
                return Forbid();
            }

            return Ok(request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fout bij ophalen vrij aanvraag {Id}", id);
            return StatusCode(500, new { message = "Er is een fout opgetreden bij het ophalen van de aanvraag" });
        }
    }

    /// <summary>
    /// Update de status van een vrij aanvraag (alleen voor managers)
    /// </summary>
    [HttpPut("{id}/status")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<ActionResult> UpdateRequestStatus(int id, [FromBody] UpdateTimeOffRequestStatusDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var managerId = GetCurrentEmployeeId();
            await _timeOffRequestService.UpdateRequestStatusAsync(id, dto, managerId);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fout bij updaten status vrij aanvraag {Id}", id);
            return StatusCode(500, new { message = "Er is een fout opgetreden bij het updaten van de status" });
        }
    }

    /// <summary>
    /// Annuleert een vrij aanvraag (alleen eigen aanvragen met status pending)
    /// </summary>
    [HttpPost("{id}/cancel")]
    [Authorize(Policy = "AllRoles")]
    public async Task<ActionResult> CancelRequest(int id)
    {
        try
        {
            var employeeId = GetCurrentEmployeeId();
            await _timeOffRequestService.CancelRequestAsync(id, employeeId);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fout bij annuleren vrij aanvraag {Id}", id);
            return StatusCode(500, new { message = "Er is een fout opgetreden bij het annuleren van de aanvraag" });
        }
    }

    private int GetCurrentEmployeeId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(idClaim, out var id))
        {
            return id;
        }
        throw new InvalidOperationException("Kan huidige werknemer ID niet bepalen");
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirst("Role")?.Value ?? throw new InvalidOperationException("Kan huidige rol niet bepalen");
    }
}