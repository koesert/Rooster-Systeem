using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyAndMultiTenancy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "TimeOffRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "Shifts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "Employees",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "Availabilities",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShortName = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PrimaryColor = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    SecondaryColor = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    AccentColor = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimeOffRequests_CompanyId",
                table: "TimeOffRequests",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeOffRequests_CompanyId_Status",
                table: "TimeOffRequests",
                columns: new[] { "CompanyId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_CompanyId",
                table: "Shifts",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_CompanyId_Date",
                table: "Shifts",
                columns: new[] { "CompanyId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Employees_CompanyId",
                table: "Employees",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Availabilities_CompanyId",
                table: "Availabilities",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Availabilities_CompanyId_Date",
                table: "Availabilities",
                columns: new[] { "CompanyId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Companies_Name",
                table: "Companies",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_ShortName",
                table: "Companies",
                column: "ShortName",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Availabilities_Companies_CompanyId",
                table: "Availabilities",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Employees_Companies_CompanyId",
                table: "Employees",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Shifts_Companies_CompanyId",
                table: "Shifts",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TimeOffRequests_Companies_CompanyId",
                table: "TimeOffRequests",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Availabilities_Companies_CompanyId",
                table: "Availabilities");

            migrationBuilder.DropForeignKey(
                name: "FK_Employees_Companies_CompanyId",
                table: "Employees");

            migrationBuilder.DropForeignKey(
                name: "FK_Shifts_Companies_CompanyId",
                table: "Shifts");

            migrationBuilder.DropForeignKey(
                name: "FK_TimeOffRequests_Companies_CompanyId",
                table: "TimeOffRequests");

            migrationBuilder.DropTable(
                name: "Companies");

            migrationBuilder.DropIndex(
                name: "IX_TimeOffRequests_CompanyId",
                table: "TimeOffRequests");

            migrationBuilder.DropIndex(
                name: "IX_TimeOffRequests_CompanyId_Status",
                table: "TimeOffRequests");

            migrationBuilder.DropIndex(
                name: "IX_Shifts_CompanyId",
                table: "Shifts");

            migrationBuilder.DropIndex(
                name: "IX_Shifts_CompanyId_Date",
                table: "Shifts");

            migrationBuilder.DropIndex(
                name: "IX_Employees_CompanyId",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Availabilities_CompanyId",
                table: "Availabilities");

            migrationBuilder.DropIndex(
                name: "IX_Availabilities_CompanyId_Date",
                table: "Availabilities");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "TimeOffRequests");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "Availabilities");
        }
    }
}
