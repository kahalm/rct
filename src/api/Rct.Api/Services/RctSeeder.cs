using Microsoft.EntityFrameworkCore;
using Rct.Api.Data;
using Rct.Api.Models;

namespace Rct.Api.Services;

/// <summary>
/// Legt beim Start (idempotent) das feste Kalkulations-Trial-Buch samt der sechs Trainings-Stellungen
/// an. Die Stellungen sind reine FENs (keine Lösung) und werden im Kalkulationsmodus durchgerechnet.
/// </summary>
public static class RctSeeder
{
    /// <summary>Eindeutiger Dateiname des Trial-Buchs (Seed-Schlüssel).</summary>
    public const string TrialFileName = "rct-trial";
    public const string TrialDisplayName = "Real Chess Training — Trial";

    private static readonly string[] TrialFens =
    [
        "r1b2rk1/pppq1ppp/1bn5/8/3N4/4BB2/PPPQ1PPP/R3K2R w KQ - 0 1",
        "2r2rk1/1b1qbppp/p3p3/1p1pP3/3P1N2/P3PNP1/1P1Q3P/2R2RK1 b - - 0 1",
        "7r/k1p1Npp1/p1P4p/4p3/4q3/1R6/PPP3P1/3R2K1 w - - 0 1",
        "2rr3k/4q2p/2npb3/p3pp2/1pP4P/1P1Q2P1/P1N2PBK/3R1R2 w - - 0 1",
        "rn1qkb1r/ppp1pppp/8/3n1b2/8/4PN2/PP1P1PPP/RNBQKB1R w KQkq - 0 1",
        "2r2rk1/2qnbppp/p2p1n2/1p2pP2/4P3/PNNQB3/1PP3PP/1K1R3R w - - 0 1",
    ];

    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        var book = await db.Books.Include(b => b.Puzzles)
            .FirstOrDefaultAsync(b => b.FileName == TrialFileName, ct);
        if (book is null)
        {
            book = new Book { FileName = TrialFileName, DisplayName = TrialDisplayName, IsCalculation = true };
            db.Books.Add(book);
            await db.SaveChangesAsync(ct);
        }

        for (var i = 0; i < TrialFens.Length; i++)
        {
            var round = (i + 1).ToString();
            if (book.Puzzles.Any(p => p.Round == round)) continue;   // idempotent
            db.BookPuzzles.Add(new BookPuzzle
            {
                BookId = book.Id,
                Round = round,
                Fen = TrialFens[i],
                Moves = string.Empty,      // reine FEN-Stellung, keine Lösung
                StartPly = 0,
                Title = $"Position {round}",
            });
        }
        await db.SaveChangesAsync(ct);
    }
}
