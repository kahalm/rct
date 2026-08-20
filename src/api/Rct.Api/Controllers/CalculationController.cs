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

    /// <summary>Kapitel-Authoring (NUR Admin): FEN-Memo (RookHub-Format: eine Stellung je Zeile,
    /// optional „| Kommentar" bzw. „{Kommentar}") als neues/erweitertes Kapitel anfügen. Antwortet
    /// mit der Zahl der angelegten Stellungen und den nicht verwertbaren Zeilen (je Grund).</summary>
    [HttpPost("books/{bookId}/chapters")]
    public async Task<ActionResult<AddChapterResultDto>> AddChapter(int bookId, [FromBody] AddChapterDto dto,
        CancellationToken ct)
    {
        if (!IsAdmin) return Forbid();
        var parsed = FenListParser.Parse(dto.FenList);
        var added = 0;
        try
        {
            if (parsed.Positions.Count > 0)
                added = await _service.AddChapterPositionsAsync(bookId, dto.Chapter, parsed.Positions,
                    dto.ReleaseAt, dto.TesterReleaseAt, ct);
            else if (parsed.Errors.Count == 0)
                return BadRequest(new { message = "No positions found." });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        return Ok(new AddChapterResultDto { Added = added, Errors = parsed.Errors });
    }

    /// <summary>Kapitel-Uebersicht (NUR Admin): Name, Umfang, Freischalt-Termine.</summary>
    [HttpGet("books/{bookId}/chapters")]
    public async Task<ActionResult<List<ChapterInfoDto>>> GetChapters(int bookId, CancellationToken ct)
    {
        if (!IsAdmin) return Forbid();
        try { return Ok(await _service.GetChaptersAsync(bookId, ct)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>Freischalt-Termine eines Kapitels setzen (NUR Admin). Kapitelname im Body,
    /// nicht in der Route — Namen duerfen Sonderzeichen (auch „/") enthalten.
    /// Beide Termine null = Kapitel sofort fuer alle Freigeschalteten sichtbar.</summary>
    [HttpPut("books/{bookId}/chapters/release")]
    public async Task<IActionResult> SetChapterRelease(int bookId, [FromBody] SetChapterReleaseDto dto,
        CancellationToken ct)
    {
        if (!IsAdmin) return Forbid();
        try
        {
            await _service.SetChapterReleaseAsync(bookId, dto.Chapter, dto.ReleaseAt, dto.TesterReleaseAt, ct);
            return NoContent();
        }
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
