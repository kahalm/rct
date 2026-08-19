using Microsoft.EntityFrameworkCore;
using Rct.Api.Models;

namespace Rct.Api.Data;

/// <summary>RCT-Datenkontext: nur Auth (AppUser) + Kalkulations-Trial (Book/BookPuzzle/CalculationTree).</summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookPuzzle> BookPuzzles => Set<BookPuzzle>();
    public DbSet<CalculationTree> CalculationTrees => Set<CalculationTree>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.HasIndex(u => u.Email).IsUnique();   // E-Mail ist Pflicht → genau ein Konto je Adresse
        });

        modelBuilder.Entity<Book>(e =>
        {
            e.HasIndex(b => b.FileName).IsUnique();
        });

        modelBuilder.Entity<BookPuzzle>(e =>
        {
            e.HasIndex(bp => bp.BookId);
            e.HasOne(bp => bp.Book)
             .WithMany(b => b.Puzzles)
             .HasForeignKey(bp => bp.BookId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CalculationTree>(e =>
        {
            e.HasOne(ct => ct.User).WithMany().HasForeignKey(ct => ct.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ct => ct.Book).WithMany().HasForeignKey(ct => ct.BookId).OnDelete(DeleteBehavior.Cascade);
            // BookPuzzle hängt via Book schon am Cascade → zweiter Cascade-Pfad wäre in MySQL ein Fehler ⇒ Restrict.
            e.HasOne(ct => ct.BookPuzzle).WithMany().HasForeignKey(ct => ct.BookPuzzleId).OnDelete(DeleteBehavior.Restrict);
            e.Property(ct => ct.TreeJson).HasColumnType("LONGTEXT");
            e.Property(ct => ct.ChosenSan).HasMaxLength(20);
            e.Property(ct => ct.ChosenUci).HasMaxLength(10);
            e.Property(ct => ct.SecondsSpent).HasDefaultValue(0);
            e.Property(ct => ct.SecondsToken).HasMaxLength(64);
            e.Property(ct => ct.SecondsTokenApplied).HasDefaultValue(0);
            e.HasIndex(ct => new { ct.UserId, ct.BookPuzzleId }).IsUnique();
            e.HasIndex(ct => new { ct.UserId, ct.BookId });
        });
    }
}
