const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const router = express.Router();

/* 🔥 Use memoryStorage for iOS / Android compatibility */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/* ===== AES KEY DERIVATION ===== */
function deriveKey(key, size) {
  return crypto.createHash("sha256").update(key).digest().slice(0, size / 8);
}

router.post("/crypto-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).send("Invalid file upload");
    }

    const { mode, key, keySize, aesMode } = req.body;
    const inputBuffer = req.file.buffer;

    /* ================= ENCRYPT ================= */
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

      // Store original filename inside encrypted file
      const originalName = req.file.originalname || "image.heic";
      const nameBuf = Buffer.from(originalName, "utf-8");

      // First 4 bytes = filename length
      const header = Buffer.alloc(4);
      header.writeUInt32BE(nameBuf.length, 0);

      const payload = iv
        ? Buffer.concat([header, nameBuf, iv, encrypted])
        : Buffer.concat([header, nameBuf, encrypted]);

      res.set({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=encrypted-image.bin"
      });

      return res.send(payload);
    }

    /* ================= DECRYPT ================= */

    let offset = 0;

    // Read filename length
    const nameLen = inputBuffer.readUInt32BE(0);
    offset += 4;

    // Read filename
    const nameBuf = inputBuffer.slice(offset, offset + nameLen);
    let originalName = nameBuf.toString("utf-8") || "decrypted.heic";
    offset += nameLen;

    let iv = null;
    let data;

    if (aesMode !== "ecb") {
      iv = inputBuffer.slice(offset, offset + 16);
      offset += 16;
      data = inputBuffer.slice(offset);
    } else {
      data = inputBuffer.slice(offset);
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

    /* ===== Detect type & fix HEIC for iOS ===== */
    const ext = path.extname(originalName).toLowerCase();

    let outputBuffer = decrypted;
    let downloadName = originalName;
    let contentType = "application/octet-stream";

    if (ext === ".heic") {
      // 🔥 Convert HEIC → JPG so iOS can open it
      outputBuffer = await sharp(decrypted).jpeg({ quality: 95 }).toBuffer();
      downloadName = originalName.replace(/\.heic$/i, ".jpg");
      contentType = "image/jpeg";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      contentType = "image/jpeg";
    } else if (ext === ".png") {
      contentType = "image/png";
    } else if (ext === ".webp") {
      contentType = "image/webp";
    }

    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${downloadName}"`
    });

    res.send(outputBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send("Image processing failed");
  }
});

module.exports = router;
