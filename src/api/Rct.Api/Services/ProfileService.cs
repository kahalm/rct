using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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

    private readonly AppDbContext _db;
    private readonly ILogger<ProfileService> _logger;
    private readonly IMemoryCache _cache;

    public ProfileService(AppDbContext db, ILogger<ProfileService> logger, IMemoryCache cache)
    {
        _db = db;
        _logger = logger;
        _cache = cache;
    }

    /// <summary>Eigenes Profil.</summary>
    /// <exception cref="KeyNotFoundException">User existiert nicht.</exception>
    public async Task<ProfileDto> GetAsync(int userId)
    {
        var user = await _db.AppUsers.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        // Anonymisierte Konten sind fuer die Profil-API nicht mehr existent (Restlaufzeit des
        // Auth-Caches darf kein Fenster oeffnen, Review-Finding).
        if (user.DeletedAt != null) throw new KeyNotFoundException("User not found.");
        return MapToDto(user);
    }

    /// <summary>
    /// Aendert Username und/oder E-Mail. Nur GESETZTE Felder werden geaendert (null = unveraendert).
    /// WICHTIG: bewusst KEINE Security-Stamp-Rotation — es aendert sich nur der Login-Name, das
    /// bestehende Token bleibt gueltig (wie RookHub).
    /// </summary>
    /// <exception cref="KeyNotFoundException">User existiert nicht.</exception>
    /// <exception cref="InvalidOperationException">Validierungs-/Duplikat-Fehler (Controller → 409).</exception>
    /// <exception cref="UnauthorizedAccessException">E-Mail-Aenderung ohne korrektes Passwort (Controller → 401).</exception>
    public async Task<ProfileDto> UpdateAsync(int userId, UpdateProfileDto dto)
    {
        var user = await _db.AppUsers.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        // Geloeschte Konten sind unveraenderbar — sonst koennte im Auth-Cache-Restfenster wieder
        // Klartext-Identitaet in die anonymisierte Zeile geschrieben werden (Review-Finding).
        if (user.DeletedAt != null) throw new KeyNotFoundException("User not found.");

        if (dto.Username != null)
        {
            var username = dto.Username.Trim();
            if (username.Length < 3 || username.Length > 50)
                throw new InvalidOperationException("Username must be between 3 and 50 characters.");
            // Case-insensitiv gegen ANDERE pruefen (passend zur case-insensitiven DB-Collation).
            var lower = username.ToLower();
            if (AuthService.IsReservedIdentity(username, null))
                throw new InvalidOperationException("This username is reserved.");
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
            if (!string.Equals(email, user.Email, StringComparison.Ordinal))
            {
                // Die E-Mail ist der Recovery-Kanal (Passwort-Reset): ein gestohlenes Token allein
                // darf sie NICHT umbiegen koennen (sonst Token → Mail wechseln → Reset → Uebernahme,
                // Review-Finding). Darum Passwort-Bestaetigung wie bei Passwortwechsel/Loeschung.
                if (string.IsNullOrEmpty(dto.CurrentPassword) || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                    throw new UnauthorizedAccessException("Current password is required to change the email address.");
                if (AuthService.IsReservedIdentity(null, email))
                    throw new InvalidOperationException("This email is reserved.");
                if (await _db.AppUsers.AnyAsync(u => u.Id != userId && u.Email == email))
                    throw new InvalidOperationException("Email is already in use.");
                user.Email = email;
            }
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (AuthService.IsUniqueViolation(ex))
        {
            // Race am Unique-Index (paralleles Rename/Registrieren zwischen Vorabpruefung und
            // Save) → sauberer 409 statt unbehandeltem 500 (Review-Finding; Muster wie Register).
            throw new InvalidOperationException("Username or email already exists.");
        }
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
        // ExecuteDelete statt RemoveRange: die Baeume sind LONGTEXT — sie erst komplett in den
        // Speicher zu laden, nur um sie zu loeschen, ist unnoetig (Review-Finding).
        await _db.CalculationTrees.Where(t => t.UserId == userId).ExecuteDeleteAsync();
        // Offene Reset-Tokens duerfen ein geloeschtes Konto nicht wiederbeleben.
        await _db.PasswordResetTokens.Where(t => t.UserId == userId).ExecuteDeleteAsync();

        // Identitaet anonymisieren (E-Mail ist NOT NULL + unique → deterministischer Platzhalter);
        // Zufallspasswort + Stamp-Rotation machen das Konto unbenutzbar und invalidieren alle JWTs.
        user.Username = $"deleted_user_{userId}";
        user.Email = $"deleted-{userId}@rct.invalid";
        AuthService.SetPassword(user, Guid.NewGuid().ToString());
        user.DeletedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (AuthService.IsUniqueViolation(ex))
        {
            // Altbestand vor der Reservierungs-Sperre koennte die Platzhalter belegen — die
            // DSGVO-Loeschung darf daran NIE scheitern: eindeutige Zufalls-Suffixe als Ausweich.
            var salt = Guid.NewGuid().ToString("N")[..8];
            user.Username = $"deleted_user_{userId}_{salt}";
            user.Email = $"deleted-{userId}-{salt}@rct.invalid";
            await _db.SaveChangesAsync();
        }
        // Auth-Cache verwerfen: sonst validiert das alte Token trotz Rotation bis zu 60 s weiter
        // (und koennte im Restfenster die anonymisierte Zeile wieder befuellen, Review-Finding).
        AuthUserValidation.Invalidate(_cache, userId);
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
