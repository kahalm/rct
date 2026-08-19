import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Deploy-Festigkeit für offene Tabs: nach einem Deploy existieren die alten, hash-benannten
 * Lazy-Chunks nicht mehr — eine noch offene App-Instanz, die ein Modul nachladen will, bekommt
 * vom SPA-Fallback die index.html statt JS und die Navigation scheitert still (sah beim Nutzer
 * wie „Login geht nicht" aus). RookHub löst das über den Service Worker; RCT hat keinen, darum
 * hier der Standard-Weg: den Chunk-Ladefehler erkennen und die Seite EINMAL neu laden — der
 * frische index.html referenziert dann die neuen Chunks. Ein sessionStorage-Zeitstempel
 * verhindert eine Reload-Schleife, falls der Fehler eine andere Ursache hat.
 */
@Injectable()
export class ChunkReloadErrorHandler extends ErrorHandler {
  /** Frühestens alle 60 s neu laden — schützt vor einer Endlos-Schleife. */
  private static readonly ReloadCooldownMs = 60_000;
  private static readonly StorageKey = 'rct_chunk_reload_at';

  override handleError(error: unknown): void {
    if (this.isChunkLoadError(error) && this.mayReload()) {
      window.location.reload();
      return;
    }
    super.handleError(error);
  }

  /** Firefox: „error loading dynamically imported module"; Chrome: „Failed to fetch dynamically
   *  imported module"; Safari: „Importing a module script failed"; Webpack-Altlast: ChunkLoadError. */
  private isChunkLoadError(error: unknown): boolean {
    const msg = String((error as { message?: unknown })?.message ?? error ?? '');
    return /dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);
  }

  private mayReload(): boolean {
    try {
      const last = Number(sessionStorage.getItem(ChunkReloadErrorHandler.StorageKey) ?? 0);
      if (Date.now() - last < ChunkReloadErrorHandler.ReloadCooldownMs) return false;
      sessionStorage.setItem(ChunkReloadErrorHandler.StorageKey, String(Date.now()));
      return true;
    } catch {
      return false; // Storage nicht verfügbar → lieber Fehler loggen als Reload-Schleife riskieren
    }
  }
}
