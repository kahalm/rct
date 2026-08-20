using Microsoft.EntityFrameworkCore;
using Rct.Api.Data;
using Rct.Api.Models;

namespace Rct.Api.Services;

public static class AdminSeeder
{
    /// <summary>
    /// Legt beim Start einen Admin-Account an — aber NUR, wenn noch kein User mit diesem
    /// Usernamen existiert. Ein vorhandener Account wird NICHT verändert (kein Passwort-Reset,
    /// kein Re-Promote bei jedem Boot): sonst könnte die Env-Konfiguration ein bestehendes Konto
    /// übernehmen, und ein selbst geändertes Admin-Passwort würde bei jedem Neustart überschrieben.
    /// (Muster aus RookHub; RCT-Anpassung: E-Mail ist Pflicht → ADMIN_EMAIL, Fallback synthetisch.)
    /// </summary>
    public static async Task SeedAsync(AppDbContext db, IConfiguration config)
    {
        var username = config["ADMIN_USERNAME"];
        var password = config["ADMIN_PASSWORD"];

        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            return;

        // Wohlbekannten Platzhalter aus .env.example nicht seeden — verhindert einen
        // versehentlichen Admin mit Default-Passwort.
        if (password == "change_me")
        {
            Console.Error.WriteLine(
                "[AdminSeeder] ADMIN_PASSWORD ist der Platzhalter 'change_me' — Admin wird NICHT angelegt. Bitte ein echtes Passwort setzen.");
            return;
        }

        // Vorhandenen Account niemals anfassen (kein Reset, kein Re-Promote).
        if (await db.AppUsers.AnyAsync(u => u.Username == username))
            return;

        // E-Mail ist bei RCT Pflicht + eindeutig: konfigurierte Adresse (lowercase wie bei der
        // Registrierung), sonst synthetischer Fallback. Kollidiert die Adresse mit einem
        // bestehenden Konto, lieber NICHT seeden statt zu werfen (Boot nicht blockieren).
        var email = (config["ADMIN_EMAIL"] ?? $"{username}@rct.local").Trim().ToLowerInvariant();
        if (await db.AppUsers.AnyAsync(u => u.Email == email))
        {
            Console.Error.WriteLine(
                $"[AdminSeeder] E-Mail '{email}' gehört schon einem Konto — Admin wird NICHT angelegt.");
            return;
        }

        db.AppUsers.Add(new AppUser
        {
            Username = username,
            Email = email,
            PasswordHash = AuthService.HashPassword(password),
            SecurityStamp = AuthService.NewSecurityStamp(),
            IsAdmin = true,
        });
        await db.SaveChangesAsync();
    }
}
