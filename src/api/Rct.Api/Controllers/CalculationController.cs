using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rct.Api.DTOs;
using Rct.Api.Services;

namespace Rct.Api.Controllers;

/// <summary>
/// Kalkulations-Modus über Buch-Stellungen: der Nutzer sieht nur die Stellung (FEN + optionaler
/// Kommentar) und legt am eingefrorenen Brett seinen eigenen Analysebaum an. Es gibt hier keine
/// Lösung — die gespeicherte Zugfolge einer Buchlinie (<c>BookPuzzle.Moves</c>) wird von diesen
/// Endpoints NIEMALS ausgeliefert (siehe <see cref="CalculationService"/>); höchstens der Vorlauf
/// bis zum Trainingsstart (<c>SetupMoves</c>, Halbzüge 0..StartPly).
///
/// <para>Zugriff: jeder ANGEMELDETE Nutzer darf das Kalkulations-Testbuch lesen — es gibt kein
/// Kurs-/Gruppen-/Öffentlich-Gating. Einzige Prüfung ist, dass das Buch existiert UND ein
/// Kalkulationsbuch ist (<c>Book.IsCalculation</c>); sonst <see cref="KeyNotFoundException"/> → 404.
/// Es gibt hier bewusst KEINE anonymen/öffentlichen Varianten.</para>
/// </summary>
[ApiController]
[Route("api/calculations")]
[Authorize]
public class CalculationController : BaseApiController
{
    private readonly CalculationService _service;

    public CalculationController(CalculationService service) => _service = service;

    /// <summary>Kopf + leichte Stellungsliste eines Buchs (ohne FEN/Kommentar/Züge), inkl.
    /// „schon bearbeitet"-Markierung je Stellung.</summary>
    [HttpGet("books/{bookId}")]
    public async Task<ActionResult<CalcBookDto>> GetBook(int bookId, CancellationToken ct)
    {
        try { return Ok(await _service.GetBookAsync(GetUserId(), bookId, IsAdmin, ct)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>Eine Stellung (FEN, SetupMoves, Kommentar) inkl. eigenem Analysebaum + Trainings-Werten.</summary>
    [HttpGet("positions/{bookPuzzleId}")]
    public async Task<ActionResult<CalcPositionDto>> GetPosition(int bookPuzzleId, CancellationToken ct)
    {
        try { return Ok(await _service.GetPositionAsync(GetUserId(), bookPuzzleId, IsAdmin, ct)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>Eigenen Analysebaum zu einer Stellung speichern (Upsert); die drei Trainings-Werte
    /// (Festlegung/Rechenzeit/Bewertungsstufe) dürfen im selben Aufruf mitkommen.</summary>
    [HttpPut("positions/{bookPuzzleId}")]
    public async Task<ActionResult<CalcPositionStateDto>> SaveTree(int bookPuzzleId, [FromBody] SaveCalcTreeDto dto,
        CancellationToken ct)
    {
        try { return Ok(await _service.SaveTreeAsync(GetUserId(), bookPuzzleId, dto, IsAdmin, ct)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>
    /// Nur die drei Trainings-Werte einer Stellung ändern — ohne den (u. U. großen) Baum erneut zu
    /// schicken: sich festlegen, Rechenzeit nachtragen (Delta, wird addiert), sich nach dem Prüfen
    /// der Lösung selbst bewerten. Absichtlich ein eigener Endpoint neben dem Baum-PUT, weil diese
    /// Aktionen unabhängig vom Baum passieren und ein Baum-PUT ohne Baum-Änderung sonst 256 KB
    /// JSON pro Klick übertragen würde.
    /// </summary>
    [HttpPatch("positions/{bookPuzzleId}")]
    public async Task<ActionResult<CalcPositionStateDto>> PatchMeta(int bookPuzzleId, [FromBody] PatchCalcMetaDto dto,
        CancellationToken ct)
    {
        try { return Ok(await _service.PatchMetaAsync(GetUserId(), bookPuzzleId, dto, IsAdmin, ct)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>Eigenen Analysebaum zu einer Stellung verwerfen (idempotent).</summary>
    [HttpDelete("positions/{bookPuzzleId}")]
    public async Task<IActionResult> DeleteTree(int bookPuzzleId, CancellationToken ct)
    {
        try { await _service.DeleteTreeAsync(GetUserId(), bookPuzzleId, IsAdmin, ct); return NoContent(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }
}
