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
      const targetImg = document.querySelector("img.prod-image__detail");
      if (message.type === "SET_TRYON_IMAGE") {
        const targetImg = document.querySelector("img.prod-image__detail");
        if (targetImg) {
          console.log("✅ Replacing product image with try-on result");
      
          const container = targetImg.parentElement;
      
          // Read dimensions from original image
          const width = targetImg.clientWidth;
          const height = targetImg.clientHeight;
      
          // Create wrapper div
          const wrapper = document.createElement("div");
          wrapper.style.width = width + "px";
          wrapper.style.height = height + "px";
          wrapper.style.overflow = "hidden";
          wrapper.style.backgroundColor = "#fff";
          wrapper.style.display = "flex";
          wrapper.style.alignItems = "center";
          wrapper.style.justifyContent = "center";
      
          // Create new image
          const tryOnImg = new Image();
          tryOnImg.src = message.url;
          tryOnImg.style.objectFit = "contain";
          tryOnImg.style.maxWidth = "100%";
          tryOnImg.style.maxHeight = "100%";
          tryOnImg.style.display = "block";
      
          // Replace existing image
          container.innerHTML = ""; // clear original
          wrapper.appendChild(tryOnImg);
          container.appendChild(wrapper);
        } else {
          console.warn("❌ Could not find product image to replace.");
        }
      }
        }

    if (url.includes("amazon.in") || url.includes("amazon.com")) {
      const targetImg = document.querySelector("#landingImage"); 
      if (targetImg) {
        targetImg.src = message.url;
        targetImg.style.objectFit = "contain";
        targetImg.style.width = "100%";
        targetImg.style.height = "auto";
        console.log("✅ Replaced product image with try-on result");
      }
    
      if (img) img.src = message.url;
    }
  }

  return true;
});
