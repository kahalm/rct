using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rct.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CourseAccess",
                table: "AppUsers",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CourseAccess",
                table: "AppUsers");
        }
    }
}
