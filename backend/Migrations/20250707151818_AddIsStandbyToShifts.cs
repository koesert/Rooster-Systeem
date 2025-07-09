using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddIsStandbyToShifts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Availability_EmployeeId_Date",
                table: "Availabilities");

            migrationBuilder.DeleteData(
                table: "Employees",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.RenameIndex(
                name: "IX_Availability_EmployeeId",
                table: "Availabilities",
                newName: "IX_Availabilities_EmployeeId");

            migrationBuilder.RenameIndex(
                name: "IX_Availability_Date",
                table: "Availabilities",
                newName: "IX_Availabilities_Date");

            migrationBuilder.AddColumn<bool>(
                name: "IsStandby",
                table: "Shifts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_IsStandby",
                table: "Shifts",
                column: "IsStandby");

            migrationBuilder.CreateIndex(
                name: "IX_Availabilities_EmployeeId_Date",
                table: "Availabilities",
                columns: new[] { "EmployeeId", "Date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Shifts_IsStandby",
                table: "Shifts");

            migrationBuilder.DropIndex(
                name: "IX_Availabilities_EmployeeId_Date",
                table: "Availabilities");

            migrationBuilder.DropColumn(
                name: "IsStandby",
                table: "Shifts");

            migrationBuilder.RenameIndex(
                name: "IX_Availabilities_EmployeeId",
                table: "Availabilities",
                newName: "IX_Availability_EmployeeId");

            migrationBuilder.RenameIndex(
                name: "IX_Availabilities_Date",
                table: "Availabilities",
                newName: "IX_Availability_Date");

            migrationBuilder.InsertData(
                table: "Employees",
                columns: new[] { "Id", "BirthDate", "CreatedAt", "FirstName", "HireDate", "LastName", "PasswordHash", "Role", "UpdatedAt", "Username" },
                values: new object[] { 1, new DateTime(1990, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 7, 2, 13, 38, 11, 264, DateTimeKind.Utc).AddTicks(5133), "Admin", new DateTime(2025, 7, 2, 13, 38, 11, 264, DateTimeKind.Utc).AddTicks(5133), "User", "$2a$11$5KhE6q2RjqNXEy8m0KW1kOgUdDcfBugEmHjHXf2h4RnxXclCJKF5q", 2, new DateTime(2025, 7, 2, 13, 38, 11, 264, DateTimeKind.Utc).AddTicks(5133), "admin" });

            migrationBuilder.CreateIndex(
                name: "IX_Availability_EmployeeId_Date",
                table: "Availabilities",
                columns: new[] { "EmployeeId", "Date" },
                unique: true);
        }
    }
}
