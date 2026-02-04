# TalkaNova

**TalkaNova** is a security-first E2EE messaging app: **Next.js** frontend and **Python FastAPI** backend.  
Academic cybersecurity project: encrypted messaging, WebSocket chat, Google OAuth, password reset, private DMs, message reporting/deletion, email support, WebRTC demo, and Tor/Tailscale-friendly deployment.

---

## Features

- **Auth**: JWT + refresh tokens, Google OAuth, email/password signup & login, **password reset** (email link)
- **E2EE**: End-to-end encryption (client-side crypto; server stores ciphertext only). Room messages use opaque encoding; DMs support full E2EE key exchange
- **WebSocket chat**: Real-time room chat with presence
- **Private messaging (DMs)**: Get-or-create conversations, send/list messages (E2EE-ready)
- **Rooms**: List, create, join; default “Général” room
- **Message reporting & deletion**: Report messages for moderation; soft-delete own messages
- **Email**: SMTP for password reset (configurable; Tor-friendly base URL)
- **WebRTC**: Demo signaling (offer/answer/ICE) for calls
- **Deployment**: Tailscale VPN and Tor-compatible frontend (see `docs/DEPLOYMENT.md`)

---

## Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS, TweetNaCl (E2EE)
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy (async), JWT, bcrypt, WebSockets
- **Database**: SQLite (dev) or PostgreSQL via `DATABASE_URL`

---

## Quick start

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set SECRET_KEY (min 32 chars). Optional: Google OAuth, SMTP, CORS_ORIGINS
python run.py
# Or: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend: **http://localhost:8000**  
API docs (if `DEBUG=true`): **http://localhost:8000/docs**

### Frontend

```bash
# From repo root
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000 (or your backend URL; Tor-friendly)
npm install
npm run dev
```

Frontend: **http://localhost:3000**

### Google OAuth

1. Create OAuth client in Google Cloud Console (Web application).
2. Set redirect URI to `http://localhost:3000/auth/callback` (or your frontend URL).
3. In backend `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.

---

## Docs

- **Architecture**: `docs/ARCHITECTURE.md`
- **Threat model**: `docs/THREAT_MODEL.md`
- **Deployment (Tailscale, Tor)**: `docs/DEPLOYMENT.md`

---

## Repository

- **GitHub**: [https://github.com/Imadzakxy/TalkaNova](https://github.com/Imadzakxy/TalkaNova)
