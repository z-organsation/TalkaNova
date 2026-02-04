import asyncio
import json
import logging
import uuid
import requests
import websockets

# Setup
BASE_URL = "http://localhost:8000/api/v1"
WS_URL = "ws://localhost:8000/api/v1/ws/general"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DualChat_Test")

def register_user(name):
    email = f"{name.lower()}_{uuid.uuid4().hex[:4]}@example.com"
    password = "password123"
    
    # Mock Keys (Required by Auth Router, even if not used for General Chat)
    keys = {
        "identity_key": f"IK_{name}",
        "signed_pre_key": f"SPK_{name}",
        "pre_key_sig": f"SIG_{name}",
        "one_time_pre_keys": [f"OPK1_{name}"]
    }
    
    payload = {"email": email, "password": password, "display_name": name, **keys}
    r = requests.post(f"{BASE_URL}/auth/register", json=payload)
    if r.status_code != 200:
        raise Exception(f"Register failed for {name}: {r.text}")
    
    user_data = r.json()
    
    # Login
    r = requests.post(f"{BASE_URL}/auth/token", data={"username": email, "password": password})
    token = r.json()["access_token"]
    
    return user_data, token

async def test_dual_chat():
    logger.info("--- 1. Registration ---")
    alice, alice_token = register_user("Alice")
    bob, bob_token = register_user("Bob")
    logger.info(f"Alice: {alice['id']}")
    logger.info(f"Bob: {bob['id']}")

    # --- P2P Test ---
    logger.info("--- 2. P2P Signaling Test ---")
    
    # Alice Request
    r = requests.post(f"{BASE_URL}/p2p/request", 
                      json={"target_user_id": bob['id']},
                      headers={"Authorization": f"Bearer {alice_token}"})
    assert r.status_code == 200
    session_id = r.json()["session_id"]
    logger.info(f"Session Created: {session_id}")
    
    # Bob Accept
    bob_ip = "100.1.1.2"
    r = requests.post(f"{BASE_URL}/p2p/accept",
                      json={"session_id": session_id, "tailscale_ip": bob_ip},
                      headers={"Authorization": f"Bearer {bob_token}"})
    assert r.status_code == 200
    
    # Alice Exchange
    alice_ip = "100.1.1.1"
    r = requests.post(f"{BASE_URL}/p2p/exchange-ip",
                      json={"session_id": session_id, "tailscale_ip": alice_ip},
                      headers={"Authorization": f"Bearer {alice_token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["peer_ip"] == bob_ip
    logger.info(f"Alice received Bob's IP: {data['peer_ip']}")

    # --- General Chat Test ---
    logger.info("--- 3. General Chat Broadcast Test ---")
    
    async with websockets.connect(f"{WS_URL}?token={alice_token}") as ws_alice, \
               websockets.connect(f"{WS_URL}?token={bob_token}") as ws_bob:
                   
        # Alice sends
        msg = {"type": "chat", "content": "Hello General!"}
        logger.info(f"Alice sending: {msg}")
        await ws_alice.send(json.dumps(msg))
        
        # Bob waits
        recv = await asyncio.wait_for(ws_bob.recv(), timeout=5)
        data = json.loads(recv)
        logger.info(f"Bob received: {data}")
        
        assert data["content"] == "Hello General!"
        assert data["sender_name"] == "Alice" # Or "Test User" from profile
        
        logger.info("--- TEST PASSED: P2P Signaling & General Chat Broadcast ---")

if __name__ == "__main__":
    asyncio.run(test_dual_chat())
