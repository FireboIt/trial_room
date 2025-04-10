# 🧥 Virtual Try-On Chrome Extension

This is a Chrome extension + Flask backend that allows users to preview how a garment might look on them directly on supported e-commerce sites, using AI-powered virtual try-on.

Built with 💙 [Kolors Try-On (KlingAI)](https://klingai.com/global/) and supports **Coupang**, **Amazon India**, and **Amazon US**.

---

## ✨ Features

- 🖼️ Replace the product image with an AI-generated try-on image
- 👤 Upload your own image for realistic preview
- 🔐 Backend-secured authentication (no secrets in extension)
- ⚡ Built with modern JS, Flask, and JWT

---

## 🌐 Supported Websites

- ✅ [Coupang](https://www.coupang.com/)
- ✅ [Amazon India](https://www.amazon.in/)
- ✅ [Amazon US](https://www.amazon.com/)

> ❗Desktop view only. Mobile is not currently supported.

---

## 🛠 How to Use

### 1. 🧩 Install the Chrome Extension

1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select the `chrome-extension/` folder

### 2. ⚙️ Start the Flask Proxy Server

1. Navigate to the `flask-proxy/` folder
2. Create a `.env` file with your KlingAI credentials:

```bash
# .env
KAI_ACCESS_KEY=your_real_access_key
KAI_SECRET_KEY=your_real_secret_key
