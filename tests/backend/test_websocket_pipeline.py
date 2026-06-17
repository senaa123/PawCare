import asyncio
import base64
import os
import sys
import json
import httpx
import websockets

# Base configuration
BASE_HTTP_URL = "http://localhost:8000/api/v1"
BASE_WS_URL = "ws://localhost:8000/api/v1"
TEST_USER_EMAIL = "ws_tester@pawcare.com"
TEST_USER_PASSWORD = "Password123!"
TEST_USER_NAME = "WebSocket Tester"

# Test cat photo download URL (a clear tabby cat photo)
CAT_IMAGE_URL = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=640"
LOCAL_CAT_IMAGE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_cat.jpg")


async def setup_test_environment(client: httpx.AsyncClient):
    """
    Sets up the test user, test cat, and automation rule in the database.
    Returns the token and the cat_id.
    """
    print("\n--- [Step 1] Authenticating / Setting up User ---")
    token = None
    
    # 1. Try to register the test user
    try:
        register_payload = {
            "email": TEST_USER_EMAIL,
            "full_name": TEST_USER_NAME,
            "password": TEST_USER_PASSWORD
        }
        response = await client.post(f"{BASE_HTTP_URL}/auth/register", json=register_payload)
        if response.status_code == 201:
            print("[+] Test user registered successfully.")
        elif response.status_code == 409:
            print("[*] Test user already exists.")
        else:
            print(f"[-] Registration failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[-] Registration call failed: {e}")

    # 2. Login to get the JWT Token
    login_payload = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    response = await client.post(f"{BASE_HTTP_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print(f"[-] Login failed: {response.text}")
        sys.exit(1)
        
    token = response.json()["access_token"]
    print(f"[+] Logged in. Token received.")
    
    # Headers for authenticated requests
    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- [Step 2] Resolving Cat ---")
    # 3. Check if cat exists
    response = await client.get(f"{BASE_HTTP_URL}/cats/", headers=headers)
    cats = response.json()
    cat_id = None
    
    if cats:
        cat_id = cats[0]["id"]
        print(f"[+] Found existing cat '{cats[0]['name']}' with ID: {cat_id}")
    else:
        # Create a new cat
        cat_payload = {
            "name": "Milo",
            "breed": "Tabby",
            "age_months": 18,
            "weight_kg": 4.2,
            "notes": "Test tabby cat for WebSocket automation"
        }
        response = await client.post(f"{BASE_HTTP_URL}/cats/", json=cat_payload, headers=headers)
        if response.status_code != 201:
            print(f"[-] Failed to create cat: {response.text}")
            sys.exit(1)
        cat_id = response.json()["id"]
        print(f"[+] Created new test cat 'Milo' with ID: {cat_id}")

    print("\n--- [Step 3] Resolving Automation Rule ---")
    # 4. Check if rule exists
    response = await client.get(f"{BASE_HTTP_URL}/automation/", headers=headers)
    rules = response.json()
    rule_exists = False
    for rule in rules:
        if rule["trigger"] == "cat.detected" and rule["action"] == "send_notification":
            rule_exists = True
            print(f"[+] Found existing active rule: {rule['name']}")
            break
            
    if not rule_exists:
        # Create an automation rule triggering on cat.detected
        rule_payload = {
            "name": "Cat Detected Alert Rule",
            "trigger": "cat.detected",
            "action": "send_notification",
            "conditions": {
                "min_confidence": 0.60
            },
            "action_config": {
                "cat_id": cat_id,
                "title": "Milo Spotted!",
                "message": "PawCare AI detected Milo in the camera stream.",
                "severity": "medium",
                "alert_type": "unusual_behavior"
            }
        }
        response = await client.post(f"{BASE_HTTP_URL}/automation/", json=rule_payload, headers=headers)
        if response.status_code != 201:
            print(f"[-] Failed to create automation rule: {response.text}")
            sys.exit(1)
        print(f"[+] Created automation rule: '{response.json()['name']}'")

    return token, cat_id


async def prepare_test_image():
    """
    Downloads a sample cat photo if not present locally, and returns its base64 encoding.
    """
    if not os.path.exists(LOCAL_CAT_IMAGE_PATH):
        print(f"\n[*] Downloading sample cat image for detection test...")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(CAT_IMAGE_URL, timeout=15.0)
                if response.status_code == 200:
                    with open(LOCAL_CAT_IMAGE_PATH, "wb") as f:
                        f.write(response.content)
                    print(f"[+] Sample cat image saved to: {LOCAL_CAT_IMAGE_PATH}")
                else:
                    print(f"[-] Failed to download image: {response.status_code}")
                    sys.exit(1)
            except Exception as e:
                print(f"[-] Error downloading image: {e}")
                sys.exit(1)
    else:
        print(f"\n[+] Using existing cat image: {LOCAL_CAT_IMAGE_PATH}")

    with open(LOCAL_CAT_IMAGE_PATH, "rb") as image_file:
        base64_bytes = base64.b64encode(image_file.read())
        return base64_bytes.decode("utf-8")


async def run_pipeline_test(token: str, base64_frame: str):
    """
    Connects to WebSocket, sends base64 frame, listens for events, and verifies DB alerts.
    """
    ws_endpoint = f"{BASE_WS_URL}/camera/ws?token={token}"
    print(f"\n--- [Step 4] Connecting to WebSocket ---")
    print(f"Connecting to: {ws_endpoint}")
    
    try:
        async with websockets.connect(ws_endpoint) as websocket:
            print("[+] Connected to Camera WebSocket successfully!")
            
            # Send the base64-encoded frame
            print("\n[*] Sending base64 frame over WebSocket...")
            send_payload = {"frame": base64_frame}
            await websocket.send(json.dumps(send_payload))
            print("[+] Frame sent.")

            # Listen for responses (we expect detection result + broadcast events)
            print("\n[*] Listening for incoming WebSocket messages (waiting 5 seconds)...")
            
            # We run a loop to collect messages. We'll wait up to 5 seconds.
            received_messages = []
            try:
                while True:
                    # Wait for message with a timeout
                    message_str = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    message = json.loads(message_str)
                    received_messages.append(message)
                    print(f"\n[+] WebSocket Message Received:\n{json.dumps(message, indent=2)}")
                    
                    # Stop listening if we got the alert created message
                    if message.get("event") == "alert.created":
                        print("\n[+] Success! Received the 'alert.created' event pushed back over WS.")
                        break
            except asyncio.TimeoutError:
                print("\n[*] Stopped listening (timeout reached).")
                
    except Exception as e:
        print(f"[-] WebSocket connection or communication failed: {e}")
        return

    # Verify the database state
    print("\n--- [Step 5] Verifying DB via GET /api/v1/alerts ---")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_HTTP_URL}/alerts", headers=headers)
        if response.status_code == 200:
            alerts = response.json()
            print(f"[+] Retrieved {len(alerts)} alert(s) from DB.")
            if alerts:
                # Show the most recent alert
                latest_alert = alerts[0]
                print(f"Latest alert details:\n{json.dumps(latest_alert, indent=2)}")
                if latest_alert["title"] == "Milo Spotted!":
                    print("\n🎉 SUCCESS: E2E Pipeline verified! The alert is stored in the DB.")
                else:
                    print("\n[?] Found alerts, but latest alert doesn't match our test rule. Check your config.")
            else:
                print("[-] No alerts found in database.")
        else:
            print(f"[-] Failed to fetch alerts from DB: {response.text}")


async def main():
    print("====================================================")
    print("       PAWCARE END-TO-END PIPELINE TESTER           ")
    print("====================================================")
    
    async with httpx.AsyncClient() as client:
        # Step 1-3
        token, cat_id = await setup_test_environment(client)
        
        # Step 4: Get test frame
        base64_frame = await prepare_test_image()
        
        # Step 4-5: Run WebSocket + DB pipeline test
        await run_pipeline_test(token, base64_frame)


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
