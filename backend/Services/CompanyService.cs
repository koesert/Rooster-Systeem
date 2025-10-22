using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Extensions;

namespace backend.Services;

// Interface definition
public interface ICompanyService
{
    Task<IEnumerable<CompanyDto>> GetAllCompaniesAsync();
    Task<CompanyDto?> GetCompanyByIdAsync(int id);
    Task<CompanyDto> CreateCompanyAsync(CreateCompanyDto createDto);
    Task<CompanyDto?> UpdateCompanyAsync(int id, UpdateCompanyDto updateDto);
    Task<bool> DeleteCompanyAsync(int id);
    Task<bool> CompanyExistsAsync(int id);
    Task<bool> CompanyNameExistsAsync(string name, int? excludeId = null);
    Task<bool> CompanyShortNameExistsAsync(string shortName, int? excludeId = null);
}

// Implementation
public class CompanyService : ICompanyService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CompanyService> _logger;

    public CompanyService(ApplicationDbContext context, ILogger<CompanyService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<CompanyDto>> GetAllCompaniesAsync()
    {
        try
        {
            var companies = await _context.Companies
                .OrderBy(c => c.Name)
                .ToListAsync();

            return companies.Select(c => MapToDto(c));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all companies");
            throw;
        }
    }

    public async Task<CompanyDto?> GetCompanyByIdAsync(int id)
    {
        try
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == id);

            return company == null ? null : MapToDto(company);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving company with ID {CompanyId}", id);
            throw;
        }
    }

    public async Task<CompanyDto> CreateCompanyAsync(CreateCompanyDto createDto)
    {
        try
        {
            // Check for duplicate name
            if (await CompanyNameExistsAsync(createDto.Name))
            {
                throw new InvalidOperationException($"A company with the name '{createDto.Name}' already exists.");
            }

            // Check for duplicate short name
            if (await CompanyShortNameExistsAsync(createDto.ShortName))
            {
                throw new InvalidOperationException($"A company with the short name '{createDto.ShortName}' already exists.");
            }

            var company = new Company
            {
                Name = createDto.Name,
                ShortName = createDto.ShortName,
                PrimaryColor = createDto.PrimaryColor,
                SecondaryColor = createDto.SecondaryColor,
                AccentColor = createDto.AccentColor,
                CreatedAt = DateTimeExtensions.UtcNow,
                UpdatedAt = DateTimeExtensions.UtcNow
            };

            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created company {CompanyName} (ID: {CompanyId})", company.Name, company.Id);

            return MapToDto(company);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating company");
            throw new InvalidOperationException("An error occurred while creating the company.");
        }
    }

    public async Task<CompanyDto?> UpdateCompanyAsync(int id, UpdateCompanyDto updateDto)
    {
        try
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null)
            {
                return null;
            }

            // Check for duplicate name (excluding current company)
            if (await CompanyNameExistsAsync(updateDto.Name, id))
            {
                throw new InvalidOperationException($"A company with the name '{updateDto.Name}' already exists.");
            }

            // Check for duplicate short name (excluding current company)
            if (await CompanyShortNameExistsAsync(updateDto.ShortName, id))
            {
                throw new InvalidOperationException($"A company with the short name '{updateDto.ShortName}' already exists.");
            }

            company.Name = updateDto.Name;
            company.ShortName = updateDto.ShortName;
            company.PrimaryColor = updateDto.PrimaryColor;
            company.SecondaryColor = updateDto.SecondaryColor;
            company.AccentColor = updateDto.AccentColor;
            company.UpdatedAt = DateTimeExtensions.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated company {CompanyName} (ID: {CompanyId})", company.Name, company.Id);

            return MapToDto(company);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating company with ID {CompanyId}", id);
            throw new InvalidOperationException("An error occurred while updating the company.");
        }
    }

    public async Task<bool> DeleteCompanyAsync(int id)
    {
        try
        {
            var company = await _context.Companies
                .Include(c => c.Employees)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (company == null)
            {
                return false;
            }

            // Don't allow deletion if company has employees
            if (company.Employees.Any())
            {
                throw new InvalidOperationException("Cannot delete a company that has employees. Please reassign or remove all employees first.");
            }

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted company {CompanyName} (ID: {CompanyId})", company.Name, company.Id);

            return true;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting company with ID {CompanyId}", id);
            throw new InvalidOperationException("An error occurred while deleting the company.");
        }
    }

    public async Task<bool> CompanyExistsAsync(int id)
    {
        return await _context.Companies.AnyAsync(c => c.Id == id);
    }

    public async Task<bool> CompanyNameExistsAsync(string name, int? excludeId = null)
    {
        var query = _context.Companies.Where(c => c.Name == name);

        if (excludeId.HasValue)
        {
            query = query.Where(c => c.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }

    public async Task<bool> CompanyShortNameExistsAsync(string shortName, int? excludeId = null)
    {
        var query = _context.Companies.Where(c => c.ShortName == shortName);

        if (excludeId.HasValue)
        {
            query = query.Where(c => c.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }

    // Helper method to map Company entity to DTO
    private static CompanyDto MapToDto(Company company)
    {
        return new CompanyDto
        {
            Id = company.Id,
            Name = company.Name,
            ShortName = company.ShortName,
            PrimaryColor = company.PrimaryColor,
            SecondaryColor = company.SecondaryColor,
            AccentColor = company.AccentColor,
            CreatedAt = company.CreatedAt.ToString("dd-MM-yyyy"),
            UpdatedAt = company.UpdatedAt.ToString("dd-MM-yyyy")
        };
    }
}
