using System.ComponentModel.DataAnnotations;

namespace Rct.Api.Models;

/// <summary>Ein Stellungs-Buch. Bei RCT gibt es genau eines: das Kalkulations-Trial
/// (<see cref="IsCalculation"/> = true) mit den festen Trainings-Stellungen.</summary>
public class Book
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string FileName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Kalkulationsbuch: Stellungen werden zum Durchrechnen serviert; eine Lösung verlässt
    /// den Server NIE. Bei RCT immer true.</summary>
    public bool IsCalculation { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<BookPuzzle> Puzzles { get; set; } = new();
}
