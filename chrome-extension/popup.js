// popup.js
const spinner = document.getElementById("spinner");
const spinnerText = document.getElementById("spinner-text");
const uploadInput = document.getElementById("userImage");
const previewImg = document.getElementById("preview");
let countdownInterval;

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
      console.log(`[${now()}] ⏱️ Timeout: Spinner auto-hidden after ${seconds}s`);
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

function getUserImage() {
  return localStorage.getItem("userImage") || "";
}

function setUserImage(base64) {
  localStorage.setItem("userImage", base64);
}

function resizeImage(file, maxSize = 512) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve(resizedDataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  });
}

uploadInput.addEventListener("change", async () => {
  const file = uploadInput.files[0];
  if (!file) {
    console.warn("⚠️ No file selected.");
    return;
  }

  const base64 = await resizeImage(file);
  setUserImage(base64);

  const previewUrl = "data:image/jpeg;base64," + base64;
  previewImg.src = previewUrl;
  previewImg.style.display = "block";
  console.log(`[${now()}] ✅ Resized and previewed: ${file.name}`);
});

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

    const garmentImageUrl = response.imageUrl;
    const userImageBase64 = getUserImage();
    if (!userImageBase64) {
      alert("Please upload your image first.");
      hideSpinner();
      console.warn(`[${now()}] ❌ No user image in localStorage.`);
      return;
    }

    const payload = {
      model_name: "kolors-virtual-try-on-v1-5",
      human_image: userImageBase64,
      cloth_image: garmentImageUrl,
      site_url: tab.url
    };

    console.log(`[${now()}] 📤 Sending try-on task to proxy...`);

    try {
      const submitRes = await fetch("https://d967d59e-56b2-46f7-b1a8-b8ed50d7d449-00-6w8577xdgn8i.sisko.replit.dev/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const submitJson = await submitRes.json();
      const taskId = submitJson.data.task_id;
      console.log(`[${now()}] ✅ Task submitted with ID: ${taskId}`);

      const pollImage = async () => {
        console.log(`[${now()}] 🔄 Polling task status...`);
        const statusRes = await fetch(`https://d967d59e-56b2-46f7-b1a8-b8ed50d7d449-00-6w8577xdgn8i.sisko.replit.dev/status/${taskId}`);
        const statusJson = await statusRes.json();
        const status = statusJson.data.task_status;
        console.log(`[${now()}] 🔍 Status: ${status}`);

        if (status === "succeed") {
          const tryOnUrl = statusJson.data.task_result.images[0].url;
          chrome.tabs.sendMessage(tab.id, { type: "SET_TRYON_IMAGE", url: tryOnUrl });
          hideSpinner();
          console.log(`[${now()}] ✅ Image replaced successfully.`);
        } else if (status === "failed") {
          console.log(`[${now()}] ❌ Task failed`);
          hideSpinner();
        } else {
          setTimeout(pollImage, 1000);
        }
      };

      pollImage();
    } catch (error) {
      console.error(`[${now()}] ❌ Try-on request failed:`, error);
      hideSpinner();
    }
  });
});
