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

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);

		modelBuilder.Entity<Employee>(entity =>
		{
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

			entity.Property(e => e.CreatedAt)
				  .HasDefaultValueSql("datetime('now')");

			entity.Property(e => e.UpdatedAt)
				  .HasDefaultValueSql("datetime('now')");
		});

		modelBuilder.Entity<RefreshToken>(entity =>
		{
			entity.Property(rt => rt.Token)
				  .IsRequired()
				  .HasMaxLength(200);

			entity.Property(rt => rt.ExpiresAt)
				  .IsRequired();

			entity.Property(rt => rt.CreatedAt)
				  .HasDefaultValueSql("datetime('now')");

			entity.HasOne(rt => rt.Employee)
				  .WithMany()
				  .HasForeignKey(rt => rt.EmployeeId)
				  .OnDelete(DeleteBehavior.Cascade);

			entity.HasIndex(rt => rt.Token)
				  .HasDatabaseName("IX_RefreshTokens_Token");

			entity.HasIndex(rt => rt.EmployeeId)
				  .HasDatabaseName("IX_RefreshTokens_EmployeeId");
		});

		var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123");

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