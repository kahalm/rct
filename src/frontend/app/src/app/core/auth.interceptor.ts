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
      // /api/auth/login: ein fehlgeschlagener Login-VERSUCH darf eine bestehende Session
      // nie zerstören. /api/profile: PUT verlangt bei E-Mail-Änderung das aktuelle Passwort.
      // Die fachlichen 401s kommen IMMER aus unseren Controllern mit { message } im Body;
      // ein 401 der Auth-MIDDLEWARE (Token abgelaufen/invalidiert) hat einen LEEREN Body —
      // der bedeutet auch auf diesen URLs „Session tot" und muss ausloggen, sonst hängt
      // der User in einer Sackgasse, in der kein Retry je gelingen kann.
      const businessUrl = req.url === '/api/auth/login'
        || req.url === '/api/auth/change-password'
        || req.url === '/api/auth/reset-password'
        || req.url === '/api/profile'
        || req.url === '/api/profile/account';
      const business401 = businessUrl && !!(err?.error && err.error.message);
      if (err.status === 401 && !business401 && authService.isLoggedIn) {
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
