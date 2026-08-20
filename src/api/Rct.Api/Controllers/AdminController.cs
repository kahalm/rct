using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rct.Api.Data;
using Rct.Api.DTOs;

namespace Rct.Api.Controllers;

/// <summary>
/// User-Verwaltung (NUR Admin): alle registrierten Konten einsehen und die Kurs-Freischaltung
/// (<c>CourseAccess</c>) je Konto schalten. Die Freischaltung steuert ausschliesslich die
/// Sichtbarkeit der Kurs-KAPITEL — die Trial-Stellungen sieht jeder (CalculationService).
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : BaseApiController
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Alle aktiven Konten (geloeschte/anonymisierte bleiben draussen), neueste zuerst.
    /// Filtern/Suchen macht der Client — bei der Zielgroesse dieses Portals bewusst ohne Paging.</summary>
    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers(CancellationToken ct)
    {
        if (!IsAdmin) return Forbid();
        var users = await _db.AppUsers
            .Where(u => u.DeletedAt == null)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                IsAdmin = u.IsAdmin,
                CourseAccess = u.CourseAccess,
                IsTester = u.IsTester,
                CreatedAt = u.CreatedAt,
            })
            .ToListAsync(ct);
        return Ok(users);
    }

    /// <summary>Kurs-Freischaltung eines Kontos setzen/entziehen. Idempotent; wirkt sofort
    /// (kein Claim im JWT — der Server prueft die Freischaltung bei jedem Kurs-Zugriff).</summary>
    [HttpPut("users/{id}/course-access")]
    public async Task<ActionResult<AdminUserDto>> SetCourseAccess(int id, [FromBody] SetCourseAccessDto dto,
        CancellationToken ct)
    {
        if (!IsAdmin) return Forbid();
        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null, ct);
        if (user == null) return NotFound(new { message = "User not found." });

        user.CourseAccess = dto.Access;
        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(user));
    }

    /// <summary>Tester-Status setzen/entziehen: Tester sehen terminierte Kapitel schon ab
    /// deren TesterReleaseAt. Idempotent, wirkt sofort.</summary>
    [HttpPut("users/{id}/tester")]
    public async Task<ActionResult<AdminUserDto>> SetTester(int id, [FromBody] SetTesterDto dto,
        CancellationToken ct)
    {
        if (!IsAdmin) return Forbid();
        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null, ct);
        if (user == null) return NotFound(new { message = "User not found." });

        user.IsTester = dto.Tester;
        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(user));
    }

    private static AdminUserDto ToDto(Rct.Api.Models.AppUser user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Email = user.Email,
        IsAdmin = user.IsAdmin,
        CourseAccess = user.CourseAccess,
        IsTester = user.IsTester,
        CreatedAt = user.CreatedAt,
    };
}
