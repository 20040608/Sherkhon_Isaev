# Production Deployment Guide

This project includes a static frontend + Node SMTP API in one service.

## Required Environment Variables

Set these in your hosting dashboard:

- `PORT=3000`
- `ALLOWED_ORIGINS=*`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=your_email@gmail.com`
- `SMTP_PASS=your_app_password`
- `SMTP_FROM=Sherkhon Portfolio <your_email@gmail.com>` (optional)
- `SMTP_TO=isayevsh04@gmail.com`

## Option A: Render

1. Push this repo to GitHub.
2. In Render: `New +` -> `Blueprint`.
3. Select your repo (it reads `render.yaml` automatically).
4. Add all required environment variables.
5. Deploy.
6. Verify health endpoint: `https://your-app.onrender.com/api/health`.

Domain + HTTPS on Render:
1. Open service -> `Settings` -> `Custom Domains`.
2. Add your domain (`portfolio.yourdomain.com`).
3. Add DNS record shown by Render (usually `CNAME`).
4. Wait for SSL to become active (Render issues HTTPS cert automatically).

## Option B: Railway

1. Push repo to GitHub.
2. In Railway: `New Project` -> `Deploy from GitHub`.
3. Select repo (uses `railway.json` + `npm start`).
4. Add all required environment variables.
5. Deploy and test `/api/health`.

Domain + HTTPS on Railway:
1. Open service -> `Settings` -> `Domains`.
2. Add custom domain.
3. Apply provided DNS record.
4. Railway enables TLS after DNS propagation.

## Option C: VPS (Docker + Caddy HTTPS)

1. On VPS, clone repo.
2. Build image:
   - `docker build -t sherkhon-portfolio .`
3. Run container:
   - `docker run -d --name sherkhon-portfolio --env-file .env -p 3000:3000 sherkhon-portfolio`
4. Install Caddy and create reverse proxy for your domain:

```caddyfile
yourdomain.com {
  reverse_proxy 127.0.0.1:3000
}
```

5. Reload Caddy:
   - `sudo systemctl reload caddy`

Caddy automatically provisions HTTPS certificates.

## Important Notes

- Do not open `index.html` via `file://` in production.
- Use `http://localhost:3000` locally (or your deployed HTTPS URL).
- Contact API endpoint is `/api/contact`, health endpoint is `/api/health`.
