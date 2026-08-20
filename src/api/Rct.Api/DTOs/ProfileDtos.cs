using System.ComponentModel.DataAnnotations;

namespace Rct.Api.DTOs;

/// <summary>Eigenes Profil (GET/PUT /api/profile).</summary>
public class ProfileDto
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Profil aendern — nur GESETZTE Felder werden uebernommen (null = unveraendert).
/// Laengen-/Duplikat-Regeln prueft der <c>ProfileService</c> nach dem Trimmen.
/// </summary>
public class UpdateProfileDto
{
    public string? Username { get; set; }

    // Wenn gesetzt, muss es ein gueltiges E-Mail-Format sein (null = unveraendert;
    // leerer String wird im Service abgelehnt — E-Mail ist bei RCT Pflicht).
    [EmailAddress, MaxLength(255)]
    public string? Email { get; set; }

    /// <summary>Nur bei E-MAIL-Aenderung Pflicht: aktuelles Passwort als Besitznachweis (die
    /// E-Mail ist der Passwort-Reset-Kanal; ein Token allein darf sie nicht umbiegen).</summary>
    public string? CurrentPassword { get; set; }
}

/// <summary>Konto loeschen (DELETE /api/profile/account) — verlangt das aktuelle Passwort.</summary>
public class DeleteAccountDto
{
    [Required]
    public string Password { get; set; } = string.Empty;
}
