using backend.Models;

namespace backend.Services;

public interface IEmployeeService
{
    Task<IEnumerable<Employee>> GetAllEmployeesAsync();
    Task<Employee?> GetEmployeeByIdAsync(int id);
    Task<Employee?> GetEmployeeByUsernameAsync(string username);
    Task<Employee> CreateEmployeeAsync(Employee employee, string password);
    Task<Employee?> UpdateEmployeeAsync(int id, Employee employee);
    Task<bool> DeleteEmployeeAsync(int id);
    Task<bool> UsernameExistsAsync(string username);
    Task<bool> ValidatePasswordAsync(string username, string password);
}