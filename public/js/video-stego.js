document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("videoStegoForm");
  const output = document.getElementById("output");

  const embedBtn = document.getElementById("embedBtn");
  const extractBtn = document.getElementById("extractBtn");

  const videoFile = document.getElementById("videoFile");
  const hiddenFile = document.getElementById("hiddenFile");
  const fileGroup = document.getElementById("fileGroup");

  const keySize = document.getElementById("aesKeySize");
  const aesMode = document.getElementById("aesMode");
  const secretKey = document.getElementById("secretKey");
  const generateKeyBtn = document.getElementById("generateKeyBtn");

  /* ===============================
     SAFETY CHECK
  ================================ */
  if (!generateKeyBtn) {
    console.error("❌ Generate button not found in DOM");
    return;
  }

  let mode = "embed";

  /* ===============================
     SECURE KEY GENERATOR
  ================================ */
  function generateAESKey(bits) {
    const length = bits / 8;
    const bytes = new Uint8Array(length);

    window.crypto.getRandomValues(bytes);

    return Array.from(bytes)
      .map(b => (b % 62).toString(36))
      .join("")
      .slice(0, length);
  }

  /* ===============================
     GENERATE BUTTON CLICK
  ================================ */
  generateKeyBtn.addEventListener("click", () => {
    const bits = parseInt(keySize.value, 10);
    const key = generateAESKey(bits);
    secretKey.value = key;
    secretKey.focus();
  });

  /* ===============================
     AUTO-REGENERATE ON SIZE CHANGE
  ================================ */
  keySize.addEventListener("change", () => {
    secretKey.value = generateAESKey(parseInt(keySize.value, 10));
  });

  /* ===============================
     MODE SWITCH
  ================================ */
  embedBtn.onclick = () => {
    mode = "embed";
    embedBtn.classList.add("active");
    extractBtn.classList.remove("active");
    fileGroup.style.display = "block";
  };

  extractBtn.onclick = () => {
    mode = "extract";
    extractBtn.classList.add("active");
    embedBtn.classList.remove("active");
    fileGroup.style.display = "none";
  };

  /* ===============================
     FORM SUBMIT
  ================================ */
  form.onsubmit = async (e) => {
    e.preventDefault();
    output.textContent = "Processing…";

    const minLen = keySize.value / 8;
    if (secretKey.value.length < minLen) {
      output.textContent = `❌ AES-${keySize.value} requires ${minLen} character key`;
      return;
    }

    if (!videoFile.files[0]) {
      output.textContent = "❌ Select a video file";
      return;
    }

    const fd = new FormData();
    fd.append("video", videoFile.files[0]);
    fd.append("key", secretKey.value);
    fd.append("keySize", keySize.value);
    fd.append("aesMode", aesMode.value);

    let url = "";

    if (mode === "embed") {
      if (!hiddenFile.files[0]) {
        output.textContent = "❌ Select a file to hide";
        return;
      }
      fd.append("file", hiddenFile.files[0]);
      url = "/api/video-stego/embed";
    } else {
      url = "/api/video-stego/extract";
    }

    const res = await fetch(url, { method: "POST", body: fd });

    if (!res.ok) {
      output.textContent = "❌ Operation failed";
      return;
    }

    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);

    if (mode === "embed") {
      link.download = `stego-${videoFile.files[0].name}`;
    }

    link.click();
    output.textContent = "✅ Operation completed successfully";
  };

});

/* ===============================
   DARK MODE
================================ */
const toggle = document.getElementById("themeToggle");

if (toggle && localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  toggle.textContent = "☀ Light";
}

toggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  toggle.textContent = isDark ? "☀ Light" : "🌙 Dark";
});
