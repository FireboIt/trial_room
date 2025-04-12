import os
from dotenv import load_dotenv

load_dotenv()

ACCESS_KEY = os.getenv("KAI_ACCESS_KEY")
SECRET_KEY = os.getenv("KAI_SECRET_KEY")

from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import time
import requests

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

@app.route("/tryon", methods=["POST"])
def tryon():
    data = request.json
    jwt_token = generate_jwt()
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    res = requests.post(
        "https://api.klingai.com/v1/images/kolors-virtual-try-on",
        headers=headers,
        json=data,
        verify=False  # You added this earlier
    )
    print("💬 Response from KlingAI:", res.status_code, res.text)
    return res.json()

@app.route("/status/<task_id>")
def status(task_id):
    jwt_token = generate_jwt()
    headers = { "Authorization": f"Bearer {jwt_token}" }
    res = requests.get(
        f"https://api.klingai.com/v1/images/kolors-virtual-try-on/{task_id}",
        headers=headers
    )
    return res.json()

if __name__ == "__main__":
    app.run(port=5050)
