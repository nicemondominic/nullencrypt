document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("imageForm");
  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");

  const imageInput = document.getElementById("imageFile");
  const keyInput = document.getElementById("secretKey");

  let mode = "encrypt";

  /* ===============================
     MODE SWITCH (iOS SAFE)
  =============================== */
  encryptBtn.onclick = () => {
    mode = "encrypt";
    encryptBtn.classList.add("active");
    decryptBtn.classList.remove("active");

    imageInput.value = "";
    imageInput.accept = "image/*";

    // iOS Safari picker reset
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

  /* ===============================
     SUBMIT
  =============================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = imageInput.files[0];
    if (!file || file.size === 0) {
      alert("Please select a valid image");
      return;
    }

    const key = keyInput.value;
    const keySize = document.getElementById("aesKeySize").value;
    const aesMode = document.getElementById("aesMode").value;

    const minLen = keySize / 8;
    if (key.length < minLen) {
      alert(`AES-${keySize} requires ${minLen} characters`);
      return;
    }

    const formData = new FormData();

    // 🔥 CRITICAL iOS FIX (filename metadata)
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
        alert("Image processing failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      // Encrypt → binary
      if (mode === "encrypt") {
        a.download = "encrypted-image.bin";
      }
      // Decrypt → DO NOT force extension (HEIC SAFE)

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("Unexpected error");
    }
  });

});

/* ===============================
   THEME TOGGLE
=============================== */
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
