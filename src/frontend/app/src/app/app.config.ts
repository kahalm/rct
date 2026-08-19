import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { resolveStartupLocale } from './core/locale.service';

// Locale-Daten für Deutsch registrieren (en ist eingebaut), damit Date-/Zahlen-Pipes der
// gewählten Sprache folgen. RCT spricht en/de.
registerLocaleData(localeDe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useFactory: resolveStartupLocale },
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    // i18n (ngx-translate): JSON aus public/i18n/*.json, Fallback Englisch.
    provideTranslateService({
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' })
    }),
  ]
};
