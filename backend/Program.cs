using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using backend.Data;
using backend.Services;
using backend.Converters;
using Swashbuckle.AspNetCore.Annotations;

var builder = WebApplication.CreateBuilder(args);

// Configure port for Railway deployment
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configure custom date formatting
        options.JsonSerializerOptions.Converters.Add(new DateTimeConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableDateTimeConverter());
    });

// Helper function to convert Railway DATABASE_URL to Npgsql connection string
static string ConvertDatabaseUrl(string databaseUrl)
{
    if (string.IsNullOrEmpty(databaseUrl))
    {
        return "";
    }

    try
    {
        var uri = new Uri(databaseUrl);
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 5432;
        var database = uri.LocalPath.TrimStart('/');
        var userInfo = uri.UserInfo.Split(':');
        var username = userInfo.Length > 0 ? userInfo[0] : "";
        var password = userInfo.Length > 1 ? userInfo[1] : "";

        return $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error parsing DATABASE_URL: {ex.Message}");
        return "";
    }
}

// Configure Entity Framework with PostgreSQL database
// Railway gebruikt DATABASE_URL environment variable, lokaal normale connection string
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var connectionString = "";

if (!string.IsNullOrEmpty(databaseUrl))
{
    // Production: Railway PostgreSQL database (convert DATABASE_URL)
    connectionString = ConvertDatabaseUrl(databaseUrl);
    if (string.IsNullOrEmpty(connectionString))
    {
        throw new InvalidOperationException("Could not convert Railway DATABASE_URL to valid connection string");
    }
    Console.WriteLine("Using Railway PostgreSQL database");
    Console.WriteLine("Railway PostgreSQL UTC timezone compatibility enabled");
}
else
{
    // Development: Local PostgreSQL database
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Host=localhost;Database=restaurant_roster;Username=postgres;Password=dev_password123";
    Console.WriteLine("Using local PostgreSQL database");
    Console.WriteLine("Local PostgreSQL UTC timezone compatibility enabled");
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        // Set command timeout for Railway's potential latency
        npgsqlOptions.CommandTimeout(30);

        // Configure timezone handling for Railway PostgreSQL
        npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
    });

    // Configure Entity Framework options
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// Configure PostgreSQL to use UTC timestamps globally - critical for Railway deployment
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Register custom services with dependency injection
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IShiftService, ShiftService>();
builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
builder.Services.AddScoped<ITimeOffRequestService, TimeOffRequestService>();

// Configure JWT settings programmatically
// In production, these should be stored in secure configuration
var jwtKey = "RestaurantRoster_SuperSecure_JWT_Key_2025_With_Random_Characters_!@#$%^&*()";
builder.Configuration["JwtSettings:Key"] = jwtKey;
builder.Configuration["JwtSettings:Issuer"] = "RestaurantRoster";
builder.Configuration["JwtSettings:Audience"] = "RestaurantRoster";

// Configure JWT Bearer authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
        ValidAudience = builder.Configuration["JwtSettings:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero // Remove default 5-minute clock skew for precise expiration
    };
});

// Configure Authorization policies for role-based access control
builder.Services.AddAuthorization(options =>
{
    // Manager policy - only managers can access
    options.AddPolicy("ManagerOnly", policy =>
        policy.RequireClaim("Role", "Manager"));

    // Manager or Shift Leader policy
    options.AddPolicy("ManagerOrShiftLeider", policy =>
        policy.RequireClaim("Role", "Manager", "ShiftLeider"));

    // All authenticated users (any role)
    options.AddPolicy("AllRoles", policy =>
        policy.RequireClaim("Role", "Manager", "ShiftLeider", "Werknemer"));
});

// Configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Restaurant Roster API",
        Version = "v1",
        Description = "API voor het beheren van restaurant medewerkers en roosters met role-based access control"
    });

    // Add JWT authentication to Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. " +
                      "Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });

    // Add XML comments for better API documentation
    c.EnableAnnotations();
});

// Configure CORS for frontend communication (Next.js on port 3000 + Vercel deployment)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:3000",
                    "https://localhost:3000",
                    "https://rooster-systeem.vercel.app"
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials() // Required for JWT cookies if used
                  .SetPreflightMaxAge(TimeSpan.FromMinutes(10)); // Cache preflight for 10 minutes
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
// Always enable Swagger for testing
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Restaurant Roster API v1");
    c.RoutePrefix = string.Empty; // This makes swagger available at the root URL
    c.DocumentTitle = "Restaurant Roster API";
});

// Apply CORS policy before authentication
app.UseCors("AllowFrontend");

// Authentication must come before authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Automatische database migraties voor Railway deployment
if (app.Environment.IsProduction())
{
    using (var scope = app.Services.CreateScope())
    {
        try
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            Console.WriteLine("Checking database connection...");

            // Simple connection test
            bool canConnect = context.Database.CanConnect();
            Console.WriteLine($"Database connection: {(canConnect ? "OK" : "Failed")}");

            if (!canConnect)
            {
                Console.WriteLine("Database not accessible, creating...");
                context.Database.EnsureCreated();
                Console.WriteLine("Database created successfully!");
                return;
            }

            // Try to check if migrations are needed without complex queries
            try
            {
                var pendingMigrations = context.Database.GetPendingMigrations().ToList();

                if (pendingMigrations.Any())
                {
                    Console.WriteLine($"Found {pendingMigrations.Count} pending migrations:");
                    foreach (var migration in pendingMigrations)
                    {
                        Console.WriteLine($"  - {migration}");
                    }

                    Console.WriteLine("Attempting to run migrations...");
                    context.Database.Migrate();
                    Console.WriteLine("Migrations completed successfully!");
                }
                else
                {
                    Console.WriteLine("No pending migrations found. Database is up to date.");
                }
            }
            catch (Exception migrationEx)
            {
                if (migrationEx.Message.Contains("already exists") || migrationEx.Message.Contains("42P07"))
                {
                    Console.WriteLine("Tables already exist. Skipping migration and continuing...");
                    Console.WriteLine("This is normal for existing databases.");
                }
                else
                {
                    Console.WriteLine($"Migration error: {migrationEx.Message}");
                    // Don't throw - let the app continue even if migrations fail
                    Console.WriteLine("Continuing with existing database state...");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Database setup warning: {ex.Message}");
            Console.WriteLine("Continuing with existing database...");
            // Don't throw - let the app start even if there are database issues
        }
    }
}
else
{
    // Development: gebruik EnsureCreated voor lokale development
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        try
        {
            await context.Database.EnsureCreatedAsync();
            Console.WriteLine("Local database geïnitialiseerd succesvol");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Fout bij initialiseren lokale database: {ex.Message}");
            Console.WriteLine($"Connection string gebruikt: {connectionString.Replace("Password=", "Password=***")}");
            throw;
        }
    }
}

app.Run();