import os
import json
import time
import requests
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt

load_dotenv()

ACCESS_KEY = os.getenv("KAI_ACCESS_KEY")
SECRET_KEY = os.getenv("KAI_SECRET_KEY")

app = Flask(__name__)
CORS(app)


def generate_jwt():
    payload = {
        "iss": ACCESS_KEY,
        "exp": int(time.time()) + 1800,
        "nbf": int(time.time()) - 5
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token


def log_event(event_type, data):
    log_entry = {
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "site_url": data.get("site_url"),
        "user_image_preview": (data.get("human_image") or "")[:30] + "...",
        "garment_image": data.get("cloth_image"),
        "task_id": data.get("task_id"),
        "result_url": data.get("generated_image")
    }
    try:
        with open("logs.jsonl", "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"⚠️ Logging failed: {e}")


@app.route("/tryon", methods=["POST"])
def tryon():
    if request.method == "OPTIONS":
        return '', 200  # CORS preflight pass

    data = request.json or {}

    if not data.get("human_image") or not data.get("cloth_image"):
        log_event("tryon_invalid_input", data)
        print("❌ Missing human_image or cloth_image")
        return jsonify({"error": "Missing human_image or cloth_image"}), 400

    print("📥 Try-On Request Received")
    print("🔍 Site URL:", data.get("site_url", "N/A"))
    print("🧾 Garment Image:", data.get("cloth_image", "")[:80])
    print("👤 User Image (base64 starts with):", (data.get("human_image")
                                                 or "")[:30])

    jwt_token = generate_jwt()
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }

    try:
        print("📤 Sending payload to KlingAI...")
        res = requests.post(
            "https://api.klingai.com/v1/images/kolors-virtual-try-on",
            headers=headers,
            json=data,
            verify=False)

        print("💬 Response from KlingAI:", res.status_code)
        try:
            print("🧾 Response body (first 500 chars):", res.text[:500])
        except Exception as e:
            print("⚠️ Couldn't print response body:", str(e))

        # Check for success based on content, not just status code
        if res.status_code == 200:
            res_json = res.json()
            if res_json.get("code") == 0:
                print("✅ Try-on task accepted by KlingAI")
                res_json["site_url"] = data.get("site_url")
                log_event("tryon_requested", data)
                return res_json
            else:
                print("❗ KlingAI responded but with error:", res_json)
                log_event("tryon_failed_request", {
                    **data, "error_code": res.status_code,
                    "kling_error": res_json
                })
                return jsonify({"error":
                                "Try-on request rejected by API"}), 400
        else:
            print("❌ Received unexpected HTTP response code:", res.status_code)
            log_event("tryon_failed_request", {
                **data, "error_code": res.status_code,
                "response_text": res.text
            })
            return jsonify({"error": "Try-on request failed"}), res.status_code

    except Exception as e:
        print("🔥 Exception during try-on request:", str(e))
        log_event("tryon_exception", {**data, "exception": str(e)})
        return jsonify({"error": "Internal server error"}), 500


@app.route("/status/<task_id>")
def status(task_id):
    print(f"🔄 Polling status for task: {task_id}")
    jwt_token = generate_jwt()
    headers = {"Authorization": f"Bearer {jwt_token}"}

    try:
        res = requests.get(
            f"https://api.klingai.com/v1/images/kolors-virtual-try-on/{task_id}",
            headers=headers)

        print("💬 Status API response code:", res.status_code)

        if res.status_code == 200:
            status_json = res.json()
            print("🧾 Status response JSON:",
                  json.dumps(status_json, indent=2)[:500])

            task_status = status_json.get("data", {}).get("task_status")
            print(f"🔍 Task status = {task_status}")

            if task_status == "succeed":
                try:
                    img_url = status_json["data"]["task_result"]["images"][0][
                        "url"]
                    log_event("tryon_succeeded", {
                        "task_id": task_id,
                        "generated_image": img_url
                    })
                    print(f"✅ Task succeeded with result image: {img_url}")
                except Exception as e:
                    print("⚠️ Succeeded task but error parsing result image:",
                          str(e))
            elif task_status == "failed":
                log_event("tryon_failed_task", {
                    "task_id": task_id,
                    "status": task_status
                })
                print("❌ Task failed according to API status")
            return status_json
        else:
            print("❗ Unexpected status code received:", res.status_code)
            log_event(
                "status_failed", {
                    "task_id": task_id,
                    "status_code": res.status_code,
                    "response_text": res.text
                })
            return jsonify({"error":
                            "Failed to fetch status"}), res.status_code

    except Exception as e:
        print("🔥 Exception while polling task status:", str(e))
        log_event("status_exception", {
            "task_id": task_id,
            "exception": str(e)
        })
        return jsonify({"error": "Internal error"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
