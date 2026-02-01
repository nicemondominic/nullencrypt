const encryptForm = document.getElementById("encryptForm");
const decryptForm = document.getElementById("decryptForm");
const output = document.getElementById("output");

/* Encrypt & Split */
encryptForm.onsubmit = async (e) => {
  e.preventDefault();

  const fd = new FormData();
  fd.append("file", document.getElementById("inputFile").files[0]);
  fd.append("parts", document.getElementById("numFragments").value);
  fd.append("key", document.getElementById("encKey").value);

  output.textContent = "Encrypting and splitting…";

  const res = await fetch("/api/split-crypto/encrypt", {
    method: "POST",
    body: fd
  });

  if (!res.ok) {
    output.textContent = "❌ Encryption failed";
    return;
  }

  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "fragments.zip";
  link.click();

  output.textContent = "✅ File encrypted and split successfully";
};

/* Reassemble & Decrypt */
decryptForm.onsubmit = async (e) => {
  e.preventDefault();

  const fd = new FormData();
  for (const f of document.getElementById("fragmentFiles").files) {
    fd.append("fragments", f);
  }
  fd.append("key", document.getElementById("decKey").value);

  output.textContent = "Reassembling and decrypting…";

  const res = await fetch("/api/split-crypto/decrypt", {
    method: "POST",
    body: fd
  });

  if (!res.ok) {
    output.textContent = "❌ Decryption failed";
    return;
  }

  const blob = await res.blob();
  const link = document.createElement("a");
link.href = URL.createObjectURL(blob);

/*
  🔥 DO NOT set link.download here
  This allows the browser to use
  Content-Disposition from backend
*/

link.click();


  output.textContent = "✅ File successfully restored";
};

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
