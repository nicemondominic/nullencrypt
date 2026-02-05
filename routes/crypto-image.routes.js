const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const router = express.Router();

/* Memory storage for mobile compatibility */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB
  }
});

/* Derive AES key from user password */
function deriveKey(key, size) {
  return crypto.createHash("sha256").update(key).digest().slice(0, size / 8);
}

router.post("/crypto-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file || !Buffer.isBuffer(req.file.buffer) || req.file.buffer.length < 16) {
      return res.status(400).send("Invalid or empty file upload");
    }

    const { mode, key, keySize, aesMode, convertHeic, isIOS } = req.body;
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

      let originalName = req.file.originalname || "file.bin";
      if (!path.extname(originalName)) {
        originalName += ".bin";
      }

      const nameBuf = Buffer.from(originalName, "utf-8");

      const header = Buffer.alloc(4);
      header.writeUInt32BE(nameBuf.length, 0);

      const payload = iv
        ? Buffer.concat([header, nameBuf, iv, encrypted])
        : Buffer.concat([header, nameBuf, encrypted]);

      res.set({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=encrypted-file.bin"
      });

      return res.send(payload);
    }

    /* ================= DECRYPT ================= */

    let offset = 0;

    const nameLen = inputBuffer.readUInt32BE(0);
    offset += 4;

    const nameBuf = inputBuffer.slice(offset, offset + nameLen);
    let originalName = nameBuf.toString("utf-8") || "decrypted-file";
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

    const ext = path.extname(originalName).toLowerCase();

    let outputBuffer = decrypted;
    let downloadName = originalName;
    let contentType = "application/octet-stream";

    const shouldConvert =
      ext === ".heic" && (convertHeic === "1" || isIOS === "1");

    if (shouldConvert) {
      outputBuffer = await sharp(decrypted).jpeg({ quality: 95 }).toBuffer();
      downloadName = originalName.replace(/\.heic$/i, ".jpg");
      contentType = "image/jpeg";
    } else {
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".heic") contentType = "image/heic";
    }

    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${downloadName}"`
    });

    res.send(outputBuffer);

  } catch (err) {
    console.error("Crypto error:", err);
    res.status(500).send("Encryption/Decryption failed. Check key/mode.");
  }
});

module.exports = router;
