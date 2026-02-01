document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("stegoForm");
  const output = document.getElementById("output");

  const embedBtn = document.getElementById("embedBtn");
  const extractBtn = document.getElementById("extractBtn");

  const imageInput = document.getElementById("imageFile");
  const secretText = document.getElementById("secretText");

  const aesKeySize = document.getElementById("aesKeySize");
  const aesMode = document.getElementById("aesMode");
  const secretKey = document.getElementById("secretKey");

  let mode = "embed"; // default

  /* ===============================
     MODE TOGGLE
  =============================== */
  embedBtn.onclick = () => {
    mode = "embed";
    embedBtn.classList.add("active");
    extractBtn.classList.remove("active");
    secretText.disabled = false;
    secretText.placeholder = "Enter secret message (for embed)";
  };

  extractBtn.onclick = () => {
    mode = "extract";
    extractBtn.classList.add("active");
    embedBtn.classList.remove("active");
    secretText.value = "";
    secretText.disabled = true;
    secretText.placeholder = "Text will be extracted from image";
  };

  /* ===============================
     FORM SUBMIT
  =============================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    output.textContent = "Processing...";
    output.classList.add("show");

    // Basic validation
    if (!imageInput.files[0]) {
      output.textContent = "❌ Please upload a PNG image";
      return;
    }

    const keySize = parseInt(aesKeySize.value, 10);
    const minKeyLength = keySize / 8;

    if (secretKey.value.length < minKeyLength) {
      output.textContent =
        `❌ AES-${keySize} requires at least ${minKeyLength} characters key`;
      return;
    }

    if (mode === "embed" && !secretText.value.trim()) {
      output.textContent = "❌ Please enter text to embed";
      return;
    }

    const formData = new FormData();
    formData.append("image", imageInput.files[0]);
    formData.append("key", secretKey.value);
    formData.append("keySize", aesKeySize.value);
    formData.append("aesMode", aesMode.value);

    let url = "";

    if (mode === "embed") {
      formData.append("text", secretText.value);
      url = "/api/stego/embed";
    } else {
      url = "/api/stego/extract";
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Server error");
      }

      /* ===============================
         EMBED → DOWNLOAD IMAGE
      =============================== */
      if (mode === "embed") {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "stego-image.png";
        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(downloadUrl);

        output.textContent =
          "✅ Text encrypted and embedded successfully.\nStego image downloaded.";
      }

      /* ===============================
         EXTRACT → SHOW TEXT
      =============================== */
      else {
        const data = await response.json();

        if (data.error) {
          output.textContent = "❌ " + data.error;
        } else {
          output.textContent = "✅ Extracted Text:\n\n" + data.result;
        }
      }

    } catch (err) {
      console.error(err);
      output.textContent = "❌ Steganography processing failed";
    }
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

