// Single-Source der App-Version (Konvention aus RookHub übernommen: environment.ts re-exportiert
// APP_VERSION von hier; im Changelog nur typografische Anführungszeichen „…" verwenden).
export const APP_VERSION = '0.2.0';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { en: string; de: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  { version: '0.2.0', date: '2026-08-19', changes: [
    { en: 'The trial now reminds you of the 45-minute hard stop: once your active calculation time across all positions reaches 45 minutes, a one-time notice tells you to write down your final decision and stop — the trainer stays usable (no forced stop), as the guidelines make the hard stop a discipline rule.', de: 'Das Trial erinnert jetzt an den 45-Minuten-Schlussstrich: Erreicht deine aktive Rechenzeit über alle Stellungen 45 Minuten, weist ein einmaliger Hinweis darauf hin, die endgültige Entscheidung zu notieren und aufzuhören — der Trainer bleibt bedienbar (kein Zwangs-Stopp), denn laut Guidelines ist der Hard Stop eine Disziplin-Regel.' },
    { en: 'Operators can seed an admin account at startup via environment variables (ADMIN_USERNAME/ADMIN_PASSWORD/ADMIN_EMAIL); the placeholder password is refused and an existing account is never touched.', de: 'Betreiber können beim Start ein Admin-Konto über Umgebungsvariablen anlegen (ADMIN_USERNAME/ADMIN_PASSWORD/ADMIN_EMAIL); das Platzhalter-Passwort wird verweigert, ein bestehendes Konto nie angetastet.' },
  ] },
  { version: '0.1.0', date: '2026-08-19', changes: [
    { en: 'First version: registration (email required), login, and the Real Chess Training trial — six positions in the calculation trainer with the breakdown video as review.', de: 'Erste Version: Registrierung (E-Mail Pflicht), Login und das Real-Chess-Training-Trial — sechs Stellungen im Kalkulations-Trainer mit dem Breakdown-Video als Review.' },
  ] },
];
