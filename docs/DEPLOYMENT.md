# TalkaNova – Deployment (Tailscale, Tor)

## Overview

- **Backend**: Python FastAPI; run with uvicorn. Can listen on Tailscale IP and/or be reached via Tor hidden service.
- **Frontend**: Next.js; build and serve (e.g. Node or static export). Can be served over Tor as an onion service.
- **Tor-compatible**: Use environment variables for all base URLs (no hardcoded clearnet); frontend uses `NEXT_PUBLIC_API_URL` (or relative) so the same build works on clearnet or .onion.

## Tailscale (VPN-based deployment)

### Goal

Run backend (and optionally frontend) on a machine that is only reachable over Tailscale, so only devices on your tailnet can access the app.

### Steps

1. **Install Tailscale** on the server (Linux/Windows/macOS): [tailscale.com/download](https://tailscale.com/download).

2. **Join the machine** to your tailnet and note its Tailscale IP (e.g. `100.x.x.x`) or MagicDNS name (e.g. `talkanova.tailnet-name.ts.net`).

3. **Backend**
   - Create `.env` with `SECRET_KEY`, `CORS_ORIGINS`, etc. Set `CORS_ORIGINS` to your frontend URL (e.g. `https://talkanova.tailnet-name.ts.net` or `http://100.x.x.x:3000`).
   - Run:
     ```bash
     cd backend
     pip install -r requirements.txt
     uvicorn app.main:app --host 0.0.0.0 --port 8000
     ```
   - Backend is now reachable at `http://<tailscale-ip>:8000` (or use HTTPS with a reverse proxy).

4. **Frontend**
   - Set `NEXT_PUBLIC_API_URL=http://<tailscale-ip>:8000` (or your backend URL). Build and run:
     ```bash
     npm run build && npm start
     ```
   - Or run in dev with the same env: `npm run dev`. Only Tailscale peers can reach the app.

5. **Optional**: Put Nginx/Caddy in front of backend and frontend; terminate TLS; use Tailscale TLS certs or internal CA.

### Security notes

- Tailscale encrypts traffic between peers; still use strong `SECRET_KEY` and HTTPS in front of the app if possible.
- Restrict Tailscale ACLs so only intended devices can reach the TalkaNova host.

## Tor (onion frontend access)

### Goal

Allow users to open the frontend via Tor Browser; backend can be clearnet, Tailscale, or also an onion service.

### Frontend (Tor-compatible)

- **No hardcoded API host**: Use `NEXT_PUBLIC_API_URL` (or relative path like `/api`) so the same build works on:
  - Clearnet: `NEXT_PUBLIC_API_URL=https://api.example.com`
  - Onion: `NEXT_PUBLIC_API_URL=https://your-backend.onion`
  - Same origin: `NEXT_PUBLIC_API_URL=` and use relative `/api` with a reverse proxy that forwards to the backend.
- **CORS**: Backend `CORS_ORIGINS` must include the frontend origin (e.g. `https://your-frontend.onion`).
- **Cookies**: If using cookies, set `SameSite` and ensure they work with your Tor/origin setup.

### Serving frontend as onion service

1. **Tor** installed on the server. In `torrc`:
   ```
   HiddenServiceDir /var/lib/tor/talkanova_web/
   HiddenServicePort 80 127.0.0.1:3000
   ```
2. Run Next.js (or static export) on `127.0.0.1:3000`; Tor forwards port 80 to it.
3. Use the generated `.onion` URL as the frontend URL; set `FRONTEND_BASE_URL=https://xxx.onion` in backend for password reset links.
4. Set `NEXT_PUBLIC_API_URL` to the backend URL users will use from Tor (clearnet backend URL or backend’s own .onion).

### Backend as onion service (optional)

1. In `torrc`:
   ```
   HiddenServiceDir /var/lib/tor/talkanova_api/
   HiddenServicePort 443 127.0.0.1:8000
   ```
2. Run uvicorn on `127.0.0.1:8000`.
3. Set frontend `NEXT_PUBLIC_API_URL=https://backend-xxx.onion` so Tor users talk to backend over Tor.

### Security notes

- Tor provides anonymity for the user; E2EE still protects message content from the server.
- Avoid logging IPs or identifying data; minimize metadata retained.
- Use HTTPS (or Tor’s default .onion TLS) for .onion if possible (e.g. Tor Browser expectations).

## Quick reference

| Scenario              | Backend listen     | Frontend `NEXT_PUBLIC_API_URL` | Backend `CORS_ORIGINS` / `FRONTEND_BASE_URL` |
|----------------------|--------------------|---------------------------------|---------------------------------------------|
| Local dev            | `localhost:8000`   | `http://localhost:8000`        | `http://localhost:3000`                     |
| Tailscale only       | `0.0.0.0:8000`     | `http://100.x.x.x:8000`         | `http://100.x.x.x:3000` (or MagicDNS)       |
| Tor frontend         | clearnet or onion  | backend URL users use from Tor  | `https://frontend.onion`                     |
| Tor frontend + api   | onion on 8000      | `https://backend.onion`         | `https://frontend.onion`                    |

All secrets (e.g. `SECRET_KEY`, Google OAuth, SMTP) stay in environment variables, never in the repo.
