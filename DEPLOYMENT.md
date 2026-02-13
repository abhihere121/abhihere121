# Keeping RESTIQ Running (Not Local)

Quick tunnels (trycloudflare.com) are temporary and will stop working when your laptop sleeps/restarts. For a stable always-on setup, deploy the app on a server.

## Option A — Managed hosting (Recommended)

Use Render / Railway / Fly.io / a VPS. You need:

- A hosted Postgres database
- A public HTTPS URL for the app (your `APP_URL`)
- Environment variables (below)

### Render (Blueprint)

This repo includes a [render.yaml](file:///c:/Users/aviku/Documents/trae_projects/signal/render.yaml) that provisions:

- A Render Postgres database
- A Render Web Service using the Dockerfile

Steps:

1) Push this repo to GitHub
2) Render → New → Blueprint → select the repo
3) Fill env vars for the web service:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `APP_ENCRYPTION_KEY`
   - `EMBED_SIG_SECRET`
4) Deploy

Notes:

- `APP_URL` is auto-derived on Render from `RENDER_EXTERNAL_URL` (no manual setting needed unless you want a custom domain).
- After adding a custom domain, set `APP_URL` explicitly to `https://yourdomain.com` and redeploy.

### Required environment variables

- `DATABASE_URL`
- `APP_URL` (e.g. `https://app.yourdomain.com`)
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `APP_ENCRYPTION_KEY` (32+ chars recommended)
- `EMBED_SIG_SECRET` (random secret)

Optional:

- `SHOPIFY_SCOPES`
- `ALLOW_DEV_SEED` (keep `false` in production)

### Shopify app config

Set these to your `APP_URL`:

- App URL: `APP_URL/app`
- Redirect URL(s): `APP_URL/auth/callback`
- Webhooks: `APP_URL/webhooks/products_update`, `APP_URL/webhooks/inventory_levels_update`

## Option B — Docker (Easy deployment)

This repo includes a `Dockerfile` that builds the embedded Next dashboard and runs the Express server.

Typical steps on a server:

1) Build image
2) Run container with your env vars
3) Point a domain + HTTPS proxy to it (Nginx / Caddy)

### Local Docker run (includes Postgres)

1) Copy env file

`copy .env.docker.example .env`

2) Start

`docker compose up --build`

3) Open

`http://localhost:3001/app`

## Option C — Stable Cloudflare Tunnel (Still depends on your machine)

If you want a stable URL but you’re okay with keeping a machine always on:

- Create a named Cloudflare Tunnel (Zero Trust)
- Map a stable subdomain to `http://127.0.0.1:3001`

This avoids changing trycloudflare URLs, but the machine must remain online.
