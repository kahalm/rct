import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Profile {
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

/**
 * Eigenes Profil (GET/PUT /api/profile) — bewusst schlank: RCT kennt nur die
 * Konto-Basisdaten (Benutzername + E-Mail), kein RookHub-Schachprofil.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly apiUrl = '/api/profile';

  constructor(private http: HttpClient) {}

  get(): Observable<Profile> {
    return this.http.get<Profile>(this.apiUrl);
  }

  /** PUT liefert das aktualisierte Profil zurück; 409 { message } bei Duplikat/Leer-E-Mail. */
  update(dto: { username?: string; email?: string }): Observable<Profile> {
    return this.http.put<Profile>(this.apiUrl, dto);
  }
}
