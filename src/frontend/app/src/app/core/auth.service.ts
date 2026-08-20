import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthResponse {
  token: string;
  username: string;
  userId: number;
  isAdmin: boolean;
}

/**
 * Auth-Zustand (JWT in localStorage) — aus RookHub portiert und auf RCT reduziert:
 * kein Impersonation/RBAC/Offline/Discord/Anon-Claim; E-Mail ist bei der Registrierung PFLICHT.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private readonly storageKey = 'rct_user';
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router, private injector: Injector) {}

  get isLoggedIn(): boolean {
    return this.getValidUser() !== null;
  }

  get token(): string | null {
    return this.getValidUser()?.token ?? null;
  }

  get currentUser(): AuthResponse | null {
    return this.getValidUser();
  }

  get isAdmin(): boolean {
    return this.getValidUser()?.isAdmin ?? false;
  }

  /**
   * Liefert den aktuellen User, loggt aber bei abgelaufenem Token automatisch
   * aus — eine abgelaufene Session gilt damit sofort als ausgeloggt, nicht erst
   * nach dem naechsten 401 vom Server.
   */
  private getValidUser(): AuthResponse | null {
    const user = this.currentUserSubject.value;
    if (user && this.isTokenExpired(user.token)) {
      localStorage.removeItem(this.storageKey);
      this.currentUserSubject.next(null);
      return null;
    }
    return user;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return !!payload.exp && payload.exp * 1000 < Date.now();
    } catch {
      return true; // unparsebares Token -> als abgelaufen behandeln
    }
  }

  /** Registrieren — E-Mail ist bei RCT Pflicht (kein null wie bei RookHub). */
  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { username, email, password })
      .pipe(tap(res => this.storeUser(res)));
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(tap(res => this.storeUser(res)));
  }

  /** Passwort des eingeloggten Users ändern (aktuelles + neues Passwort). */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/change-password`, { currentPassword, newPassword });
  }

  /** „Passwort vergessen": Server verschickt ggf. einen Reset-Link, antwortet aber IMMER neutral 200. */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email });
  }

  /** Neues Passwort mit dem Einmal-Token aus der Reset-Mail setzen (401 bei ungültig/abgelaufen). */
  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  /** Eigenes Konto endgültig löschen (Passwort-Bestätigung); bei Erfolg wird sofort ausgeloggt. */
  deleteAccount(password: string): Observable<void> {
    return this.http.delete<void>('/api/profile/account', { body: { password } })
      .pipe(tap(() => this.logout()));
  }

  /**
   * Nach einer Profil-Änderung den Anzeigenamen im gespeicherten User nachziehen
   * (Toolbar zeigt sofort den neuen Namen). Token/Claims bleiben unverändert —
   * fürs LOGIN gilt der neue Name serverseitig ohnehin ab sofort.
   */
  updateStoredUsername(username: string): void {
    const user = this.currentUserSubject.value;
    if (!user) return;
    const updated = { ...user, username };
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
    this.currentUserSubject.next(updated);
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private storeUser(user: AuthResponse): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
    // Brett-Einstellungen vom Server nachziehen (überschreibt localStorage).
    import('./preferences.service').then(m => {
      this.injector.get(m.PreferencesService).loadFromServer();
    });
  }

  private getStoredUser(): AuthResponse | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;
      const user: AuthResponse = JSON.parse(stored);
      if (this.isTokenExpired(user.token)) {
        localStorage.removeItem(this.storageKey);
        return null;
      }
      return user;
    } catch {
      try { localStorage.removeItem(this.storageKey); } catch { }
      return null;
    }
  }
}
