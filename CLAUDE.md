# Real Chess Training (RCT)

Eigenständiges Trainings-Portal für **Noel Studer** (Next Level Chess), Programm **„Real Chess Training"**.
Abgeleitet vom RookHub-Stack (`/home/kahalm/claude/rookhubstack/rookhub`), aber ein **neues, schlankes**
Projekt mit **genau einem Feature**: dem Kalkulations-Trial.

## Was es ist

1. **Registrierung mit E-Mail als Pflichtfeld** (bei RookHub ist E-Mail optional — hier NICHT) + Login.
   Auth (JWT) aus RookHub übernommen.
2. Nach dem Login: **nur ein „Trial"-Knopf**.
3. Trial öffnet die **„Real Chess Training Guidelines"** (der Erklärtext) und dann die 6 Test-Stellungen.
4. Die Stellungen laufen im **exakten RookHub-Kalkulationsmodus** (wie der Noel-Kurs): interaktives Brett
   ohne Lösung, Nutzer legt EINE Linie/Festlegung an, Trainingszeit läuft, Selbstbewertung danach.
   45-Minuten-Timer über alle Stellungen (Guidelines: „Hard stop").
5. **Review-Schritt am Ende: das Breakdown-Video** (YouTube).

## Stack (voller RookHub-Klon)

- Backend: **.NET 10** Minimal-hosting API + **EF Core (MySQL)** + JWT-Auth.
- Frontend: **Angular 21.2** (gepinnt! siehe ⚠️-Abschnitt) standalone + Material + **ngx-translate (de/en)** + chessground-Brett.
- **docker-compose** (db + api + frontend) + **CI** (GitHub Actions).
- Layout gespiegelt von RookHub: `src/api/Rct.Api`, `src/frontend/app`.

## Trial-Inhalt (fix)

Kalkulationsbuch „Real Chess Training — Trial" mit 6 Stellungen (IsCalculation, je eine Info-/Calc-Position):

```
r1b2rk1/pppq1ppp/1bn5/8/3N4/4BB2/PPPQ1PPP/R3K2R w KQ - 0 1
2r2rk1/1b1qbppp/p3p3/1p1pP3/3P1N2/P3PNP1/1P1Q3P/2R2RK1 b - - 0 1
7r/k1p1Npp1/p1P4p/4p3/4q3/1R6/PPP3P1/3R2K1 w - - 0 1
2rr3k/4q2p/2npb3/p3pp2/1pP4P/1P1Q2P1/P1N2PBK/3R1R2 w - - 0 1
rn1qkb1r/ppp1pppp/8/3n1b2/8/4PN2/PP1P1PPP/RNBQKB1R w KQkq - 0 1
2r2rk1/2qnbppp/p2p1n2/1p2pP2/4P3/PNNQB3/1PP3PP/1K1R3R w - - 0 1
```

Breakdown-Video: https://www.youtube.com/watch?v=EgDwm7AOLTg

## Guidelines-Text (Trial-Erklärseite)

> **The Goal:** Train your decision-making under pressure.
> **The Process:** 45-min timer; manage your time; commit to ONE move per puzzle (write it down as you'd
> play it); hard stop when the timer rings; review with the breakdown video afterwards.
> **The Mindset:** embrace the struggle (0 points is okay); push through the wall (commit to the least bad
> option); focus on the process, not the outcome; good enough, not perfect.
> **The Golden Rule:** exactly one choice per position, every single time.
> **Benefits:** confidence, time management, spotting tactics without hints, distinguishing key moments from
> „good enough", games feeling easier.

## Port-Herkunft (aus RookHub übernommen)

- Auth-Vertikale (AppUser, AuthService/Controller, JWT, Frontend auth.service/guard/interceptor,
  Login/Register) — **E-Mail als Pflicht** angepasst.
- Kalkulationsmodus-Vertikale (Book/BookPuzzle/CalculationTree/Grades, CalculationService/Controller +
  DTOs; Frontend CalculationComponent + Brett + calc-review) — auf „ein fixes Trial-Buch" reduziert
  (ohne Kurs-/Gruppen-/Chessable-/Serien-Kopplung).

Nicht übernommen: Repertoires, Turniere, Puzzles, Freunde, Endless, Kurse-allgemein, Chessable-Import,
Kalkulations-Serie/Scheduler, Benachrichtigungen, Offline/PWA — alles was nicht Auth oder Calc-Trial ist.

## ⚠️ Angular-Version: 21.2 ist PFLICHT (nicht upgraden!)

RCT ist bewusst auf **Angular 21.2.x gepinnt** — NICHT auf 22 heben, solange der Code nicht auf
Signals/markForCheck umgebaut ist. Grund (2026-08-20 hart erarbeitet): **Angular 22 rendert nach
HTTP-Antworten nicht mehr neu**, wenn Views nicht explizit markiert sind (Signals, AsyncPipe,
markForCheck, DOM-Events, impure Pipes). Der klassische Zone-Pfad (Feld-Mutation im subscribe →
onMicrotaskEmpty → globaler Tick → CheckAlways-Refresh) refresht in 22.1.x unmarkierte Views NICHT
mehr — selbst `provideZoneChangeDetection()` + zone.js ändern das nicht (in frischer `ng new`-App
reproduziert). Symptom hier: Brett/Trial luden nie („Spinner für immer"), Zustand war korrekt
gesetzt, nur die View blieb stehen; jeder Tastendruck holte alles nach (Event-Marks).
RookHub (master, 22.1) trägt dieselbe latente Bombe und lebt nur von TranslatePipe-Marks/Events.

## Build/Dev-Konventionen

- .NET 10 SDK in `~/.dotnet` (nicht im PATH): `export PATH="$HOME/.dotnet:$PATH"`; `dotnet ef` braucht
  `ConnectionStrings__DefaultConnection` als Env (DesignTimeDbContextFactory wirft sonst).
- Frontend: Node 24 (via `~/.local/bin`), `npx ng build` / `npx ng serve` (Proxy `/api`→`localhost:5080`).
- JWT: `Jwt__Key` ≥ 32 Bytes Pflicht (Fail-fast beim Start).
- CI: Push auf `main` → `:dev`-Images (ghcr.io/kahalm/rct-api|rct-frontend), Tag `v*` → `:latest`.
  Gate ist vorerst Build-only (kein Test-Projekt) — bei Einführung von Tests `test.yml` umstellen.
- Versionskonvention wie RookHub: `src/environments/changelog.ts` (APP_VERSION, nur typografische „…").

## Status

Milestones 1–3 committet (Backend-Rauchtest 11/11, ng build grün, Compose-Smoke-Test grün).
Remote: https://github.com/kahalm/rct (public, CI auf main). v0.2.0: AdminSeeder (ADMIN_* via
compose, 'change_me' verweigert, kein Re-Seed) + 45-Minuten-Hinweis im Trainer (einmalig je Buch,
localStorage-persistiert, kein Zwangs-Stopp). Kein Deploy — Hosting entscheidet der Betreiber.
