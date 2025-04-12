function getProductImageURL() {
  const url = window.location.href;

  if (url.includes("coupang.com")) {
    const img = document.querySelector("img.prod-image__detail");
    return img?.src || null;
  }

  if (url.includes("amazon.in") || url.includes("amazon.com")) {
    const img = document.querySelector("#landingImage");
    return img?.src || null;
  }

  return null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_IMAGE_URL") {
    const imageUrl = getProductImageURL();
    console.log("🔍 Extracted image URL:", imageUrl);
    sendResponse({ imageUrl });
  }

  if (message.type === "SET_TRYON_IMAGE") {
    const url = window.location.href;

    if (url.includes("coupang.com")) {
      const img = document.querySelector("img.prod-image__detail");
      if (img) img.src = message.url;
    }

    if (url.includes("amazon.in") || url.includes("amazon.com")) {
      const img = document.querySelector("#landingImage");
      if (img) img.src = message.url;
    }
  }

  return true;
});
