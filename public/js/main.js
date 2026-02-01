document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("cryptoForm");
  const output = document.getElementById("output");
    const copyBtn = document.getElementById("copyBtn");

  const algorithm = document.getElementById("algorithm");
  const aesOptions = document.getElementById("aesOptions");

  const aesKeySize = document.getElementById("aesKeySize");
  const aesMode = document.getElementById("aesMode");
  const aesFormat = document.getElementById("aesFormat");
  const secretKey = document.getElementById("secretKey");

  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");




  let mode = "encrypt";

  /* ===============================
     MODE SWITCH (FIXED)
  =============================== */
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

  /* ===============================
     SHOW AES OPTIONS
  =============================== */
  function toggleAESOptions() {
    aesOptions.style.display =
      algorithm.value === "aes" ? "block" : "none";
  }

  algorithm.addEventListener("change", toggleAESOptions);
  toggleAESOptions();

  /* ===============================
     KEY LENGTH VALIDATION
  =============================== */
  function validateAESKey() {
    const key = secretKey.value || "";
    const size = parseInt(aesKeySize.value, 10);

    const minLength = size / 8; // 128 → 16 chars, etc.

    if (key.length < minLength) {
      return `❌ AES-${size} requires at least ${minLength} characters key`;
    }
    return null;
  }

  /* ===============================
     FORM SUBMIT
  =============================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    output.classList.remove("show");
    output.textContent = "";

    // AES validation
    if (algorithm.value === "aes") {
      const keyError = validateAESKey();
      if (keyError) {
        showOutput(keyError);
        return;
      }
    }

    showOutput("Processing...");

    const payload = {
      text: document.getElementById("inputText").value,
      algorithm: algorithm.value,
      mode,
      aes: {
        key: secretKey.value,
        keySize: aesKeySize.value,
        mode: aesMode.value,
        format: aesFormat.value
      }
    };

    try {
      const res = await fetch("/api/crypto-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      showOutput(data.result || data.error);

    } catch (err) {
      showOutput("❌ Server error");
    }
  });

  /* ===============================
     OUTPUT DISPLAY (GUARANTEED)
  =============================== */
  function showOutput(text) {
    output.classList.remove("show");
    output.textContent = text;
    void output.offsetWidth; // force repaint
    output.classList.add("show");
  }

});

const copyBtn = document.getElementById("copyBtn");

if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    const text = output.textContent.trim();

    if (!text || text === "Processing...") {
      showOutput("❌ Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      copyBtn.textContent = "Copied ✓";
      copyBtn.disabled = true;

      setTimeout(() => {
        copyBtn.textContent = "Copy Output";
        copyBtn.disabled = false;
      }, 1500);

    } catch (err) {
      // Fallback for older browsers
      fallbackCopy(text);
    }
  });
}

/* ===== FALLBACK COPY METHOD ===== */
function fallbackCopy(text) {
  const temp = document.createElement("textarea");
  temp.value = text;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);

  copyBtn.textContent = "Copied ✓";
  setTimeout(() => {
    copyBtn.textContent = "Copy Output";
  }, 1500);
}

/* ===============================
   DARK MODE TOGGLE
=============================== */
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

