// Single-Source der App-Version (Konvention aus RookHub übernommen: environment.ts re-exportiert
// APP_VERSION von hier; im Changelog nur typografische Anführungszeichen „…" verwenden).
export const APP_VERSION = '0.2.2';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { en: string; de: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  { version: '0.2.2', date: '2026-08-19', changes: [
    { en: 'Sign-in now also works with your email address (the registration hint always promised that). The login field says „Username or email“.', de: 'Die Anmeldung funktioniert jetzt auch mit der E-Mail-Adresse (der Registrierungs-Hinweis hat das immer versprochen). Das Login-Feld heißt „Benutzername oder E-Mail“.' },
    { en: 'A tab that was still open across a deployment could silently fail to navigate (old module files no longer exist) — this looked like a failed login. The app now detects that and reloads itself once.', de: 'Ein über ein Deployment hinweg offener Tab konnte beim Navigieren still scheitern (alte Moduldateien existieren nicht mehr) — das sah wie ein fehlgeschlagener Login aus. Die App erkennt das jetzt und lädt sich einmal selbst neu.' },
  ] },
  { version: '0.2.1', date: '2026-08-19', changes: [
    { en: 'Fixed a text overflow on the registration page: the email hint could paint over the password field (Material reserves a single line for hints). The hint is shorter now and multi-line hints take up real space.', de: 'Textüberlauf auf der Registrierungsseite behoben: der E-Mail-Hinweis konnte über das Passwortfeld malen (Material reserviert für Hinweise nur eine Zeile). Der Hinweis ist jetzt kürzer, und mehrzeilige Hinweise nehmen echten Platz ein.' },
  ] },
  { version: '0.2.0', date: '2026-08-19', changes: [
    { en: 'The trial now reminds you of the 45-minute hard stop: once your active calculation time across all positions reaches 45 minutes, a one-time notice tells you to write down your final decision and stop — the trainer stays usable (no forced stop), as the guidelines make the hard stop a discipline rule.', de: 'Das Trial erinnert jetzt an den 45-Minuten-Schlussstrich: Erreicht deine aktive Rechenzeit über alle Stellungen 45 Minuten, weist ein einmaliger Hinweis darauf hin, die endgültige Entscheidung zu notieren und aufzuhören — der Trainer bleibt bedienbar (kein Zwangs-Stopp), denn laut Guidelines ist der Hard Stop eine Disziplin-Regel.' },
    { en: 'Operators can seed an admin account at startup via environment variables (ADMIN_USERNAME/ADMIN_PASSWORD/ADMIN_EMAIL); the placeholder password is refused and an existing account is never touched.', de: 'Betreiber können beim Start ein Admin-Konto über Umgebungsvariablen anlegen (ADMIN_USERNAME/ADMIN_PASSWORD/ADMIN_EMAIL); das Platzhalter-Passwort wird verweigert, ein bestehendes Konto nie angetastet.' },
  ] },
  { version: '0.1.0', date: '2026-08-19', changes: [
    { en: 'First version: registration (email required), login, and the Real Chess Training trial — six positions in the calculation trainer with the breakdown video as review.', de: 'Erste Version: Registrierung (E-Mail Pflicht), Login und das Real-Chess-Training-Trial — sechs Stellungen im Kalkulations-Trainer mit dem Breakdown-Video als Review.' },
  ] },
];
