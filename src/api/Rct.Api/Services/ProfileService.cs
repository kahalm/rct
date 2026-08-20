using Microsoft.EntityFrameworkCore;
using Rct.Api.Data;
using Rct.Api.DTOs;
using Rct.Api.Models;

namespace Rct.Api.Services;

/// <summary>
/// Schlankes Profil fuer RCT: eigenes Profil lesen/aendern (Username/E-Mail) und Konto loeschen
/// (DSGVO-Anonymisierung). Getrimmt gegenueber RookHub: kein UserProfile (FIDE/Discord/…),
/// keine API-Tokens, keine geteilten Inhalte — RCT kennt nur AppUser + CalculationTrees.
/// </summary>
public class ProfileService
{
    private const int BcryptWorkFactor = 12;   // identisch zu AuthService

    private readonly AppDbContext _db;
    private readonly ILogger<ProfileService> _logger;

    public ProfileService(AppDbContext db, ILogger<ProfileService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Eigenes Profil.</summary>
    /// <exception cref="KeyNotFoundException">User existiert nicht.</exception>
    public async Task<ProfileDto> GetAsync(int userId)
    {
        var user = await _db.AppUsers.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        return MapToDto(user);
    }

    /// <summary>
    /// Aendert Username und/oder E-Mail. Nur GESETZTE Felder werden geaendert (null = unveraendert).
    /// WICHTIG: bewusst KEINE Security-Stamp-Rotation — es aendert sich nur der Login-Name, das
    /// bestehende Token bleibt gueltig (wie RookHub).
    /// </summary>
    /// <exception cref="KeyNotFoundException">User existiert nicht.</exception>
    /// <exception cref="InvalidOperationException">Validierungs-/Duplikat-Fehler (Controller → 409).</exception>
    public async Task<ProfileDto> UpdateAsync(int userId, UpdateProfileDto dto)
    {
        var user = await _db.AppUsers.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (dto.Username != null)
        {
            var username = dto.Username.Trim();
            if (username.Length < 3 || username.Length > 50)
                throw new InvalidOperationException("Username must be between 3 and 50 characters.");
            // Case-insensitiv gegen ANDERE pruefen (passend zur case-insensitiven DB-Collation).
            var lower = username.ToLower();
            if (await _db.AppUsers.AnyAsync(u => u.Id != userId && u.Username.ToLower() == lower))
                throw new InvalidOperationException("Username is already taken.");
            user.Username = username;
        }

        if (dto.Email != null)
        {
            // E-Mail ist bei RCT PFLICHT (non-null, unique) — leere Eingabe kann nicht uebernommen werden.
            var email = dto.Email.Trim().ToLowerInvariant();
            if (email.Length == 0)
                throw new InvalidOperationException("Email is required.");
            if (await _db.AppUsers.AnyAsync(u => u.Id != userId && u.Email == email))
                throw new InvalidOperationException("Email is already in use.");
            user.Email = email;
        }

        await _db.SaveChangesAsync();
        return MapToDto(user);
    }

    /// <summary>
    /// Loescht das Konto DSGVO-konform: persoenliche Analysen (CalculationTrees) und offene
    /// Reset-Tokens werden entfernt, die Identitaet in-place anonymisiert (Unique-Spalten bekommen
    /// kollisionfreie Platzhalter), das Passwort unbrauchbar gemacht und der Security-Stamp rotiert
    /// (invalidiert alle bestehenden JWTs). Idempotent: ein bereits geloeschtes Konto ist ein No-op.
    /// </summary>
    /// <exception cref="KeyNotFoundException">User existiert nicht.</exception>
    /// <exception cref="UnauthorizedAccessException">Passwort falsch.</exception>
    public async Task DeleteAccountAsync(int userId, string password)
    {
        var user = await _db.AppUsers.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.DeletedAt != null)
            return; // bereits geloescht -> idempotent

        if (string.IsNullOrEmpty(password) || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw new UnauthorizedAccessException("Password is incorrect.");

        // Persoenliche Analysen (Kalkulations-Baeume) sind Nutzerinhalt → hart loeschen.
        _db.CalculationTrees.RemoveRange(
            await _db.CalculationTrees.Where(t => t.UserId == userId).ToListAsync());
        // Offene Reset-Tokens duerfen ein geloeschtes Konto nicht wiederbeleben.
        _db.PasswordResetTokens.RemoveRange(
            await _db.PasswordResetTokens.Where(t => t.UserId == userId).ToListAsync());

        // Identitaet anonymisieren (E-Mail ist NOT NULL + unique → deterministischer Platzhalter).
        user.Username = $"deleted_user_{userId}";
        user.Email = $"deleted-{userId}@rct.invalid";
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString(), BcryptWorkFactor);
        // Stamp-Rotation invalidiert alle noch laufenden JWTs des Kontos sofort.
        user.SecurityStamp = AuthService.NewSecurityStamp();
        user.DeletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        _logger.LogInformation("AccountDeleted: user {UserId} anonymized.", userId);
    }

    private static ProfileDto MapToDto(AppUser user) => new()
    {
        Username = user.Username,
        Email = user.Email,
        IsAdmin = user.IsAdmin,
        CreatedAt = user.CreatedAt,
    };
}
