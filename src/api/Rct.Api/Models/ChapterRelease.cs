using System.ComponentModel.DataAnnotations;

namespace Rct.Api.Models;

/// <summary>
/// Freischalt-Termine eines Kurs-Kapitels (Kapitel selbst ist nur ein String an
/// <see cref="BookPuzzle.Chapter"/> — Metadaten leben hier, ein Eintrag je (Book, Chapter)).
///
/// Sichtbarkeits-Semantik (CalculationService):
/// - KEIN Eintrag → Kapitel sofort für alle Freigeschalteten sichtbar (Bestandsverhalten).
/// - Eintrag: sichtbar ab <see cref="ReleaseAt"/>; Tester (AppUser.IsTester) schon ab
///   <see cref="TesterReleaseAt"/>. Ein null-Termin heißt „nicht terminiert" — sind beide
///   null, ist das Kapitel (außer für Admins) unsichtbar.
/// Alle Zeitpunkte UTC.
/// </summary>
public class ChapterRelease
{
    public int Id { get; set; }

    public int BookId { get; set; }
    public Book? Book { get; set; }

    [Required, MaxLength(200)]
    public string Chapter { get; set; } = string.Empty;

    /// <summary>Ab wann die Allgemeinheit (alle mit CourseAccess) das Kapitel sieht.</summary>
    public DateTime? ReleaseAt { get; set; }

    /// <summary>Ab wann TESTER das Kapitel sehen (typisch früher als <see cref="ReleaseAt"/>).</summary>
    public DateTime? TesterReleaseAt { get; set; }
}
