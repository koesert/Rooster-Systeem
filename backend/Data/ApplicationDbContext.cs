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
	public DbSet<Availability> Availabilities { get; set; }
	public DbSet<TimeOffRequest> TimeOffRequests { get; set; }

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

			// Auto-populate timestamps using PostgreSQL datetime function
			entity.Property(e => e.CreatedAt)
				  .HasDefaultValueSql("NOW()");

			entity.Property(e => e.UpdatedAt)
				  .HasDefaultValueSql("NOW()");
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
				  .HasDefaultValueSql("NOW()");

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
				  .HasDefaultValueSql("NOW()");

			entity.Property(s => s.UpdatedAt)
				  .HasDefaultValueSql("NOW()");

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

		// Configure Availability entity
		modelBuilder.Entity<Availability>(entity =>
		{
			entity.Property(a => a.EmployeeId)
				  .IsRequired();

			entity.Property(a => a.Date)
				  .IsRequired()
				  .HasColumnType("DATE"); // Store only date part

			entity.Property(a => a.IsAvailable)
				  .IsRequired();

			entity.Property(a => a.Notes)
				  .HasMaxLength(500);

			// Auto-populate timestamps
			entity.Property(a => a.CreatedAt)
				  .HasDefaultValueSql("NOW()");

			entity.Property(a => a.UpdatedAt)
				  .HasDefaultValueSql("NOW()");

			// Set up foreign key relationship with Employee
			entity.HasOne(a => a.Employee)
				  .WithMany() // Employee can have many availability records
				  .HasForeignKey(a => a.EmployeeId)
				  .OnDelete(DeleteBehavior.Cascade); // Delete availability when employee is deleted

			// Unique constraint: one availability record per employee per date
			entity.HasIndex(a => new { a.EmployeeId, a.Date })
				  .IsUnique()
				  .HasDatabaseName("IX_Availability_EmployeeId_Date");

			// Index for efficient date range queries
			entity.HasIndex(a => a.Date)
				  .HasDatabaseName("IX_Availability_Date");

			entity.HasIndex(a => a.EmployeeId)
				  .HasDatabaseName("IX_Availability_EmployeeId");
		});

		// Configure TimeOffRequest entity
		modelBuilder.Entity<TimeOffRequest>(entity =>
		{
			entity.Property(t => t.EmployeeId)
				  .IsRequired();

			entity.Property(t => t.Status)
				  .IsRequired()
				  .HasConversion<int>();

			entity.Property(t => t.Reason)
				  .IsRequired()
				  .HasMaxLength(500);

			entity.Property(t => t.StartDate)
				  .IsRequired()
				  .HasColumnType("DATE");

			entity.Property(t => t.EndDate)
				  .IsRequired()
				  .HasColumnType("DATE");

			entity.Property(t => t.ApprovedBy)
				  .IsRequired(false);

			// Auto-populate timestamps
			entity.Property(t => t.CreatedAt)
				  .HasDefaultValueSql("NOW()");

			entity.Property(t => t.UpdatedAt)
				  .HasDefaultValueSql("NOW()");

			// Set up foreign key relationships
			entity.HasOne(t => t.Employee)
				  .WithMany()
				  .HasForeignKey(t => t.EmployeeId)
				  .OnDelete(DeleteBehavior.Cascade);

			entity.HasOne(t => t.Approver)
				  .WithMany()
				  .HasForeignKey(t => t.ApprovedBy)
				  .OnDelete(DeleteBehavior.SetNull);

			// Indexes for efficient querying
			entity.HasIndex(t => t.EmployeeId)
				  .HasDatabaseName("IX_TimeOffRequests_EmployeeId");

			entity.HasIndex(t => t.Status)
				  .HasDatabaseName("IX_TimeOffRequests_Status");

			entity.HasIndex(t => new { t.StartDate, t.EndDate })
				  .HasDatabaseName("IX_TimeOffRequests_Dates");

			entity.HasIndex(t => new { t.EmployeeId, t.Status })
				  .HasDatabaseName("IX_TimeOffRequests_EmployeeId_Status");
		});

		// Seed default admin user for initial system access
		// Password: "Admin123" (meets validation requirements)
		var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123");
		var utcNow = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
		var birthDate = DateTime.SpecifyKind(new DateTime(1990, 1, 1), DateTimeKind.Utc);

		modelBuilder.Entity<Employee>().HasData(
			new Employee
			{
				Id = 1,
				FirstName = "Admin",
				LastName = "User",
				Username = "admin",
				PasswordHash = adminPasswordHash,
				Role = Role.Manager,
				HireDate = utcNow,
				BirthDate = birthDate,
				CreatedAt = utcNow,
				UpdatedAt = utcNow
			}
		);
	}
}