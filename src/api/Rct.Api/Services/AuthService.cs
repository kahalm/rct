using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Rct.Api.Data;
using Rct.Api.DTOs;
using Rct.Api.Models;

namespace Rct.Api.Services;

/// <summary>
/// Registrierung, Login und Passwortänderung. Getrimmt gegenüber RookHub: KEINE
/// Passwort-Reset-/SMTP-, Impersonations-, Permission-Claim- oder Admin-Benachrichtigungs-Pfade.
/// Sicherheits-kritisch beibehalten: E-Mail ist PFLICHT und eindeutig, BCrypt-Workfactor 12,
/// zeitkonstanter Login (Dummy-Hash + Konto-Bremse) und Security-Stamp-Rotation bei PW-Änderung.
/// </summary>
public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    /// <summary>Für die Auth-Cache-Eviction nach Stamp-Rotationen (siehe AuthUserValidation.Invalidate).</summary>
    private readonly IMemoryCache _cache;

    // Konstanter Dummy-Hash für timing-sichere Logins nicht existierender User
    // (gleicher BCrypt-Workfactor wie echte Hashes -> gleiche Verify-Dauer).
    // Workfactor explizit & versionierbar statt Library-Default (10); EINZIGE Definition —
    // alle anderen Hash-Stellen (Reset/Delete/Seeder) gehen über HashPassword/SetPassword.
    public const int BcryptWorkFactor = 12;
    private static readonly string DummyHash = HashPassword("rct-constant-time-dummy");

    /// <summary>Passwort-Hash mit dem app-weiten Workfactor.</summary>
    public static string HashPassword(string password)
        => BCrypt.Net.BCrypt.HashPassword(password, BcryptWorkFactor);

    /// <summary>Setzt ein neues Passwort UND rotiert den Security-Stamp — die beiden gehören
    /// untrennbar zusammen (Rotation invalidiert alle bestehenden JWTs des Kontos).</summary>
    public static void SetPassword(Models.AppUser user, string newPassword)
    {
        user.PasswordHash = HashPassword(newPassword);
        user.SecurityStamp = NewSecurityStamp();
    }

    // Prozessweiter Zähler der Login-Fehlversuche je Konto (bewusst statisch statt injiziert:
    // die Bremse ist Prozess-Zustand, kein Service).
    private static readonly IMemoryCache LoginFailures = new MemoryCache(new MemoryCacheOptions());

    public AuthService(AppDbContext db, IConfiguration config, IMemoryCache cache)
    {
        _db = db;
        _config = config;
        _cache = cache;
    }

    /// <summary>Zeitfenster der Fehlversuchs-Zählung je Konto (sliding: anhaltendes Raten hält die Bremse aktiv).</summary>
    private static readonly TimeSpan LoginFailureWindow = TimeSpan.FromMinutes(15);

    /// <summary>So viele Fehlversuche bleiben unverzögert (Vertipper).</summary>
    private const int FreeLoginAttempts = 5;

    /// <summary>Wartezeit VOR der Passwortprüfung, abhängig von den jüngsten Fehlversuchen DIESES Kontos.
    /// FALLE: der Auth-Rate-Limiter partitioniert nur nach IP — über IP-Rotation/Botnetz ist die
    /// Rate pro KONTO sonst unbegrenzt, und Online-Raten wird allein durch BCrypt nicht teuer genug.
    /// Bewusst Verzögerung statt Kontosperre: eine Sperre wäre ein Fremd-DoS („ich sperre dich aus"),
    /// die Verzögerung trifft praktisch nur den, der massenhaft rät.</summary>
    internal static TimeSpan LoginThrottleDelay(int recentFailures)
    {
        if (recentFailures <= FreeLoginAttempts) return TimeSpan.Zero;
        var steps = Math.Min(recentFailures - FreeLoginAttempts, 5);   // 250 ms … 4 s
        return TimeSpan.FromMilliseconds(250 * Math.Pow(2, steps - 1));
    }

    private static string LoginFailureKey(string loginName) => "login-fail:" + loginName.Trim().ToLowerInvariant();

    private static void RegisterLoginFailure(string key) =>
        LoginFailures.Set(key, (LoginFailures.Get<int?>(key) ?? 0) + 1,
            new MemoryCacheEntryOptions { SlidingExpiration = LoginFailureWindow });

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        // Reservierte Anonymisierungs-Platzhalter: verhindert, dass jemand „deleted_user_{id}"
        // oder eine „…@rct.invalid"-Adresse vorregistriert und damit später die DSGVO-Löschung
        // genau dieses Kontos blockiert (Unique-Index-Kollision, Review-Finding).
        if (IsReservedIdentity(dto.Username, dto.Email))
            throw new InvalidOperationException("This username or email is reserved.");

        var username = dto.Username ?? string.Empty;

        // E-Mail ist bei RCT PFLICHT: normalisieren (lowercase) und als non-null behandeln.
        var email = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (email.Length == 0)
            throw new InvalidOperationException("Email is required.");

        // Case-insensitiv prüfen (passend zur case-insensitiven DB-Collation): sonst könnte z. B.
        // "admin" trotz vorhandenem "Admin" die Vorabprüfung passieren und erst am Unique-Index als
        // 500 statt 409 scheitern. E-Mail wird normalisiert gespeichert → exakter Vergleich genügt.
        if (await _db.AppUsers.AnyAsync(u => u.Username.ToLower() == username.ToLower()))
            throw new InvalidOperationException("Username or email already in use.");
        if (await _db.AppUsers.AnyAsync(u => u.Email == email))
            throw new InvalidOperationException("Username or email already in use.");

        var user = new AppUser
        {
            Username = username,
            Email = email,
            PasswordHash = HashPassword(dto.Password),
            SecurityStamp = NewSecurityStamp()
        };

        _db.AppUsers.Add(user);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Race/Kollision am Unique-Index (gleichzeitige Registrierung oder Casing-Kollision)
            // -> sauberer Conflict (409) statt unbehandeltem 500. NUR echte Duplikat-Fehler: ein
            // transienter DB-Fehler (Deadlock/Timeout/Verbindungsabriss) hieße sonst fälschlich
            // "already exists" — der User hielte den Namen für vergeben, obwohl ein Retry genügte.
            throw new InvalidOperationException("Username or email already exists.");
        }

        return new AuthResponseDto
        {
            Token = GenerateJwt(user),
            Username = user.Username,
            UserId = user.Id,
            IsAdmin = user.IsAdmin
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var loginName = dto.Username ?? string.Empty;

        // Konto-bezogene Bremse VOR jeder Prüfung anwenden (nicht erst im Fehlerfall) — sonst
        // verrät die Antwortzeit, ob das Passwort stimmte bzw. ob es das Konto überhaupt gibt.
        var failureKey = LoginFailureKey(loginName);
        var delay = LoginThrottleDelay(LoginFailures.Get<int?>(failureKey) ?? 0);
        if (delay > TimeSpan.Zero) await Task.Delay(delay);

        // Login per Benutzername ODER E-Mail: RCT verlangt die E-Mail bei der Registrierung
        // ausdrücklich „für den Login" (Hint auf der Registrierseite) — also muss sie hier auch
        // funktionieren. E-Mail ist lowercase-normalisiert gespeichert → normalisiert vergleichen.
        var normalized = loginName.Trim().ToLower();
        var user = await _db.AppUsers
            .FirstOrDefaultAsync(u => u.Username.ToLower() == normalized || u.Email == normalized);

        // Konstante Antwortzeit unabhängig von der Existenz des Users: immer einen BCrypt-Verify
        // gegen einen Dummy-Hash ausführen, statt ihn per || zu überspringen (verhindert
        // Username-Enumeration über Timing).
        var hash = user?.PasswordHash ?? DummyHash;
        var passwordOk = BCrypt.Net.BCrypt.Verify(dto.Password, hash);
        // Gelöschte/anonymisierte Accounts können sich nicht mehr einloggen (gleiche Antwort wie
        // ein falsches Passwort, damit der Zustand nicht ableitbar ist).
        if (user == null || !passwordOk || user.DeletedAt != null)
        {
            RegisterLoginFailure(failureKey);
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        LoginFailures.Remove(failureKey);   // erfolgreicher Login setzt die Bremse zurück
        // Auth-Cache verwerfen: nach einem Passwort-Reset kann er noch den ALTEN Stamp halten —
        // das frisch ausgestellte Token würde sonst bis zu 60 s lang abgelehnt (401 → Auto-Logout).
        AuthUserValidation.Invalidate(_cache, user.Id);

        // Lazy-Backfill: Alt-User ohne Security-Stamp bekommen beim ersten Login einen — damit ihre
        // ab jetzt ausgegebenen Tokens den Stempel tragen und eine spätere Passwortänderung sie
        // wirklich invalidiert (statt für immer grandfathered zu bleiben).
        if (user.SecurityStamp == null)
        {
            user.SecurityStamp = NewSecurityStamp();
            await _db.SaveChangesAsync();
        }

        return new AuthResponseDto
        {
            Token = GenerateJwt(user),
            Username = user.Username,
            UserId = user.Id,
            IsAdmin = user.IsAdmin
        };
    }

    public async Task<AuthResponseDto> ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        var user = await _db.AppUsers.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        // Neues Passwort + Stamp-Rotation → alle bisherigen JWTs (alter sstamp-Claim) werden ungültig.
        SetPassword(user, dto.NewPassword);
        await _db.SaveChangesAsync();

        // Cache-Eintrag mit dem ALTEN Stamp verwerfen — sonst würde (a) das alte Token bis zu
        // 60 s weiter validieren und (b) das gleich ausgestellte NEUE Token gegen den gecachten
        // alten Stamp abgelehnt (Review-Finding: „neues Passwort geht nicht" direkt nach Wechsel).
        AuthUserValidation.Invalidate(_cache, user.Id);

        // FRISCHES Token mit dem neuen Stamp zurückgeben: der Aufrufer bleibt wirklich eingeloggt
        // (vorher flog er nach Ablauf des Caches still raus, obwohl die UI „bleibt gültig" versprach).
        return new AuthResponseDto
        {
            Token = GenerateJwt(user),
            Username = user.Username,
            UserId = user.Id,
            IsAdmin = user.IsAdmin
        };
    }

    /// <summary>Reservierte Identitäten der Konto-Anonymisierung (siehe ProfileService.DeleteAccountAsync):
    /// Benutzername „deleted_user_&lt;zahl&gt;" und Adressen unter „@rct.invalid" darf niemand belegen.</summary>
    internal static bool IsReservedIdentity(string? username, string? email)
    {
        if (username != null && System.Text.RegularExpressions.Regex.IsMatch(username.Trim(), @"^deleted_user_\d+$", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            return true;
        return email != null && email.Trim().EndsWith("@rct.invalid", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Erzeugt einen frischen, kompakten Security-Stamp (Basis für die Token-Invalidierung).</summary>
    public static string NewSecurityStamp() => Guid.NewGuid().ToString("N");

    /// <summary>Ist die <see cref="DbUpdateException"/> eine Unique-Index-Verletzung (Duplikat)?
    /// Primär strukturiert über den MariaDB-/MySQL-Fehlercode 1062; Nachrichts-Fallback deckt
    /// andere Provider (z. B. die InMemory-Test-DB) ab. Alles andere (Deadlock, Timeout,
    /// Verbindungsabriss) ist KEIN Duplikat und darf nicht als „already exists" maskiert werden.</summary>
    internal static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is MySqlConnector.MySqlException { ErrorCode: MySqlConnector.MySqlErrorCode.DuplicateKeyEntry }
        || (ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) ?? false)
        || (ex.InnerException?.Message.Contains("unique", StringComparison.OrdinalIgnoreCase) ?? false)
        || ex.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase);

    /// <summary>Signiertes JWT (HMAC-SHA256) mit den Claims sub=UserId, unique_name=Username,
    /// role=Admin (falls Admin) und sstamp=SecurityStamp (falls gesetzt → Token-Invalidierung bei
    /// PW-Änderung). Issuer/Audience/Key aus der Konfiguration; Laufzeit ~30 Tage.</summary>
    private string GenerateJwt(AppUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured")));

        // userId als ClaimTypes.NameIdentifier (RookHubs erprobtes Muster) — BaseApiController.GetUserId()
        // und der OnTokenValidated-Handler lesen genau diesen Typ; so hängt die Auth nicht am
        // Inbound-Claim-Mapping (sub→NameIdentifier), das sich pro Setup ändern kann.
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        };

        // Admin-Rolle als Standard-Rollen-Claim → BaseApiController.IsAdmin (User.IsInRole("Admin")).
        if (user.IsAdmin)
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));

        // Security-Stamp als Claim mitgeben (sofern gesetzt) → wird bei jedem Request gegen die DB
        // geprüft; nach Passwort-Änderung passt er nicht mehr → Token ungültig.
        if (user.SecurityStamp != null)
            claims.Add(new Claim("sstamp", user.SecurityStamp));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            // JWTs sind stateless und werden nur über DeletedAt + SecurityStamp invalidiert — ein
            // abgegriffenes Token bliebe sonst unnötig lange gültig, daher 30 Tage.
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
