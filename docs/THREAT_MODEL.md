# TalkaNova – Threat Model

Academic cybersecurity project: identification of threats and mitigations.

## Assets

- **User identities**: email, username, profile (avatar URL).
- **Authentication**: passwords (hashed), OAuth tokens, JWT.
- **Message content**: plaintext only on client; server stores only ciphertext (E2EE).
- **Metadata**: who talks to whom, when, room/conversation membership.

## Trust Boundaries

- **Client**: Trusted for E2EE (key generation, encrypt/decrypt). User device can be compromised (malware, physical access).
- **Server**: Untrusted for message content. Trusted for auth, routing, access control, storing ciphertext and metadata.
- **Network**: Untrusted (MITM possible without TLS).

## Threat List and Mitigations

### 1. Message content disclosure (server compromise)

- **Threat**: Attacker gains DB or server access and reads message bodies.
- **Mitigation**: E2EE; server stores only ciphertext. No server-side decryption; keys only on clients.
- **Residual**: Metadata (sender, recipient, time) still visible.

### 2. Message content disclosure (network MITM)

- **Threat**: Attacker intercepts traffic and reads plaintext or keys.
- **Mitigation**: TLS (HTTPS/WSS) for all client–server traffic. No plaintext over wire if client encrypts before send.
- **Residual**: TLS compromise or misconfiguration; client-side leakage (e.g. logs).

### 3. Authentication bypass / token theft

- **Threat**: Forged or stolen JWT; session hijack; password reuse.
- **Mitigation**: JWT signed with strong secret (HS256; consider RS256 for scale); short-lived access token; refresh token rotation; secure password reset (time-limited, one-time token); Google OAuth with strict redirect_uri. No tokens in URLs; prefer httpOnly cookie or memory.
- **Residual**: XSS can steal in-memory tokens; compromised device.

### 4. Weak passwords

- **Threat**: Brute-force or credential stuffing.
- **Mitigation**: Bcrypt with sufficient cost; rate limiting on login/signup/reset; optional complexity rules.
- **Residual**: User chooses weak password; no 2FA in current scope.

### 5. Metadata disclosure

- **Threat**: Observer (server or network) learns who communicates with whom and when.
- **Mitigation**: Metadata is inherent to routing; no plaintext content. For stronger anonymity: Tor frontend, minimal logging, no persistent analytics on server.
- **Residual**: Metadata remains visible to server and anyone with DB/log access.

### 6. Message tampering (in transit)

- **Threat**: Attacker modifies ciphertext or metadata in transit.
- **Mitigation**: TLS integrity; E2EE with authenticated encryption (e.g. XChaCha20-Poly1305) so ciphertext tampering is detected on decrypt.
- **Residual**: Attacker with TLS MITM could replace whole message; client must verify keys (e.g. out-of-band or key continuity).

### 7. Report/abuse and moderation

- **Threat**: Fake reports; abuse of report API; moderator sees only ciphertext (cannot read content).
- **Mitigation**: Reports stored with reporter_id and message_id; moderation actions (e.g. delete message) by ID without needing plaintext. Rate limit report endpoint.
- **Residual**: Moderator cannot verify content of reported message without user cooperation.

### 8. WebRTC signaling (demo)

- **Threat**: Signaling (SDP/ICE) or in-memory state tampered or leaked.
- **Mitigation**: Signaling over HTTPS; auth required. In-memory state is demo-only; replace with DB or short-lived cache for production. Media is peer-to-peer once established.
- **Residual**: IP exposure via WebRTC; use TURN/relay and consider Tor for high anonymity.

### 9. Denial of service

- **Threat**: Flooding auth, messages, WebSocket, or report endpoints.
- **Mitigation**: Rate limiting (e.g. per IP / per user); connection limits on WebSocket; input validation and size limits.
- **Residual**: Distributed or sophisticated DoS may need upstream/WAF.

### 10. Client-side key loss

- **Threat**: User loses device or clears storage; private key lost; messages undecryptable.
- **Mitigation**: Out-of-scope for minimal design. Future: optional key backup (e.g. encrypted backup with user secret).
- **Residual**: No key recovery in current design.

## Summary

- **E2EE**: Protects message content from server and network eavesdropping; server and DB see only ciphertext.
- **Auth**: JWT + OAuth + secure reset; rate limiting and hashing reduce auth-related risks.
- **Metadata**: Not encrypted; visible to server; Tor and minimal logging improve anonymity.
- **Code**: Modular, documented backend; security headers; CORS and env-based config support safe deployment (e.g. Tailscale, Tor).

Use this document to drive security testing (e.g. auth flows, E2EE key handling, rate limits) and to explain design choices in an academic context.
