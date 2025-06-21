using Microsoft.AspNetCore.Mvc;
using backend.Models;
using backend.Services;
using backend.DTOs;

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
                Username = request.Username
            };

            var createdEmployee = await _employeeService.CreateEmployeeAsync(employee, request.Password);

            var employeeResponse = new EmployeeResponseDto
            {
                Id = createdEmployee.Id,
                FirstName = createdEmployee.FirstName,
                LastName = createdEmployee.LastName,
                Username = createdEmployee.Username,
                FullName = createdEmployee.FullName,
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
}