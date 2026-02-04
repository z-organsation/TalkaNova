import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_flow():
    email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    password = "securepassword123"
    display_name = "Test User"
    
    # Mock E2EE Keys (Client would generate these)
    keys = {
        "identity_key": "IK_BASE64_MOCK",
        "signed_pre_key": "SPK_BASE64_MOCK",
        "pre_key_sig": "SIG_BASE64_MOCK",
        "one_time_pre_keys": ["OPK1_MOCK", "OPK2_MOCK"]
    }
    
    print(f"1. Registering {email}...")
    payload = {
        "email": email,
        "password": password,
        "display_name": display_name,
        **keys
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=payload)
    if r.status_code != 200:
        print("FAILED Register:", r.text)
        return
    user_id = r.json()["id"]
    print("   SUCCESS. User ID:", user_id)
    
    print("2. Logging in...")
    r = requests.post(f"{BASE_URL}/auth/token", data={"username": email, "password": password})
    if r.status_code != 200:
        print("FAILED Login:", r.text)
        return
    token = r.json()["access_token"]
    print("   SUCCESS. Token acquired.")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("3. Fetching Profile (/users/me)...")
    r = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if r.status_code != 200:
        print("FAILED Me:", r.text)
        return
    print("   SUCCESS. Profile:", r.json()["email"])

    print(f"4. Fetching Keys for {user_id} (/users/{{id}}/keys)...")
    r = requests.get(f"{BASE_URL}/users/{user_id}/keys", headers=headers)
    if r.status_code != 200:
        print("FAILED Keys:", r.text)
        return
    k = r.json()
    print("   SUCCESS. Identity Key:", k["identity_key"])
    print("   One-Time Key:", k["one_time_pre_key"])

if __name__ == "__main__":
    test_flow()
