# Tailscale VPN Configuration for TalkaNova

## Overview

TalkaNova uses Tailscale as its zero-trust networking layer for P2P private chat. This ensures that private messages never pass through the central server.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Tailscale Mesh Network                    │
│                                                              │
│   ┌─────────┐      100.x.x.x      ┌─────────┐               │
│   │  User A │◄────────────────────►│  User B │               │
│   │ Browser │    Direct P2P Link   │ Browser │               │
│   └─────────┘                      └─────────┘               │
│        │                                │                    │
│        │ (Signaling Only)               │                    │
│        ▼                                ▼                    │
│   ┌──────────────────────────────────────────┐              │
│   │         TalkaNova Backend                │              │
│   │   (Session Coordination + IP Exchange)   │              │
│   └──────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

## Setup Guide

### 1. Install Tailscale

#### Windows

```powershell
winget install Tailscale.Tailscale
```

#### macOS

```bash
brew install --cask tailscale
```

#### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

### 2. Authenticate

```bash
tailscale up
```

Follow the authentication URL to link your device to your Tailnet.

### 3. Verify Connection

```bash
tailscale status
```

You should see your device listed with a `100.x.x.x` IP address.

### 4. Share Tailnet with Chat Partners

For P2P chat to work, both users must be on the same Tailnet:

**Option A: Same Account**
Both users log in to the same Tailscale account.

**Option B: Tailscale Sharing**
Use Tailscale's device sharing feature to invite external users.

## Backend Deployment

### Bind to Tailscale IP Only

For maximum security, bind the backend to the Tailscale interface:

```python
# Start FastAPI on Tailscale IP only
uvicorn app.main:app --host 100.x.x.x --port 8000
```

Or use `0.0.0.0` but configure firewall to only allow Tailnet traffic.

### UFW Firewall Example

```bash
# Allow only Tailscale network
ufw allow from 100.64.0.0/10 to any port 8000
```

## P2P Chat Flow

1. **User A** initiates chat with **User B**
2. Backend creates session, marks as "pending"
3. **User B** accepts and provides their Tailscale IP (`100.x.x.x`)
4. Backend returns **User B**'s IP to **User A**
5. **User A** connects directly to **User B** via WebRTC over Tailscale
6. All subsequent messages bypass the server entirely

## Security Benefits

| Feature | Benefit |
|:--------|:--------|
| **WireGuard Encryption** | All traffic encrypted at network layer |
| **Zero Trust** | No public IP exposure |
| **No Central Relay** | Private messages never touch server |
| **NAT Traversal** | Works behind firewalls/NAT |
| **MagicDNS** | Use hostnames instead of IPs |

## Troubleshooting

### Can't Connect to Peer

- Verify both users are on the same Tailnet: `tailscale status`
- Check if Tailscale is running: `tailscale ping <peer-ip>`
- Ensure firewall allows WebRTC ports (UDP)

### Connection Drops

- Tailscale handles reconnection automatically
- Check network stability: `tailscale ping --until-direct <peer-ip>`
