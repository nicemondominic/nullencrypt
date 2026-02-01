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
  const capacityBox = document.getElementById("capacityBox");

  let mode = "embed";

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

  form.onsubmit = async (e) => {
    e.preventDefault();
    output.textContent = "Processing…";

    const minKeyLen = keySize.value / 8;
    if (secretKey.value.length < minKeyLen) {
      output.textContent = `❌ AES-${keySize.value} requires ${minKeyLen} characters key`;
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
      output.textContent = "❌ Video steganography failed";
      return;
    }

    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    if (mode === "embed") {
  link.download = "stego-video.mp4";
} else {
  // 🔥 IMPORTANT: DO NOT SET download name for extract
  // Browser will use backend filename (Content-Disposition)
}

    link.click();

    output.textContent = "✅ Operation completed successfully";
  };

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

