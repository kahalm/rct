using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Rct.Api.Data;
using Rct.Api.Services;
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Serilog — Konsole only (kein ES-Sink, keine Environment-Enricher im RCT-Stack).
    builder.Host.UseSerilog((context, services, configuration) =>
    {
        configuration
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .WriteTo.Console();
    });

    // Database
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString),
            // Transiente DB-Fehler (z. B. kurzer Verbindungsverlust beim MariaDB-Neustart/Recreate)
            // automatisch wiederholen, statt Requests hart fehlschlagen zu lassen.
            mySql => mySql.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null)));

    // JWT Authentication
    var jwtKey = builder.Configuration["Jwt:Key"]
        ?? throw new InvalidOperationException("JWT key not configured");
    if (Encoding.UTF8.GetBytes(jwtKey).Length < 32)
        throw new InvalidOperationException("JWT key must be at least 32 bytes for HMAC-SHA256");
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = "Bearer";
        options.DefaultChallengeScheme = "Bearer";
    })
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            // Standard-Toleranz ist 5 min — auf 1 min straffen, damit abgelaufene Tokens
            // (insb. nach Logout/Passwortwechsel) nicht unnötig lange akzeptiert werden.
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        // Gelöschte Konten dürfen ihr noch gültiges JWT nicht weiterverwenden; nach
        // Passwort-Änderung passt der sstamp-Claim nicht mehr → Token wird abgelehnt.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var idStr = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(idStr, out var uid)) return;
                var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var cache = ctx.HttpContext.RequestServices.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>();
                var stamp = ctx.Principal?.FindFirstValue("sstamp");
                if (!await AuthUserValidation.IsTokenValidAsync(db, cache, uid, stamp, ctx.HttpContext.RequestAborted))
                    ctx.Fail("User account is deleted or the token has been invalidated.");
            }
        };
    });

    // Services
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<CalculationService>();

    // CORS — nur lokale Dev-Origins; KEIN AllowCredentials (Auth strikt über den Bearer-Header).
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(
                    "http://localhost:4200",
                    "http://localhost:8085")
                .AllowAnyMethod()
                .AllowAnyHeader();
        });
    });

    // Hinter nginx (Docker) kommt sonst nur die Proxy-IP an → X-Forwarded-For NUR von privaten
    // Peers vertrauen (nicht öffentlich, sonst IP-Spoofing des Rate-Limiter-Partition-Keys).
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = null;
        options.KnownProxies.Clear();
        options.KnownIPNetworks.Clear();
        options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("10.0.0.0/8"));
        options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("172.16.0.0/12"));
        options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("192.168.0.0/16"));
    });

    // Rate limiting: globaler Per-IP-Limiter + strengere Per-IP-Policy "auth" für Login/Register.
    builder.Services.AddRateLimiter(options =>
    {
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                }));
        // Die benannte Policy MUSS pro Client-IP partitionieren (wie der GlobalLimiter), sonst
        // wäre sie ein EINZIGER globaler Bucket (Login/Register-DoS + kein Pro-IP-Brute-Force-Schutz).
        static RateLimitPartition<string> PerIpFixedWindow(HttpContext ctx, int permit) =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = permit,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                });
        options.AddPolicy("auth", ctx => PerIpFixedWindow(ctx, 10));
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    });

    builder.Services.AddMemoryCache();
    builder.Services.AddControllers()
        .AddJsonOptions(opts =>
            opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "RCT API", Version = "v1" });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });
        // Microsoft.OpenApi 2.0 (Swashbuckle 10): AddSecurityRequirement nimmt eine Factory
        // (OpenApiDocument → Requirement); OpenApiSecuritySchemeReference verweist auf "Bearer".
        c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecuritySchemeReference("Bearer", doc),
                new List<string>()
            }
        });
    });

    var app = builder.Build();

    // Muss VOR UseRateLimiter laufen, damit RemoteIpAddress die echte Client-IP ist.
    app.UseForwardedHeaders();

    // Auto-migrate on startup + seed the trial calculation book.
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
        await Rct.Api.Services.RctSeeder.SeedAsync(db);
        // Admin-Konto aus ADMIN_USERNAME/ADMIN_PASSWORD(/ADMIN_EMAIL) — nur wenn es noch nicht
        // existiert; Platzhalter 'change_me' wird verweigert (siehe AdminSeeder).
        await Rct.Api.Services.AdminSeeder.SeedAsync(db, app.Configuration);
    }

    // Global exception handler
    app.UseExceptionHandler(error =>
    {
        error.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(new
            {
                type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
                title = "An unexpected error occurred.",
                status = 500
            });
        });
    });

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseCors();
    app.UseAuthentication();
    app.UseRateLimiter();
    app.UseAuthorization();
    app.MapControllers();

    app.MapGet("/health", () => Results.Ok("ok"));

    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}

public partial class Program { }
