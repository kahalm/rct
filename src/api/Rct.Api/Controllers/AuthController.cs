using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Rct.Api.DTOs;
using Rct.Api.Services;

namespace Rct.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : BaseApiController
{
    private readonly AuthService _authService;
    private readonly PasswordResetService _resetService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AuthService authService, PasswordResetService resetService,
        IServiceScopeFactory scopeFactory, ILogger<AuthController> logger)
    {
        _authService = authService;
        _resetService = resetService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        try
        {
            var result = await _authService.RegisterAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        try
        {
            var result = await _authService.LoginAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }
    }

    /// <summary>„Passwort vergessen", Schritt 1: Reset-Link anfordern. Antwortet IMMER neutral
    /// mit 200 — keine User-Enumeration ueber die Existenz der Adresse.</summary>
    [HttpPost("forgot-password")]
    public IActionResult ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        // Versand im HINTERGRUND: inline gewartet dauert der Request bei existierender Adresse
        // SMTP-lange (Sekunden), bei unbekannter Millisekunden — ein Timing-Oracle, das die
        // neutrale 200-Antwort aushebelt (Review-Finding). Eigener DI-Scope, weil der
        // Request-Scope (AppDbContext!) beim Antworten disposed wird.
        var email = dto.Email;
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var reset = scope.ServiceProvider.GetRequiredService<PasswordResetService>();
                await reset.RequestResetAsync(email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PasswordReset: background request failed");
            }
        });
        return Ok(new { message = "If the address exists, a reset link has been sent." });
    }

    /// <summary>„Passwort vergessen", Schritt 2: neues Passwort mit dem Token aus der Mail setzen.</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        try
        {
            await _resetService.ResetPasswordAsync(dto.Token, dto.NewPassword);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPut("change-password")]
    [Authorize]
    public async Task<ActionResult<AuthResponseDto>> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        try
        {
            var result = await _authService.ChangePasswordAsync(GetUserId(), dto);
            // Frisches Token (neuer sstamp) zurückgeben — der Client ersetzt sein gespeichertes
            // Token und bleibt nahtlos eingeloggt (Review-Finding: stiller Logout nach ≤60 s).
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { message = "Current password is incorrect." });
        }
    }
}
