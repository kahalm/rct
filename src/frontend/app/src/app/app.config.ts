import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection, LOCALE_ID, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { ChunkReloadErrorHandler } from './core/chunk-reload.error-handler';
import { resolveStartupLocale } from './core/locale.service';

// Locale-Daten für Deutsch registrieren (en ist eingebaut), damit Date-/Zahlen-Pipes der
// gewählten Sprache folgen. RCT spricht en/de.

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Deploy-Festigkeit: fehlgeschlagener Lazy-Chunk-Load (alte offene Tabs) → einmaliger Reload.
    { provide: ErrorHandler, useClass: ChunkReloadErrorHandler },
    { provide: LOCALE_ID, useFactory: resolveStartupLocale },
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    // i18n (ngx-translate): JSON aus public/i18n/*.json, Fallback Englisch.
    provideTranslateService({
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' })
    }),
    // Service Worker (nur im Prod-Build aktiv): App-Shell + i18n + Assets offline-fähig,
    // PWA-installierbar; /api wird bewusst NICHT gecacht (siehe ngsw-config.json).
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ]
};
