import asyncio
import json
import logging
import uuid
import requests
import websockets

# Setup
BASE_URL = "http://localhost:8000/api/v1"
WS_URL = "ws://localhost:8000/api/v1/ws/secure"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("E2EE_Test")

# 1. Register User Helper
def register_user(name):
    email = f"{name.lower()}_{uuid.uuid4().hex[:4]}@example.com"
    password = "password123"
    
    # Mock Keys
    keys = {
        "identity_key": f"IK_{name}",
        "signed_pre_key": f"SPK_{name}",
        "pre_key_sig": f"SIG_{name}",
        "one_time_pre_keys": [f"OPK1_{name}", f"OPK2_{name}"]
    }
    
    payload = {"email": email, "password": password, "display_name": name, **keys}
    r = requests.post(f"{BASE_URL}/auth/register", json=payload)
    if r.status_code != 200:
        raise Exception(f"Register failed for {name}: {r.text}")
    
    user_data = r.json()
    
    # Login to get Token
    r = requests.post(f"{BASE_URL}/auth/token", data={"username": email, "password": password})
    token = r.json()["access_token"]
    
    return user_data, token

async def test_e2ee_flow():
    # 1. Register Alice and Bob
    logger.info("--- Registering ---")
    alice, alice_token = register_user("Alice")
    bob, bob_token = register_user("Bob")
    logger.info(f"Alice ID: {alice['id']}")
    logger.info(f"Bob ID:   {bob['id']}")

    # 2. Alice fetches Bob's Keys
    logger.info("--- Key Discovery ---")
    headers = {"Authorization": f"Bearer {alice_token}"}
    r = requests.get(f"{BASE_URL}/users/{bob['id']}/keys", headers=headers)
    assert r.status_code == 200
    bob_keys = r.json()
    logger.info(f"Alice fetched Bob's IK: {bob_keys['identity_key']}")
    
    # 3. WS Connections
    logger.info("--- Connecting to WS ---")
    async with websockets.connect(f"{WS_URL}?token={alice_token}") as ws_alice, \
               websockets.connect(f"{WS_URL}?token={bob_token}") as ws_bob:
                   
        # 4. Alice sends Encrypted Message to Bob
        # Mock Encryption: "Hello Bob" -> [Encrypted]
        cipher_blob = "ENCRYPTED_BYTES_12345"
        iv_blob = "IV_BYTES_999"
        
        msg_payload = {
            "type": "message",
            "recipient_id": bob['id'],
            "content_blob": cipher_blob,
            "iv": iv_blob,
            "temp_id": "temp_1"
        }
        
        logger.info(f"Alice sending: {msg_payload}")
        await ws_alice.send(json.dumps(msg_payload))
        
        # 5. Alice waits for Ack
        ack = await asyncio.wait_for(ws_alice.recv(), timeout=5)
        ack_data = json.loads(ack)
        logger.info(f"Alice received ACK: {ack_data}")
        assert ack_data["type"] == "ack"
        
        # 6. Bob waits for Message
        logger.info("Bob listening...")
        msg = await asyncio.wait_for(ws_bob.recv(), timeout=5)
        msg_data = json.loads(msg)
        logger.info(f"Bob received: {msg_data}")
        
        assert msg_data["type"] == "new_message"
        assert msg_data["content_blob"] == cipher_blob
        assert msg_data["sender_id"] == alice['id']
        
        logger.info("--- TEST PASSED: Full E2EE Routing ---")

if __name__ == "__main__":
    asyncio.run(test_e2ee_flow())
