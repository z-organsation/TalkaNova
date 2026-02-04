# Traffic Analysis & Network Security (Academic)

## Overview

This document provides an educational overview of traffic analysis risks in messaging applications, relevant to cybersecurity students and researchers.

## What is Traffic Analysis?

Traffic analysis is the process of intercepting and examining network packets to extract information about communication patterns, even when content is encrypted.

### Observable Metadata

Even with E2EE, an attacker can observe:

| Metadata | Description | Risk Level |
|:---------|:------------|:-----------|
| **Timing** | When messages are sent | 🟡 Medium |
| **Volume** | Size of encrypted payloads | 🟡 Medium |
| **Frequency** | Message rate patterns | 🔴 High |
| **Endpoints** | Who talks to whom | 🔴 High |
| **Duration** | Session length | 🟡 Medium |

## Attack Scenarios

### 1. Correlation Attack

**Scenario:** Attacker monitors both sender and receiver's network

```
Alice ──[encrypted]──> Server ──[encrypted]──> Bob
           ↑                         ↑
        Attacker                  Attacker
        observes                  observes
```

**How it works:**

- Attacker correlates packet timing
- If Alice sends at T1 and Bob receives at T1+δ consistently
- Attacker infers Alice is messaging Bob

**Mitigation:**

- Random delays in message delivery
- Batched message processing
- Decoy traffic (noise)

### 2. Volume Analysis

**Scenario:** Inferring activity from data volume

```
Normal:    ■■■ (3KB)
Image:     ■■■■■■■■■■■■■■■ (50KB)
File:      ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ (100KB)
```

**What attacker learns:**

- User sent an image (not text)
- User transferred a file
- Activity level indicates engagement

**Mitigation:**

- Padding messages to fixed sizes
- Splitting large transfers
- Constant-rate traffic (hard to implement)

### 3. Fingerprinting

**Scenario:** Identifying application behavior

WebRTC signaling has distinctive patterns:

```
Packet 1: 500B (Offer)
Packet 2: 300B (ICE candidate)
Packet 3: 300B (ICE candidate)
Packet 4: 450B (Answer)
```

**Attacker inference:** "User is starting a video call"

**Mitigation:**

- Tunneling all traffic through common ports (443)
- Using cover protocols (looking like HTTPS)

## Wireshark Analysis Demo

### Capturing TalkaNova Traffic

1. Start Wireshark on your network interface
2. Filter for TalkaNova backend:

   ```
   ip.addr == <backend-ip> && tcp.port == 8000
   ```

3. Send a message in the app

### What You'll See

```
No.   Time      Source        Destination   Protocol  Info
1     0.000     192.168.1.10  10.0.0.5      TCP       WebSocket [FIN, ACK]
2     0.045     192.168.1.10  10.0.0.5      HTTP      GET /api/v1/ws/general
3     0.089     10.0.0.5      192.168.1.10  HTTP      101 Switching Protocols
4     0.102     192.168.1.10  10.0.0.5      WS        Text [Masked]
```

**Observations:**

- Packet 4 is the chat message
- Content is encrypted (TLS 1.3)
- But timing, size, and direction are visible

### Exercise: Analyze Your Own Traffic

```bash
# Capture WebSocket traffic
tshark -i eth0 -f "port 8000" -w talkanova.pcap

# Analyze
tshark -r talkanova.pcap -T fields -e frame.time_relative -e frame.len
```

## TalkaNova Security Model

### What We Protect

| Layer | Protection |
|:------|:-----------|
| **Transport** | TLS 1.3 (HTTPS/WSS) |
| **Content** | E2EE (X25519 + XSalsa20-Poly1305) |
| **P2P** | WireGuard via Tailscale |

### What We Cannot Protect

| Threat | Reason |
|:-------|:-------|
| **Global adversary** | Can correlate all traffic |
| **Endpoint compromise** | Keyloggers, screen capture |
| **Social engineering** | User behavior |
| **Legal compulsion** | Metadata stored on server |

## Defense Recommendations

### For Maximum Privacy

1. **Use Tor**: Obscures IP address
2. **Use P2P Mode**: Bypasses central server
3. **Minimal Sessions**: Reduce observable patterns
4. **Decoy Activity**: Generate noise traffic

### Implementation Wishlist

Features that could further protect users:

- [ ] Constant-rate messaging (send empty frames)
- [ ] Message batching with random delays
- [ ] Onion routing for server connections
- [ ] Metadata-hiding proxies

## Academic References

1. "Tor: The Second-Generation Onion Router" - Dingledine et al.
2. "Traffic Analysis of the Encrypted Messaging Applications" - NDSS
3. "Website Fingerprinting Attacks on OnionShare" - PETS 2020

## Lab Exercise

**Objective:** Demonstrate traffic correlation vulnerability

1. Set up two chat clients (A and B)
2. Capture traffic on both ends
3. Send 10 messages with varying intervals
4. Correlate packet timings
5. Calculate success rate of identifying message pairs

**Expected Outcome:**
With precise timing, an attacker can correlate ~80-95% of messages without seeing content.

---

> [!NOTE]
> This document is for educational purposes in the context of academic cybersecurity studies. Understanding attacks helps build better defenses.
