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
