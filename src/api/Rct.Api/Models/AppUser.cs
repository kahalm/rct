using System.ComponentModel.DataAnnotations;

namespace Rct.Api.Models;

/// <summary>Konto. Anders als RookHub ist die <see cref="Email"/> hier PFLICHT (non-null, eindeutig).</summary>
public class AppUser
{
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    /// <summary>E-Mail — PFLICHT bei RCT: eindeutig, wird bei der Registrierung normalisiert (lowercase).</summary>
    [Required, EmailAddress, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Rotiert bei Passwort-Änderung und invalidiert alte JWTs (sstamp-Claim). null = grandfathered.</summary>
    [MaxLength(64)]
    public string? SecurityStamp { get; set; }

    public bool IsAdmin { get; set; } = false;

    /// <summary>Kurs-Freischaltung: Die 6 kapitel-losen Trial-Stellungen sieht JEDER eingeloggte
    /// User; die Kurs-KAPITEL (Noel-Serie) sieht nur, wen der Admin freigeschaltet hat.
    /// Admins sehen immer alles.</summary>
    public bool CourseAccess { get; set; } = false;

    /// <summary>Tester sehen terminierte Kapitel schon ab deren <c>TesterReleaseAt</c>
    /// (<see cref="ChapterRelease"/>) — die Allgemeinheit erst ab <c>ReleaseAt</c>.</summary>
    public bool IsTester { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Gesetzt bei Löschung/Anonymisierung — solche Konten können sich nicht mehr einloggen.</summary>
    public DateTime? DeletedAt { get; set; }
}
