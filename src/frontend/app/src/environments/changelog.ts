// Single-Source der App-Version (Konvention aus RookHub übernommen: environment.ts re-exportiert
// APP_VERSION von hier; im Changelog nur typografische Anführungszeichen „…" verwenden).
export const APP_VERSION = '0.1.0';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { en: string; de: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  { version: '0.1.0', date: '2026-08-19', changes: [
    { en: 'First version: registration (email required), login, and the Real Chess Training trial — six positions in the calculation trainer with the breakdown video as review.', de: 'Erste Version: Registrierung (E-Mail Pflicht), Login und das Real-Chess-Training-Trial — sechs Stellungen im Kalkulations-Trainer mit dem Breakdown-Video als Review.' },
  ] },
];
