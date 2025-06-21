using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Employee> Employees { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Employee entity
        modelBuilder.Entity<Employee>(entity =>
        {
            // Make Username unique
            entity.HasIndex(e => e.Username)
                  .IsUnique()
                  .HasDatabaseName("IX_Employees_Username");

            // Configure properties
            entity.Property(e => e.FirstName)
                  .IsRequired()
                  .HasMaxLength(50);

            entity.Property(e => e.LastName)
                  .IsRequired()
                  .HasMaxLength(50);

            entity.Property(e => e.Username)
                  .IsRequired()
                  .HasMaxLength(30);

            entity.Property(e => e.PasswordHash)
                  .IsRequired()
                  .HasMaxLength(100);

            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("datetime('now')");

            entity.Property(e => e.UpdatedAt)
                  .HasDefaultValueSql("datetime('now')");
        });

        // Seed default admin user
        var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("admin");

        modelBuilder.Entity<Employee>().HasData(
            new Employee
            {
                Id = 1,
                FirstName = "Admin",
                LastName = "User",
                Username = "admin",
                PasswordHash = adminPasswordHash,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );
    }
}