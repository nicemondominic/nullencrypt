document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("imageForm");
  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");

  const imageInput = document.getElementById("imageFile");
  const keyInput = document.getElementById("secretKey");

  let mode = "encrypt";

  encryptBtn.onclick = () => {
    mode = "encrypt";
    encryptBtn.classList.add("active");
    decryptBtn.classList.remove("active");

    imageInput.value = "";
    imageInput.accept = "image/*,*/*";
    imageInput.type = "text";
    imageInput.type = "file";
  };

  decryptBtn.onclick = () => {
    mode = "decrypt";
    decryptBtn.classList.add("active");
    encryptBtn.classList.remove("active");

    imageInput.value = "";
    imageInput.accept = ".bin,application/octet-stream,*/*";
    imageInput.type = "text";
    imageInput.type = "file";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = imageInput.files[0];
    if (!file || file.size === 0) {
      alert("Please select a valid file");
      return;
    }

    const key = keyInput.value;
    const keySize = document.getElementById("aesKeySize").value;
    const aesMode = document.getElementById("aesMode").value;

    const minLen = keySize / 8;
    if (key.length < minLen) {
      alert(`AES-${keySize} requires at least ${minLen} characters`);
      return;
    }

    const formData = new FormData();

    // 🔥 iOS / Android FIX: Always provide filename metadata
    formData.append("image", file, file.name || "image.heic");
    formData.append("mode", mode);
    formData.append("key", key);
    formData.append("keySize", keySize);
    formData.append("aesMode", aesMode);

    try {
      const res = await fetch("/api/crypto-image", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const msg = await res.text();
        alert("Processing failed: " + msg);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      if (mode === "encrypt") {
        a.download = "encrypted-image.bin";
      } 
      // 🔓 Decrypt: backend sends original filename

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("Unexpected error occurred");
    }
  });

});

/* ===== THEME TOGGLE ===== */
const toggle = document.getElementById("themeToggle");

if (toggle) {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    toggle.textContent = "☀ Light";
  }

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    toggle.textContent = isDark ? "☀ Light" : "🌙 Dark";
  });
}

const keyInput = document.getElementById("secretKey");
const keySizeSelect = document.getElementById("aesKeySize");
const generateBtn = document.getElementById("generateKeyBtn");
const keyHint = document.getElementById("keyHint");

/* ===== Update key length limit based on AES size ===== */
function updateKeyLimit() {
  const keySize = parseInt(keySizeSelect.value, 10);
  const requiredLength = keySize / 8; // 128->16, 192->24, 256->32

  keyInput.maxLength = requiredLength;

  // If user already typed longer key, trim it
  if (keyInput.value.length > requiredLength) {
    keyInput.value = keyInput.value.slice(0, requiredLength);
  }

  keyHint.textContent = `AES-${keySize}: ${requiredLength} characters required`;
}

/* ===== Secure random key generator ===== */
function generateRandomKey(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array); // Cryptographically secure RNG

  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }

  return result;
}

/* ===== When AES size changes ===== */
keySizeSelect.addEventListener("change", () => {
  updateKeyLimit();
});

/* ===== When user types, enforce limit ===== */
keyInput.addEventListener("input", () => {
  const max = keyInput.maxLength;
  if (keyInput.value.length > max) {
    keyInput.value = keyInput.value.slice(0, max);
  }
});

/* ===== Generate button ===== */
generateBtn.addEventListener("click", () => {
  const keySize = parseInt(keySizeSelect.value, 10);
  const length = keySize / 8;
  const newKey = generateRandomKey(length);
  keyInput.value = newKey;
});

/* ===== Init on page load ===== */
updateKeyLimit();
