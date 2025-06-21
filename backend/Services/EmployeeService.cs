using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Services;

public class EmployeeService : IEmployeeService
{
    private readonly ApplicationDbContext _context;

    public EmployeeService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Employee>> GetAllEmployeesAsync()
    {
        return await _context.Employees
            .OrderBy(e => e.FirstName)
            .ThenBy(e => e.LastName)
            .ToListAsync();
    }

    public async Task<Employee?> GetEmployeeByIdAsync(int id)
    {
        return await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id);
    }

    public async Task<Employee?> GetEmployeeByUsernameAsync(string username)
    {
        return await _context.Employees
            .FirstOrDefaultAsync(e => e.Username == username);
    }

    public async Task<Employee> CreateEmployeeAsync(Employee employee, string password)
    {
        // Check if username already exists
        if (await UsernameExistsAsync(employee.Username))
        {
            throw new InvalidOperationException($"Username '{employee.Username}' already exists");
        }

        // Hash the password
        employee.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        employee.CreatedAt = DateTime.UtcNow;
        employee.UpdatedAt = DateTime.UtcNow;

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return employee;
    }

    public async Task<Employee?> UpdateEmployeeAsync(int id, Employee employee)
    {
        var existingEmployee = await GetEmployeeByIdAsync(id);
        if (existingEmployee == null)
        {
            return null;
        }

        // Check if username is being changed and if new username already exists
        if (existingEmployee.Username != employee.Username &&
            await UsernameExistsAsync(employee.Username))
        {
            throw new InvalidOperationException($"Username '{employee.Username}' already exists");
        }

        // Update properties
        existingEmployee.FirstName = employee.FirstName;
        existingEmployee.LastName = employee.LastName;
        existingEmployee.Username = employee.Username;
        existingEmployee.UpdatedAt = DateTime.UtcNow;

        // Only update password if it's provided (not empty)
        if (!string.IsNullOrEmpty(employee.PasswordHash))
        {
            existingEmployee.PasswordHash = BCrypt.Net.BCrypt.HashPassword(employee.PasswordHash);
        }

        await _context.SaveChangesAsync();
        return existingEmployee;
    }

    public async Task<bool> DeleteEmployeeAsync(int id)
    {
        var employee = await GetEmployeeByIdAsync(id);
        if (employee == null)
        {
            return false;
        }

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UsernameExistsAsync(string username)
    {
        return await _context.Employees
            .AnyAsync(e => e.Username == username);
    }

    public async Task<bool> ValidatePasswordAsync(string username, string password)
    {
        var employee = await GetEmployeeByUsernameAsync(username);
        if (employee == null)
        {
            return false;
        }

        return BCrypt.Net.BCrypt.Verify(password, employee.PasswordHash);
    }
}