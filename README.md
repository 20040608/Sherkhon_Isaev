# Sherkhon Portfolio (Frontend + Backend in One App)

This project runs frontend and backend together in a single Node server.

## Fastest Run (Windows)

1. Double-click `start-local.bat`
2. Browser opens automatically at `http://localhost:3000`

## CLI Run

```bash
npm run local
```

What `npm run local` does:
- installs dependencies if missing
- creates `.env` from `.env.example` if missing
- starts backend + frontend together
- opens browser automatically

## Important

- Do not open `index.html` directly with `file://`.
- Use `http://localhost:3000` (or your deployed URL).
- Contact form sends through backend API: `/api/contact`.

## SMTP Setup (required for real emails)

Open `.env` and set:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS` (Gmail App Password)
- `SMTP_FROM` (optional, defaults to `SMTP_USER`)
- `SMTP_TO`

Without SMTP values, backend runs but contact send returns configuration error.
