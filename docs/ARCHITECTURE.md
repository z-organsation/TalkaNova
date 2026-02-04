# TalkaNova – Architecture

Academic cybersecurity project: E2EE messaging with FastAPI backend and Next.js frontend.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Next.js)                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Auth (JWT,  │  │ E2EE (client │  │ WebSocket   │  │ WebRTC       │  │
│  │ Google)     │  │ crypto only)  │  │ chat client │  │ (demo)       │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  │
└─────────┼────────────────┼─────────────────┼─────────────────┼──────────┘
          │                │                 │                 │
          │ HTTPS / WSS     │ ciphertext only  │ WSS             │ HTTPS
          ▼                ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Python FastAPI)                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │ /auth       │  │ /messages    │  │ /ws/chat    │  │ /webrtc      │   │
│  │ /users      │  │ /rooms       │  │ (broadcast  │  │ (signaling)  │   │
│  │ /conversations │ /reports     │  │ + presence) │  │              │   │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘   │
│         │                │                 │                 │          │
│         └────────────────┴────────┬─────────┴─────────────────┘          │
│                                  ▼                                      │
│                         ┌─────────────────┐                             │
│                         │ SQLAlchemy      │  (SQLite / PostgreSQL)       │
│                         │ (users, msgs,   │                             │
│                         │  ciphertext)    │                             │
│                         └─────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### Backend (FastAPI)

- **Auth**: JWT access + refresh; Google OAuth; password reset (token + email). No plaintext passwords stored (bcrypt).
- **Users & profiles**: List users (for DMs), profile CRUD, **public key upload/fetch** for E2EE (X25519 or similar; server stores only public keys).
- **Rooms**: List/create/join rooms; default room `room_one` (general).
- **Conversations (DMs)**: Get-or-create DM between two users; list current user’s DMs.
- **Messages**: Send/list/delete. **E2EE**: request/response body is **ciphertext only** (client encrypts/decrypts); server never sees plaintext. Soft-delete for sender.
- **Reports**: Store message reports (message_id, reporter_id, reason) for moderation; no server-side auto-delete.
- **WebSocket** (`/api/v1/ws/chat?token=...&room_id=...`): Real-time room chat; clients send `{ type: "message", body_encrypted, key_id }`; server broadcasts; presence (join/leave).
- **WebRTC**: Demo signaling (offer/answer/ICE) in-memory; no TURN/STUN in this repo.
- **Email**: SMTP for password reset links; configurable `FRONTEND_BASE_URL` (Tor-friendly).

### Frontend (Next.js)

- **Auth**: Login/signup, Google OAuth redirect, password reset request + confirm page; store access/refresh in memory or httpOnly cookie (no localStorage for tokens in secure setup).
- **E2EE**: Generate keypair (e.g. X25519); encrypt before send, decrypt on receive; fetch recipient public key from `/users/{id}/public-key`; upload own key at `/users/me/public-key`.
- **Chat**: Room list; join room; WebSocket to backend with token + room_id; send encrypted payloads; display decrypted messages.
- **DMs**: List conversations; open DM with user; send/list messages (E2EE same as rooms).
- **Report/delete**: Report message (modal); delete own message.
- **WebRTC**: Demo “Call” button; exchange SDP/ICE via backend signaling; peer connection in browser.
- **Tor-compatible**: API base URL from env (e.g. relative or .onion); no hardcoded clearnet URLs in client code where avoidable.

## Data Flow (E2EE)

1. **Key setup**: Client A generates keypair; uploads public key to server. Client B fetches A’s public key.
2. **Send**: A encrypts plaintext with B’s public key (or shared secret derived from key agreement); sends `body_encrypted` (+ optional `key_id`) via REST or WebSocket.
3. **Store**: Server stores only `body_encrypted` (and metadata: sender_id, room_id/conversation_id, timestamp).
4. **Receive**: Client fetches or receives ciphertext; decrypts with own private key (or shared secret). Server never has private keys or plaintext.

## Deployment Options

- **Tailscale**: Run backend and optional frontend on a host joined to Tailscale; clients use Tailscale IP or MagicDNS. Reduces exposure to public internet.
- **Tor**: Frontend can be served as an onion service; set `FRONTEND_BASE_URL` (and reset links) to the .onion URL; backend can be Tor hidden service or Tailscale-only.
- **Reverse proxy**: Put Nginx/Caddy in front; TLS termination; rate limiting; security headers (backend already adds some).

## Security Assumptions

- TLS in production (client–server and, if applicable, client–onion).
- Secret key (JWT, etc.) only in env; not in code or repo.
- E2EE security depends on client-side key handling and algorithm (e.g. X25519+XChaCha20-Poly1305); server is untrusted for message content.
- Google OAuth: redirect_uri must match exactly; client ID/secret only on backend.

See **THREAT_MODEL.md** for threats and mitigations.
