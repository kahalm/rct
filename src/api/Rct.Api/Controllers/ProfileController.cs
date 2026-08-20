using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rct.Api.DTOs;
using Rct.Api.Services;

namespace Rct.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : BaseApiController
{
    private readonly ProfileService _profileService;

    public ProfileController(ProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet("")]
    public async Task<ActionResult<ProfileDto>> Get()
    {
        return Ok(await _profileService.GetAsync(GetUserId()));
    }

    [HttpPut("")]
    public async Task<ActionResult<ProfileDto>> Update([FromBody] UpdateProfileDto dto)
    {
        try
        {
            return Ok(await _profileService.UpdateAsync(GetUserId(), dto));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            // E-Mail-Aenderung ohne korrektes Passwort (Besitznachweis fuer den Recovery-Kanal).
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>Konto loeschen (DSGVO-Anonymisierung) — verlangt das aktuelle Passwort.</summary>
    /// <summary>Guidelines als gesehen markieren (Einmal-Popup je Konto; idempotent).</summary>
    [HttpPut("guidelines-seen")]
    public async Task<IActionResult> MarkGuidelinesSeen()
    {
        await _profileService.MarkGuidelinesSeenAsync(GetUserId());
        return NoContent();
    }

    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDto dto)
    {
        try
        {
            await _profileService.DeleteAccountAsync(GetUserId(), dto.Password);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }
}
