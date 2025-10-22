using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Models;
using backend.Services;
using backend.DTOs;
using System.Security.Claims;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeeController : ControllerBase
{
    private readonly IEmployeeService _employeeService;
    private readonly ILogger<EmployeeController> _logger;

    public EmployeeController(IEmployeeService employeeService, ILogger<EmployeeController> logger)
    {
        _employeeService = employeeService;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<ActionResult<IEnumerable<EmployeeResponseDto>>> GetAllEmployees()
    {
        try
        {
            var employees = await _employeeService.GetAllEmployeesAsync();

            var employeesResponse = employees.Select(e => new EmployeeResponseDto
            {
                Id = e.Id,
                FirstName = e.FirstName,
                LastName = e.LastName,
                Username = e.Username,
                FullName = e.FullName,
                Role = e.Role,
                HireDate = e.HireDate,
                BirthDate = e.BirthDate,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            });

            return Ok(employeesResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving all employees");
            return StatusCode(500, "An error occurred while retrieving employees");
        }
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<ActionResult<EmployeeResponseDto>> GetEmployee(int id)
    {
        try
        {
            var employee = await _employeeService.GetEmployeeByIdAsync(id);

            if (employee == null)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            var employeeResponse = new EmployeeResponseDto
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
            };

            return Ok(employeeResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving employee with ID {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the employee");
        }
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<ActionResult<EmployeeResponseDto>> CreateEmployee([FromBody] CreateEmployeeDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var employee = new Employee
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Username = request.Username,
                Role = request.Role,
                CompanyId = request.CompanyId,
                HireDate = request.HireDate,
                BirthDate = request.BirthDate
            };

            var createdEmployee = await _employeeService.CreateEmployeeAsync(employee, request.Password);

            var employeeResponse = new EmployeeResponseDto
            {
                Id = createdEmployee.Id,
                FirstName = createdEmployee.FirstName,
                LastName = createdEmployee.LastName,
                Username = createdEmployee.Username,
                FullName = createdEmployee.FullName,
                Role = createdEmployee.Role,
                HireDate = createdEmployee.HireDate,
                BirthDate = createdEmployee.BirthDate,
                CreatedAt = createdEmployee.CreatedAt,
                UpdatedAt = createdEmployee.UpdatedAt
            };

            return CreatedAtAction(nameof(GetEmployee), new { id = createdEmployee.Id }, employeeResponse);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while creating employee");
            return StatusCode(500, "An error occurred while creating the employee");
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> UpdateEmployee(int id, [FromBody] UpdateEmployeeDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var employee = new Employee
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Username = request.Username,
                Role = request.Role,
                HireDate = request.HireDate,
                BirthDate = request.BirthDate,
                PasswordHash = request.Password ?? string.Empty
            };

            var updatedEmployee = await _employeeService.UpdateEmployeeAsync(id, employee);

            if (updatedEmployee == null)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            var employeeResponse = new EmployeeResponseDto
            {
                Id = updatedEmployee.Id,
                FirstName = updatedEmployee.FirstName,
                LastName = updatedEmployee.LastName,
                Username = updatedEmployee.Username,
                FullName = updatedEmployee.FullName,
                Role = updatedEmployee.Role,
                HireDate = updatedEmployee.HireDate,
                BirthDate = updatedEmployee.BirthDate,
                CreatedAt = updatedEmployee.CreatedAt,
                UpdatedAt = updatedEmployee.UpdatedAt
            };

            return Ok(employeeResponse);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating employee with ID {Id}", id);
            return StatusCode(500, "An error occurred while updating the employee");
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        try
        {
            var result = await _employeeService.DeleteEmployeeAsync(id);

            if (!result)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting employee with ID {Id}", id);
            return StatusCode(500, "An error occurred while deleting the employee");
        }
    }

    /// <summary>
    /// Validates employee credentials without performing a full login.
    /// Useful for password verification scenarios.
    /// </summary>
    [HttpPost("validate")]
    [AllowAnonymous] // Allow anonymous access for login validation
    public async Task<ActionResult<bool>> ValidateEmployee([FromBody] LoginDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var isValid = await _employeeService.ValidatePasswordAsync(request.Username, request.Password);
            return Ok(new { IsValid = isValid });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while validating employee credentials");
            return StatusCode(500, "An error occurred while validating credentials");
        }
    }

    /// <summary>
    /// Gets the current user's profile data
    /// </summary>
    [HttpGet("profile")]
    [Authorize(Policy = "AllRoles")] // Any authenticated user can access their own profile
    public async Task<ActionResult<EmployeeResponseDto>> GetProfile()
    {
        try
        {
            // Get the current user's ID from the JWT token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int currentUserId))
            {
                return Unauthorized("Invalid user token");
            }

            var employee = await _employeeService.GetEmployeeByIdAsync(currentUserId);

            if (employee == null)
            {
                return NotFound("Employee not found");
            }

            var employeeResponse = new EmployeeResponseDto
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
            };

            return Ok(employeeResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving profile for user {UserId}", User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            return StatusCode(500, "An error occurred while retrieving the profile");
        }
    }

    /// <summary>
    /// Allows employees to update their own profile (username and password only)
    /// Managers can update everything about their own profile
    /// </summary>
    [HttpPut("profile")]
    [Authorize(Policy = "AllRoles")] // Any authenticated user can access this
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateEmployeeDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Get the current user's ID from the JWT token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int currentUserId))
            {
                return Unauthorized("Invalid user token");
            }

            // Get the current user's role
            var userRoleClaim = User.FindFirst("Role");
            if (userRoleClaim == null || !Enum.TryParse<Role>(userRoleClaim.Value, out Role currentUserRole))
            {
                return Unauthorized("Invalid user role");
            }

            // Get the current employee data
            var currentEmployee = await _employeeService.GetEmployeeByIdAsync(currentUserId);
            if (currentEmployee == null)
            {
                return NotFound("Employee not found");
            }

            Employee employeeToUpdate;

            if (currentUserRole == Role.Manager)
            {
                // Managers can update everything about their own profile
                employeeToUpdate = new Employee
                {
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Username = request.Username,
                    Role = request.Role,
                    HireDate = request.HireDate,
                    BirthDate = request.BirthDate,
                    PasswordHash = request.Password ?? string.Empty
                };
            }
            else
            {
                // Non-managers can only update username and password
                employeeToUpdate = new Employee
                {
                    FirstName = currentEmployee.FirstName, // Keep existing
                    LastName = currentEmployee.LastName,   // Keep existing
                    Username = request.Username,           // Allow update
                    Role = currentEmployee.Role,           // Keep existing
                    HireDate = currentEmployee.HireDate,   // Keep existing
                    BirthDate = currentEmployee.BirthDate, // Keep existing
                    PasswordHash = request.Password ?? string.Empty // Allow update
                };
            }

            var updatedEmployee = await _employeeService.UpdateEmployeeAsync(currentUserId, employeeToUpdate);

            if (updatedEmployee == null)
            {
                return NotFound("Employee not found");
            }

            var employeeResponse = new EmployeeResponseDto
            {
                Id = updatedEmployee.Id,
                FirstName = updatedEmployee.FirstName,
                LastName = updatedEmployee.LastName,
                Username = updatedEmployee.Username,
                FullName = updatedEmployee.FullName,
                Role = updatedEmployee.Role,
                HireDate = updatedEmployee.HireDate,
                BirthDate = updatedEmployee.BirthDate,
                CreatedAt = updatedEmployee.CreatedAt,
                UpdatedAt = updatedEmployee.UpdatedAt
            };

            return Ok(employeeResponse);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating profile for user {UserId}", User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            return StatusCode(500, "An error occurred while updating the profile");
        }
    }
}