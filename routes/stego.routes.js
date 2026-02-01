const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const { PNG } = require("pngjs");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ================= AES HELPERS ================= */

function deriveKey(key, size) {
  return crypto
    .createHash("sha256")
    .update(key)
    .digest()
    .slice(0, size / 8);
}

function aesEncrypt(text, key, size, mode) {
  const iv = mode === "ecb" ? null : crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    `aes-${size}-${mode}`,
    deriveKey(key, size),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final()
  ]);

  return iv ? Buffer.concat([iv, encrypted]) : encrypted;
}

function aesDecrypt(buffer, key, size, mode) {
  let iv = null;
  let data = buffer;

  if (mode !== "ecb") {
    iv = buffer.slice(0, 16);
    data = buffer.slice(16);
  }

  const decipher = crypto.createDecipheriv(
    `aes-${size}-${mode}`,
    deriveKey(key, size),
    iv
  );

  return Buffer.concat([
    decipher.update(data),
    decipher.final()
  ]).toString("utf8");
}

/* ================= EMBED ================= */

router.post("/embed", upload.single("image"), (req, res) => {
  try {
    const { text, key, keySize, aesMode } = req.body;
    if (!req.file || !text) {
      return res.status(400).send("Missing image or text");
    }

    const encrypted = aesEncrypt(text, key, keySize, aesMode);

    // Add null terminator
    const payload = Buffer.concat([
      encrypted,
      Buffer.from([0])
    ]);

    const png = PNG.sync.read(req.file.buffer);

    const availableBits = (png.data.length / 4); // 1 bit per pixel
    const requiredBits = payload.length * 8;

    if (requiredBits > availableBits) {
      return res.status(400).send(
        "Image too small to hide this message"
      );
    }

    let bitIndex = 0;

    for (let i = 0; i < png.data.length && bitIndex < requiredBits; i += 4) {
      const byte = payload[Math.floor(bitIndex / 8)];
      const bit = (byte >> (7 - (bitIndex % 8))) & 1;

      png.data[i] = (png.data[i] & 0xfe) | bit;
      bitIndex++;
    }

    const output = PNG.sync.write(png);

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": "attachment; filename=stego-image.png"
    });

    res.send(output);

  } catch (err) {
    console.error("STEGO EMBED ERROR:", err);
    res.status(500).send("Steganography processing failed");
  }
});

/* ================= EXTRACT ================= */

router.post("/extract", upload.single("image"), (req, res) => {
  try {
    const { key, keySize, aesMode } = req.body;
    if (!req.file) {
      return res.status(400).send("Missing image");
    }

    const png = PNG.sync.read(req.file.buffer);

    let bits = [];
    for (let i = 0; i < png.data.length; i += 4) {
      bits.push(png.data[i] & 1);
    }

    let bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        byte = (byte << 1) | bits[i + b];
      }
      if (byte === 0) break; // null terminator
      bytes.push(byte);
    }

    const encryptedBuffer = Buffer.from(bytes);
    const text = aesDecrypt(encryptedBuffer, key, keySize, aesMode);

    res.json({ result: text });

  } catch (err) {
    console.error("STEGO EXTRACT ERROR:", err);
    res.status(500).json({ error: "Steganography processing failed" });
  }
});

module.exports = router;
