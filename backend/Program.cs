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

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configure custom date formatting
        options.JsonSerializerOptions.Converters.Add(new DateTimeConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableDateTimeConverter());
    });

// Configure Entity Framework with SQLite database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=Data/restaurant_roster.db"));

// Register custom services with dependency injection
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IShiftService, ShiftService>();

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
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
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

// Configure CORS for frontend communication (Next.js on port 3000)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Required for JWT cookies if used
        });
});

var app = builder.Build();

// Ensure database is created and seeded on startup
// This approach is acceptable for development but should use migrations in production
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        // Only create database if it doesn't exist (preserves existing data)
        await context.Database.EnsureCreatedAsync();

        Console.WriteLine("Database initialized successfully");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error initializing database: {ex.Message}");
        throw; // Re-throw to prevent app from starting with broken database
    }
}

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

app.Run();