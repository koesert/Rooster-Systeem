using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
	public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
	{
	}

	public DbSet<Employee> Employees { get; set; }
	public DbSet<RefreshToken> RefreshTokens { get; set; }
	public DbSet<Shift> Shifts { get; set; }

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);

		// Configure Employee entity
		modelBuilder.Entity<Employee>(entity =>
		{
			// Ensure username uniqueness at database level
			entity.HasIndex(e => e.Username)
				  .IsUnique()
				  .HasDatabaseName("IX_Employees_Username");

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

			// Configure Role enum
			entity.Property(e => e.Role)
				  .IsRequired()
				  .HasConversion<int>();

			// Configure date fields
			entity.Property(e => e.HireDate)
				  .IsRequired();

			entity.Property(e => e.BirthDate)
				  .IsRequired();

			// Auto-populate timestamps using SQLite datetime function
			entity.Property(e => e.CreatedAt)
				  .HasDefaultValueSql("datetime('now')");

			entity.Property(e => e.UpdatedAt)
				  .HasDefaultValueSql("datetime('now')");
		});

		// Configure RefreshToken entity
		modelBuilder.Entity<RefreshToken>(entity =>
		{
			entity.Property(rt => rt.Token)
				  .IsRequired()
				  .HasMaxLength(200);

			entity.Property(rt => rt.ExpiresAt)
				  .IsRequired();

			entity.Property(rt => rt.CreatedAt)
				  .HasDefaultValueSql("datetime('now')");

			// Set up foreign key relationship with cascade delete
			// When an employee is deleted, all their refresh tokens are automatically removed
			entity.HasOne(rt => rt.Employee)
				  .WithMany()
				  .HasForeignKey(rt => rt.EmployeeId)
				  .OnDelete(DeleteBehavior.Cascade);

			// Index for efficient token lookups during authentication
			entity.HasIndex(rt => rt.Token)
				  .HasDatabaseName("IX_RefreshTokens_Token");

			entity.HasIndex(rt => rt.EmployeeId)
				  .HasDatabaseName("IX_RefreshTokens_EmployeeId");
		});

		// Configure Shift entity
		modelBuilder.Entity<Shift>(entity =>
		{
			entity.Property(s => s.EmployeeId)
				  .IsRequired();

			entity.Property(s => s.Date)
				  .IsRequired()
				  .HasColumnType("DATE"); // Store only date part

			entity.Property(s => s.StartTime)
				  .IsRequired()
				  .HasColumnType("TIME");

			entity.Property(s => s.EndTime)
				  .HasColumnType("TIME"); // Nullable for open-ended shifts

			// Configure ShiftType enum
			entity.Property(s => s.ShiftType)
				  .IsRequired()
				  .HasConversion<int>();

			entity.Property(s => s.IsOpenEnded)
				  .IsRequired()
				  .HasDefaultValue(false);

			entity.Property(s => s.Notes)
				  .HasMaxLength(500);

			// Auto-populate timestamps
			entity.Property(s => s.CreatedAt)
				  .HasDefaultValueSql("datetime('now')");

			entity.Property(s => s.UpdatedAt)
				  .HasDefaultValueSql("datetime('now')");

			// Set up foreign key relationship with Employee
			entity.HasOne(s => s.Employee)
				  .WithMany() // Employee can have many shifts
				  .HasForeignKey(s => s.EmployeeId)
				  .OnDelete(DeleteBehavior.Cascade); // Delete shifts when employee is deleted

			// Indexes for efficient querying
			entity.HasIndex(s => s.EmployeeId)
				  .HasDatabaseName("IX_Shifts_EmployeeId");

			entity.HasIndex(s => s.Date)
				  .HasDatabaseName("IX_Shifts_Date");

			entity.HasIndex(s => new { s.EmployeeId, s.Date })
				  .HasDatabaseName("IX_Shifts_EmployeeId_Date");

			entity.HasIndex(s => s.ShiftType)
				  .HasDatabaseName("IX_Shifts_ShiftType");

			// Composite index for efficient date range queries
			entity.HasIndex(s => new { s.Date, s.StartTime })
				  .HasDatabaseName("IX_Shifts_Date_StartTime");
		});

		// Seed default admin user for initial system access
		// Password: "Admin123" (meets validation requirements)
		var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123");

		modelBuilder.Entity<Employee>().HasData(
			new Employee
			{
				Id = 1,
				FirstName = "Admin",
				LastName = "User",
				Username = "admin",
				PasswordHash = adminPasswordHash,
				Role = Role.Manager,
				HireDate = DateTime.UtcNow,
				BirthDate = new DateTime(1990, 1, 1), // Default birth date
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow
			}
		);
	}
}