using System.ComponentModel.DataAnnotations;

namespace Rct.Api.Models;

/// <summary>Eine Trainings-Stellung eines Buchs. Im Kalkulationsmodus eine reine FEN-Stellung
/// (<see cref="Moves"/> leer) zum Durchrechnen — die Lösung wird nicht gespeichert/ausgeliefert.</summary>
public class BookPuzzle
{
    public int Id { get; set; }

    public int BookId { get; set; }
    public Book? Book { get; set; }

    /// <summary>Reihenfolge-Schlüssel ("1".."6"); sortiert nach Länge, dann Wert, dann Id (numerisch).</summary>
    [Required, MaxLength(20)]
    public string Round { get; set; } = string.Empty;

    [Required]
    public string Fen { get; set; } = string.Empty;

    /// <summary>Bei einer reinen Kalkulations-Stellung LEER. Die Lösung verlässt den Server NIE;
    /// höchstens der Vorlauf bis <see cref="StartPly"/> (Setup) dürfte ausgeliefert werden.</summary>
    [Required]
    public string Moves { get; set; } = string.Empty;

    /// <summary>Halbzug-Index des Trainingsstarts (Setup 0..StartPly). 0 bei reinen FEN-Stellungen.</summary>
    public int StartPly { get; set; }

    [MaxLength(300)]
    public string? Title { get; set; }

    [MaxLength(200)]
    public string? Chapter { get; set; }

    /// <summary>Optionaler Erklär-/Einleitungskommentar (LONGTEXT).</summary>
    public string? Comment { get; set; }
}
