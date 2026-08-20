// Single-Source der App-Version (Konvention aus RookHub übernommen: environment.ts re-exportiert
// APP_VERSION von hier; im Changelog nur typografische Anführungszeichen „…" verwenden).
export const APP_VERSION = '0.8.1';

export interface ChangelogEntry {
  version: string;
  date: string;
  // App ist English-only (seit 0.4.0) — de bleibt optional fuer die Alt-Eintraege.
  changes: { en: string; de?: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  { version: '0.8.1', date: '2026-08-20', changes: [
    { en: 'License cleanup for commercial use: the GPL piece sets (Classic/cburnett and Merida) and the AGPL board textures (wood, water, marble, metal, leather, maple) were removed. Chessnut (Apache 2.0) is the new default; all remaining sets are MIT, Apache 2.0 or CC0. Saved preferences pointing at removed options fall back automatically.' },
  ] },
  { version: '0.8.0', date: '2026-08-20', changes: [
    { en: 'New brand assets everywhere: app icon (PWA/Android incl. maskable and monochrome), favicon, toolbar mark, a hero image on the start page, a social preview card for shared links, and a branded header in password-reset emails.' },
  ] },
  { version: '0.7.3', date: '2026-08-20', changes: [
    { en: 'Chapters are now always ordered by release date — in the trainer, the chapter picker and the admin schedule table (chapters without a date keep their creation order and come first). The Training button follows the same order.' },
    { en: 'Admins get quick links to "Add chapter" and "Users" right on the start page.' },
  ] },
  { version: '0.7.2', date: '2026-08-20', changes: [
    { en: 'The guidelines popup now appears exactly once PER ACCOUNT (stored on the server) — previously it was per device: a second user on the same browser never saw it, and the same user saw it again on every new device. Reading the guidelines via the link or ? button also counts.' },
    { en: 'Course members no longer see the "Trial" menu item — the start page stays reachable via the logo.' },
  ] },
  { version: '0.7.1', date: '2026-08-20', changes: [
    { en: 'The Training button now reliably picks the most recently ADDED chapter (the server tracks it) — the chapter list order follows position numbers and could point at the wrong one.' },
  ] },
  { version: '0.7.0', date: '2026-08-20', changes: [
    { en: 'The fullscreen button in the trainer now takes the WHOLE training screen fullscreen (board, command line and your lines) — the RookHub-style app fullscreen with a floating exit button, instead of just the board.' },
    { en: 'Course members see a personal start page: "Thanks for joining" and a single Training button that jumps straight to the newest chapter.' },
    { en: 'The trial positions are now labeled "Trial" in the chapter picker (was "(no chapter)"), and the ? and menu buttons no longer overlap in the trainer top bar.' },
  ] },
  { version: '0.6.0', date: '2026-08-20', changes: [
    { en: 'The review section moved off the start page into the trainer: it now appears at the LAST position of each chapter — dimmed until every position in the chapter has a committed choice, then highlighted with the breakdown video.' },
    { en: 'Each chapter can carry its own review video: new URL field on the "Add chapter" page and in the chapter schedule table. The trial positions keep the fixed trial breakdown video.' },
    { en: 'Testers now automatically have course access — the tester toggle alone is enough.' },
  ] },
  { version: '0.5.0', date: '2026-08-20', changes: [
    { en: 'New start page: two clear paths — get the full Real Chess Training program (nextlevelchess.kit.com) or start the trial right here. The guidelines now appear as a one-time popup before your first trial start, and the ? button in the trainer (plus a link on the start page) reopens them anytime.' },
    { en: 'Chapters can be scheduled: each chapter gets an optional release date for everyone and an earlier one for testers. The admin "Users" page has a new tester toggle, and the "Add chapter" page lists all chapters with their schedule for editing.' },
  ] },
  { version: '0.4.0', date: '2026-08-20', changes: [
    { en: 'One unified top bar: in the calculation trainer the app navigation now floats on the command line (RookHub pattern) instead of stacking a second row above the board; the toolbar itself is decluttered — everything lives in one menu.' },
    { en: 'Course access control: the six trial positions stay open for every account, but the course chapters are only visible to users the admin has unlocked. New admin page "Users" lists all accounts with search, filter and an unlock toggle.' },
    { en: 'Chapter authoring moved to its own admin page (menu entry visible to admins only).' },
    { en: 'The app is English-only now; the language switcher is gone.' },
  ] },
  { version: '0.3.2', date: '2026-08-20', changes: [
    { en: 'Chapter authoring got smarter: comments in braces may now contain „|“, positions with impossible digit runs (like „44/…“) are rejected up front instead of failing later on the board, and skipped lines are listed with line number, reason and the original text.', de: 'Kapitel-Authoring verbessert: Kommentare in geschweiften Klammern dürfen jetzt „|“ enthalten, Stellungen mit unmöglichen Ziffernfolgen (etwa „44/…“) werden sofort abgelehnt statt später am Brett zu scheitern, und übersprungene Zeilen werden mit Zeilennummer, Grund und Originaltext aufgelistet.' },
    { en: 'Under the hood: the trial seeder no longer skips missing trial positions when chapters use the same round numbers, and long-expired password-reset tokens are cleaned up automatically.', de: 'Unter der Haube: Der Trial-Seeder überspringt fehlende Trial-Stellungen nicht mehr, wenn Kapitel dieselben Rundennummern verwenden, und längst abgelaufene Passwort-Reset-Tokens werden automatisch aufgeräumt.' },
  ] },
  { version: '0.3.1', date: '2026-08-20', changes: [
    { en: 'Dark mode is here — and it is the default. The toolbar toggle cycles between dark, system and light; your choice is remembered on the device.', de: 'Dunkelmodus ist da — und Standard. Der Toolbar-Schalter wechselt zwischen Dunkel, System und Hell; die Wahl wird auf dem Gerät gemerkt.' },
    { en: 'Security hardening from a full code review: changing your password keeps you signed in (fresh session token) while all other sessions end immediately; changing your email now requires your current password; password reset links are rate-limited per account and sent in the background.', de: 'Sicherheits-Härtung aus einem vollständigen Code-Review: Nach einer Passwort-Änderung bleibt man angemeldet (frisches Sitzungs-Token), alle anderen Sitzungen enden sofort; eine E-Mail-Änderung verlangt jetzt das aktuelle Passwort; Reset-Links sind pro Konto limitiert und werden im Hintergrund verschickt.' },
    { en: 'Many smaller fixes: consistent error messages, deleted accounts are fully locked out everywhere, and account deletion is faster.', de: 'Viele kleinere Korrekturen: einheitliche Fehlermeldungen, gelöschte Konten sind überall vollständig gesperrt, und die Konto-Löschung ist schneller.' },
  ] },
  { version: '0.3.0', date: '2026-08-20', changes: [
    { en: 'Profile page: change your name and email, change your password, and delete your account (with password confirmation; personal data is anonymized).', de: 'Profilseite: Name und E-Mail ändern, Passwort ändern und Konto löschen (mit Passwort-Bestätigung; persönliche Daten werden anonymisiert).' },
    { en: 'Forgot password: request a reset link by email and set a new password (link valid for 60 minutes, single use).', de: 'Passwort vergessen: Reset-Link per E-Mail anfordern und neues Passwort setzen (Link 60 Minuten gültig, einmalig).' },
    { en: 'Admins can add new chapters right on the trial page — one FEN per line, same memo format as RookHub, optional comment after „|“.', de: 'Admins können neue Kapitel direkt auf der Trial-Seite anlegen — eine FEN je Zeile, gleiches Memo-Format wie RookHub, optionaler Kommentar hinter „|“.' },
    { en: 'RCT is now an installable PWA (service worker, offline app shell) and there is an Android app build (TWA) via GitHub Action.', de: 'RCT ist jetzt eine installierbare PWA (Service Worker, Offline-App-Shell), und es gibt einen Android-App-Build (TWA) per GitHub-Action.' },
  ] },
  { version: '0.2.3', date: '2026-08-20', changes: [
    { en: 'Fixed the board (and all data loading) never appearing: Angular 22 no longer re-renders after HTTP responses unless views are explicitly marked — classic zone-based code silently freezes. RCT is now pinned to Angular 21.2 (the last version with classic zone change detection, which this codebase was designed for). The Noel chapters from RookHub are also available in the trial book now.', de: 'Behoben, dass das Brett (und jedes Nachladen) nie erschien: Angular 22 rendert nach HTTP-Antworten nicht mehr neu, solange Views nicht explizit markiert werden — klassischer Zone-Code friert still ein. RCT ist jetzt auf Angular 21.2 gepinnt (die letzte Version mit klassischer Zone-Change-Detection, für die dieser Code entworfen wurde). Außerdem sind die Noel-Kapitel aus RookHub jetzt im Trial-Buch verfügbar.' },
  ] },
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
