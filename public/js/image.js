document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("imageForm");
  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");

  let mode = "encrypt";

  encryptBtn.onclick = () => {
    mode = "encrypt";
    encryptBtn.classList.add("active");
    decryptBtn.classList.remove("active");
  };

  decryptBtn.onclick = () => {
    mode = "decrypt";
    decryptBtn.classList.add("active");
    encryptBtn.classList.remove("active");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = document.getElementById("imageFile").files[0];
    const key = document.getElementById("secretKey").value;
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
    a.download = mode === "encrypt"
      ? "encrypted-image.bin"
      : "decrypted-image.png";

    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  });

});

const darkToggle = document.getElementById("darkToggle");

if (darkToggle) {

  // Load saved theme
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    darkToggle.textContent = "☀ Light";
  }

  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      localStorage.setItem("theme", "dark");
      darkToggle.textContent = "☀ Light";
    } else {
      localStorage.setItem("theme", "light");
      darkToggle.textContent = "🌙 Dark";
    }
  });
}

