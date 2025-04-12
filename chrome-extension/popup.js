const spinner = document.getElementById("spinner");
const spinnerText = document.getElementById("spinner-text");
const imageInput = document.getElementById("imageUpload");
const imagePreview = document.getElementById("preview");
let countdownInterval;
let userImageBase64 = null;

function showSpinnerWithCountdown(seconds = 18) {
  let remaining = seconds;
  spinner.style.display = "block";
  spinnerText.textContent = `Processing... ${remaining}s left`;

  countdownInterval = setInterval(() => {
    remaining--;
    spinnerText.textContent = `Processing... ${remaining}s left`;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      hideSpinner();
      console.log(`[${now()}] ⏱️ Timeout: Spinner auto-hidden after 18s`);
    }
  }, 1000);
}

function hideSpinner() {
  spinner.style.display = "none";
  if (countdownInterval) clearInterval(countdownInterval);
}

function now() {
  return new Date().toLocaleTimeString();
}

function generateJwtToken(accessKey, secretKey) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800,
    nbf: now - 5
  };

  function base64urlEncode(obj) {
    const str = JSON.stringify(obj);
    const words = CryptoJS.enc.Utf8.parse(str);
    const base64 = CryptoJS.enc.Base64.stringify(words);
    return base64.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  const encodedHeader = base64urlEncode(header);
  const encodedPayload = base64urlEncode(payload);
  const signature = CryptoJS.HmacSHA256(
    encodedHeader + "." + encodedPayload,
    secretKey
  );
  const encodedSignature = CryptoJS.enc.Base64.stringify(signature)
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// 👤 Handle file input and preview
imageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    const base64 = reader.result.split(",")[1]; // Remove prefix
    userImageBase64 = base64;
    imagePreview.src = reader.result;
    imagePreview.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// 🔘 Try On button
document.getElementById("tryOnBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log(`[${now()}] ⏳ Button clicked`);
  showSpinnerWithCountdown(18);

  chrome.tabs.sendMessage(tab.id, { type: "GET_IMAGE_URL" }, async (response) => {
    if (!response || !response.imageUrl) {
      console.log(`[${now()}] ❌ No product image found.`);
      hideSpinner();
      return;
    }

    if (!userImageBase64) {
      console.log(`[${now()}] ⚠️ No user image uploaded.`);
      alert("Please upload a photo before trying on.");
      hideSpinner();
      return;
    }

    const garmentImageUrl = response.imageUrl;

    const payload = {
      model_name: "kolors-virtual-try-on-v1-5",
      human_image: userImageBase64,
      cloth_image: garmentImageUrl
    };

    console.log(`[${now()}] 📤 Sending try-on task to proxy...`);

    const submitRes = await fetch("http://localhost:5050/tryon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let submitJson;
    try {
      submitJson = await submitRes.json();
      console.log(`[📦] Response from proxy:`, submitJson);
    } catch (err) {
      console.error(`[❌] Failed to parse response from /tryon:`, err);
      hideSpinner();
      return;
    }
    
    const taskId = submitJson?.data?.task_id;
    if (!taskId) {
      console.error(`[❌] task_id missing in response`);
      hideSpinner();
      return;
    }
    
    console.log(`[${now()}] ✅ Task submitted with ID: ${taskId}`);

    const pollImage = async () => {
      console.log(`[${now()}] 🔄 Polling task status...`);

      const statusRes = await fetch(`http://localhost:5050/status/${taskId}`);
      const statusJson = await statusRes.json();
      const status = statusJson.data.task_status;

      console.log(`[${now()}] 🔍 Status: ${status}`);

      if (status === "succeed") {
        const tryOnUrl = statusJson.data.task_result.images[0].url;
        chrome.tabs.sendMessage(tab.id, { type: "SET_TRYON_IMAGE", url: tryOnUrl });
        hideSpinner();
        console.log(`[${now()}] ✅ Spinner hidden after success`);
      } else if (status === "failed") {
        console.log(`[${now()}] ❌ Task failed`);
        hideSpinner();
      } else {
        setTimeout(pollImage, 1000);
      }
    };

    pollImage();
  });
});
