import { Injectable } from '@angular/core';

const STORAGE_KEY = 'rct_course_access';

/**
 * Kurszugang des eingeloggten Users als app-weiter Zustand — die Toolbar blendet damit den
 * „Trial"-Menüpunkt für Freigeschaltete aus (User-Entscheid). Quelle der Wahrheit ist der
 * Server (CalcBookDto.courseAccess, bei jedem Buch-Load nachgezogen); localStorage dient nur
 * als Anzeige-Cache über Reloads, damit das Menü nicht flackert. null = noch unbekannt.
 */
@Injectable({ providedIn: 'root' })
export class CourseStateService {
  courseAccess: boolean | null = readCached();

  set(access: boolean): void {
    this.courseAccess = access;
    try { localStorage.setItem(STORAGE_KEY, access ? '1' : '0'); } catch {}
  }

  /** Beim Logout: der nächste User am selben Gerät startet mit unbekanntem Zustand. */
  clear(): void {
    this.courseAccess = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}

function readCached(): boolean | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}
