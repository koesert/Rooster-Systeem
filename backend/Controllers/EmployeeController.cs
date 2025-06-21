using Microsoft.AspNetCore.Mvc;
using backend.Models;
using backend.Services;

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
    public async Task<ActionResult<IEnumerable<Employee>>> GetAllEmployees()
    {
        try
        {
            var employees = await _employeeService.GetAllEmployeesAsync();

            // Remove password hashes from response for security
            var employeesResponse = employees.Select(e => new
            {
                e.Id,
                e.FirstName,
                e.LastName,
                e.Username,
                e.FullName,
                e.CreatedAt,
                e.UpdatedAt
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
    public async Task<ActionResult<Employee>> GetEmployee(int id)
    {
        try
        {
            var employee = await _employeeService.GetEmployeeByIdAsync(id);

            if (employee == null)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            // Remove password hash from response for security
            var employeeResponse = new
            {
                employee.Id,
                employee.FirstName,
                employee.LastName,
                employee.Username,
                employee.FullName,
                employee.CreatedAt,
                employee.UpdatedAt
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
    public async Task<ActionResult<Employee>> CreateEmployee([FromBody] CreateEmployeeRequest request)
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
                Username = request.Username
            };

            var createdEmployee = await _employeeService.CreateEmployeeAsync(employee, request.Password);

            // Remove password hash from response
            var employeeResponse = new
            {
                createdEmployee.Id,
                createdEmployee.FirstName,
                createdEmployee.LastName,
                createdEmployee.Username,
                createdEmployee.FullName,
                createdEmployee.CreatedAt,
                createdEmployee.UpdatedAt
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
    public async Task<IActionResult> UpdateEmployee(int id, [FromBody] UpdateEmployeeRequest request)
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
                PasswordHash = request.Password // Will be hashed in service if provided
            };

            var updatedEmployee = await _employeeService.UpdateEmployeeAsync(id, employee);

            if (updatedEmployee == null)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            // Remove password hash from response
            var employeeResponse = new
            {
                updatedEmployee.Id,
                updatedEmployee.FirstName,
                updatedEmployee.LastName,
                updatedEmployee.Username,
                updatedEmployee.FullName,
                updatedEmployee.CreatedAt,
                updatedEmployee.UpdatedAt
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

    [HttpPost("validate")]
    public async Task<ActionResult<bool>> ValidateEmployee([FromBody] LoginRequest request)
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
}

public class CreateEmployeeRequest
{
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Username { get; set; }
    public required string Password { get; set; }
}

public class UpdateEmployeeRequest
{
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Username { get; set; }
    public string? Password { get; set; } // Optional for updates
}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}