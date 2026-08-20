import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  // Den Bearer NUR an unsere eigene API haengen. Alle App-Calls gehen relativ ueber
  // /api (nginx-Proxy); statische Assets/i18n brauchen ihn nicht. Verhindert zudem,
  // dass das JWT je an eine fremde Origin leakt, falls mal ein absoluter Drittanbieter-
  // URL ueber den HttpClient laeuft. Gleiche Gate-Logik wie der visitorInterceptor.
  const token = req.url.startsWith('/api') ? authService.token : null;

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError(err => {
      // 401 heißt normalerweise „Session abgelaufen" → ausloggen. Ausnahme: Endpoints,
      // bei denen 401 die FACHLICHE Antwort „falsches Passwort / ungültiges Token" ist —
      // dort bleibt die Session gültig und die Seite zeigt den Fehler selbst an.
      const password401 = req.url === '/api/auth/change-password'
        || req.url === '/api/auth/reset-password'
        || req.url === '/api/profile/account';
      if (err.status === 401 && !password401 && authService.isLoggedIn) {
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
