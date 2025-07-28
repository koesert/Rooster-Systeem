using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAvailabilityToUseStatusEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAvailable",
                table: "Availabilities");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Availabilities",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Availabilities");

            migrationBuilder.AddColumn<bool>(
                name: "IsAvailable",
                table: "Availabilities",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
