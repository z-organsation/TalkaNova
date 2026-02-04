# Tor Browser Compatibility Guide

## Overview

TalkaNova is designed to work with Tor Browser for maximum privacy. This document outlines compatibility considerations and limitations.

## Compatibility Status

| Feature | Tor Compatible | Notes |
|:--------|:--------------:|:------|
| General Chat | ✅ | WebSocket over Tor works |
| Login/Guest | ✅ | No external dependencies |
| P2P Chat | ❌ | Requires direct IP connection |
| Audio/Video Calls | ❌ | WebRTC reveals IP |
| File Upload | ✅ | Works normally |
| Settings | ✅ | Stored locally |

## Design Decisions for Tor

### 1. No External CDNs

All assets are served locally:

- No Google Fonts (use system fonts or self-hosted)
- No external JavaScript libraries
- No analytics or tracking

### 2. No Fingerprinting

- No Canvas fingerprinting
- No WebGL fingerprinting
- Minimal browser feature detection

### 3. Privacy-Friendly Headers

The backend includes strict security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### 4. No JavaScript Requirement

Core functionality should work with JavaScript enabled at "Standard" security level.

## Limitations

### WebRTC and IP Leaks
>
> [!CAUTION]
> WebRTC can leak your real IP address even when using Tor!

**Why P2P Chat Doesn't Work on Tor:**

- WebRTC requires direct peer connection
- ICE candidates contain real IP addresses
- Tor circuits cannot be used for WebRTC

**Mitigation:**

- P2P chat is disabled when Tor is detected
- Users are warned before enabling WebRTC features

### WebSocket Performance

WebSocket connections over Tor may experience:

- Higher latency (3-hop routing)
- Connection timeouts
- Occasional disconnects

**Recommendation:**
Set longer timeout values when detecting Tor:

```javascript
const WS_TIMEOUT = isTor ? 30000 : 10000;
```

## Detecting Tor Browser

```javascript
function detectTor(): boolean {
  // Check for Tor-specific behaviors
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Tor Browser blocks canvas fingerprinting
  if (ctx) {
    try {
      ctx.fillText('test', 0, 0);
      canvas.toDataURL();
    } catch (e) {
      return true; // Likely Tor
    }
  }
  
  // Check timezone (Tor sets to UTC)
  const offset = new Date().getTimezoneOffset();
  if (offset === 0) {
    // Possibly Tor (but not conclusive)
  }
  
  return false;
}
```

## Deployment for Tor

### .onion Hidden Service

For maximum anonymity, deploy as a Tor Hidden Service:

1. Install Tor:

```bash
apt install tor
```

1. Configure Hidden Service (`/etc/tor/torrc`):

```
HiddenServiceDir /var/lib/tor/talkanova/
HiddenServicePort 80 127.0.0.1:3000
HiddenServicePort 443 127.0.0.1:8000
```

1. Restart Tor:

```bash
systemctl restart tor
```

1. Get .onion address:

```bash
cat /var/lib/tor/talkanova/hostname
```

### Frontend Configuration

Set the backend URL to the .onion address:

```env
NEXT_PUBLIC_API_BASE=http://xxxxx.onion
```

## Best Practices

1. **Inform Users**: Clear messaging about which features require non-Tor connection
2. **Graceful Degradation**: Disable incompatible features rather than breaking
3. **No Correlation**: Don't log IP addresses or create user correlation patterns
4. **Minimal Data**: Collect only essential data for functionality
