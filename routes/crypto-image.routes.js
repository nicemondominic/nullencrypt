const express = require("express");
const crypto = require("crypto");
const multer = require("multer");

const router = express.Router();

/* 🔥 MUST use memoryStorage for iOS */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB (HEIC can be large)
  }
});

/* ===== AES HELPERS ===== */
function deriveKey(key, size) {
  return crypto.createHash("sha256").update(key).digest().slice(0, size / 8);
}

router.post("/crypto-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).send("Invalid image upload (iOS issue)");
    }

    const { mode, key, keySize, aesMode } = req.body;
    const inputBuffer = req.file.buffer;

    if (mode === "encrypt") {
      const iv = aesMode === "ecb" ? null : crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        `aes-${keySize}-${aesMode}`,
        deriveKey(key, keySize),
        iv
      );

      const encrypted = Buffer.concat([
        cipher.update(inputBuffer),
        cipher.final()
      ]);

      const output = iv ? Buffer.concat([iv, encrypted]) : encrypted;

      res.set({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=encrypted-image.bin"
      });

      return res.send(output);
    }

    /* ===== DECRYPT ===== */
    let iv = null;
    let data = inputBuffer;

    if (aesMode !== "ecb") {
      iv = inputBuffer.slice(0, 16);
      data = inputBuffer.slice(16);
    }

    const decipher = crypto.createDecipheriv(
      `aes-${keySize}-${aesMode}`,
      deriveKey(key, keySize),
      iv
    );

    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]);

    // 🔥 Restore original filename (HEIC SAFE)
    const originalName = req.file.originalname.replace(".bin", "");

    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${originalName}"`
    });

    res.send(decrypted);

  } catch (err) {
    console.error(err);
    res.status(500).send("Image processing failed");
  }
});

module.exports = router;
