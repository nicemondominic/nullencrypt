document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("imageForm");
  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");

  const keyInput = document.getElementById("secretKey");
  const keySizeSelect = document.getElementById("aesKeySize");
  const generateBtn = document.getElementById("generateKeyBtn");
  const keyHint = document.getElementById("keyHint");
  const convertToggle = document.getElementById("convertHeicToggle");

  let mode = "encrypt";

  // Create FilePond instance (this normalizes files from iOS/Android)
  const pond = FilePond.create(document.getElementById("imageFile"), {
    allowMultiple: false,
    instantUpload: false,
    allowReorder: false
  });

  encryptBtn.onclick = () => {
    mode = "encrypt";
    encryptBtn.classList.add("active");
    decryptBtn.classList.remove("active");
    pond.removeFiles();
  };

  decryptBtn.onclick = () => {
    mode = "decrypt";
    decryptBtn.classList.add("active");
    encryptBtn.classList.remove("active");
    pond.removeFiles();
  };

  /* ===== Key length handling ===== */
  function updateKeyLimit() {
    const keySize = parseInt(keySizeSelect.value, 10);
    const requiredLength = keySize / 8;

    keyInput.maxLength = requiredLength;

    if (keyInput.value.length > requiredLength) {
      keyInput.value = keyInput.value.slice(0, requiredLength);
    }

    keyHint.textContent = `AES-${keySize}: ${requiredLength} characters required`;
  }

  function generateRandomKey(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  keySizeSelect.addEventListener("change", updateKeyLimit);

  keyInput.addEventListener("input", () => {
    const max = keyInput.maxLength;
    if (keyInput.value.length > max) {
      keyInput.value = keyInput.value.slice(0, max);
    }
  });

  generateBtn.addEventListener("click", () => {
    const keySize = parseInt(keySizeSelect.value, 10);
    const length = keySize / 8;
    keyInput.value = generateRandomKey(length);
  });

  updateKeyLimit();

  /* ===== Submit ===== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const files = pond.getFiles();
    if (!files.length) {
      alert("Please select a file");
      return;
    }

    const file = files[0].file; // <-- normalized REAL Blob
    if (!file || file.size === 0) {
      alert("Invalid file selected");
      return;
    }

    console.log("Picked file:", file.name, file.type, file.size);

    const key = keyInput.value;
    const keySize = keySizeSelect.value;
    const aesMode = document.getElementById("aesMode").value;

    const minLen = keySize / 8;
    if (key.length < minLen) {
      alert(`AES-${keySize} requires at least ${minLen} characters`);
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const formData = new FormData();
    formData.append("image", file, file.name || "file.bin");
    formData.append("mode", mode);
    formData.append("key", key);
    formData.append("keySize", keySize);
    formData.append("aesMode", aesMode);
    formData.append("convertHeic", convertToggle.checked ? "1" : "0");
    formData.append("isIOS", isIOS ? "1" : "0");

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
      if (mode === "encrypt") a.download = "encrypted-file.bin";

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
const toggle = document.getElementById("themeToggle");

/* Load saved theme */
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

