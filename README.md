# Real Chess Training (RCT)

Training portal for **Noel Studer's „Real Chess Training"** program: register (email required),
sign in, and take the trial — six positions in a calculation trainer (45-minute hard-stop format),
then review your thinking with the breakdown video.

## Stack

- **API**: .NET 10, EF Core (MySQL/MariaDB), JWT auth — `src/api/Rct.Api`
- **Frontend**: Angular 22 + Material + chessground, i18n en/de — `src/frontend/app`
- **Deploy**: docker compose (mariadb + api + nginx-frontend), CI via GitHub Actions
  (push to `main` → `:dev` images, tag `v*` → `:latest`)

## Run (docker)

```bash
cp .env.example .env   # fill in passwords + JWT_KEY (>= 32 bytes)
docker compose --env-file .env up --build -d
# frontend: http://localhost:8090   api: http://localhost:5080/health
```

The API auto-migrates the schema on startup and seeds the trial book (6 positions).

## Develop

```bash
# API (needs a MariaDB, see appsettings.Development.json)
cd src/api/Rct.Api && dotnet run

# Frontend (proxies /api to localhost:5080, see proxy.conf.json)
cd src/frontend/app && npm install && npx ng serve
```

## Origin

Ported from [RookHub](../rookhubstack/rookhub) — auth vertical + calculation-mode vertical,
trimmed to exactly one feature. See `CLAUDE.md` for the design and port notes.
