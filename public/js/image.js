document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("imageForm");
  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");

  const imageInput = document.getElementById("imageFile");
  const keyInput = document.getElementById("secretKey");

  let mode = "encrypt";

  /* ===============================
     MODE SWITCH (IMPORTANT)
  =============================== */
  encryptBtn.onclick = () => {
    mode = "encrypt";
    encryptBtn.classList.add("active");
    decryptBtn.classList.remove("active");

    // 🔥 MOBILE FIX: allow only images
    imageInput.accept = "image/*";
    imageInput.value = ""; // reset file picker
  };

  decryptBtn.onclick = () => {
    mode = "decrypt";
    decryptBtn.classList.add("active");
    encryptBtn.classList.remove("active");

    // 🔥 MOBILE FIX: allow encrypted .bin files
    imageInput.accept = ".bin,application/octet-stream,*/*";
    imageInput.value = ""; // reset file picker
  };

  /* ===============================
     FORM SUBMIT
  =============================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = imageInput.files[0];
    if (!file) {
      alert("Please select a file");
      return;
    }

    const key = keyInput.value;
    const keySize = document.getElementById("aesKeySize").value;
    const aesMode = document.getElementById("aesMode").value;

    const minLength = keySize / 8;
    if (key.length < minLength) {
      alert(`AES-${keySize} requires at least ${minLength} characters key`);
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("mode", mode);
    formData.append("key", key);
    formData.append("keySize", keySize);
    formData.append("aesMode", aesMode);

    try {
      const response = await fetch("/api/crypto-image", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        alert("Image processing failed");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      // Filename logic
      a.download =
        mode === "encrypt"
          ? "encrypted-image.bin"
          : "decrypted-image.png";

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("Unexpected error occurred");
    }
  });

});

/* ===============================
   THEME TOGGLE (UNCHANGED)
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
