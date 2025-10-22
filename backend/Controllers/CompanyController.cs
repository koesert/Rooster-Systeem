using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Services;
using backend.DTOs;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CompanyController : ControllerBase
{
    private readonly ICompanyService _companyService;
    private readonly ILogger<CompanyController> _logger;

    public CompanyController(ICompanyService companyService, ILogger<CompanyController> logger)
    {
        _companyService = companyService;
        _logger = logger;
    }

    /// <summary>
    /// Get all companies (SuperAdmin only)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "SuperAdminOnly")]
    public async Task<ActionResult<IEnumerable<CompanyDto>>> GetAllCompanies()
    {
        try
        {
            var companies = await _companyService.GetAllCompaniesAsync();
            return Ok(companies);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving all companies");
            return StatusCode(500, "An error occurred while retrieving companies");
        }
    }

    /// <summary>
    /// Get a specific company by ID
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Policy = "AllRoles")]
    public async Task<ActionResult<CompanyDto>> GetCompany(int id)
    {
        try
        {
            var company = await _companyService.GetCompanyByIdAsync(id);

            if (company == null)
            {
                return NotFound($"Company with ID {id} not found");
            }

            return Ok(company);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving company with ID {CompanyId}", id);
            return StatusCode(500, "An error occurred while retrieving the company");
        }
    }

    /// <summary>
    /// Create a new company (SuperAdmin only)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "SuperAdminOnly")]
    public async Task<ActionResult<CompanyDto>> CreateCompany([FromBody] CreateCompanyDto createDto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var company = await _companyService.CreateCompanyAsync(createDto);
            return CreatedAtAction(nameof(GetCompany), new { id = company.Id }, company);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while creating company");
            return StatusCode(500, "An error occurred while creating the company");
        }
    }

    /// <summary>
    /// Update an existing company (SuperAdmin only)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "SuperAdminOnly")]
    public async Task<ActionResult<CompanyDto>> UpdateCompany(int id, [FromBody] UpdateCompanyDto updateDto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var company = await _companyService.UpdateCompanyAsync(id, updateDto);

            if (company == null)
            {
                return NotFound($"Company with ID {id} not found");
            }

            return Ok(company);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating company with ID {CompanyId}", id);
            return StatusCode(500, "An error occurred while updating the company");
        }
    }

    /// <summary>
    /// Delete a company (SuperAdmin only)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "SuperAdminOnly")]
    public async Task<ActionResult> DeleteCompany(int id)
    {
        try
        {
            var result = await _companyService.DeleteCompanyAsync(id);

            if (!result)
            {
                return NotFound($"Company with ID {id} not found");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting company with ID {CompanyId}", id);
            return StatusCode(500, "An error occurred while deleting the company");
        }
    }
}
