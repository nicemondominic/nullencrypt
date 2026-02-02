const express = require("express");
const crypto = require("crypto");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAGIC = Buffer.from("NULLENCRYPT_AUDIO_STEGO");

/* ================= AES HELPERS ================= */

function deriveKey(key, size) {
  return crypto
    .createHash("sha256")
    .update(key)
    .digest()
    .slice(0, size / 8);
}

function aesEncrypt(data, key, size, mode) {
  const iv = mode === "ecb" ? null : crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    `aes-${size}-${mode}`,
    deriveKey(key, size),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return iv ? Buffer.concat([iv, encrypted]) : encrypted;
}

function aesDecrypt(data, key, size, mode) {
  let iv = null;
  let encrypted = data;

  if (mode !== "ecb") {
    iv = data.slice(0, 16);
    encrypted = data.slice(16);
  }

  const decipher = crypto.createDecipheriv(
    `aes-${size}-${mode}`,
    deriveKey(key, size),
    iv
  );

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/* ================= EMBED FILE INTO AUDIO ================= */

router.post(
  "/embed",
  upload.fields([{ name: "audio" }, { name: "file" }]),
  (req, res) => {
    try {
      const audioFile = req.files.audio[0];
      const hiddenFile = req.files.file[0];

      const meta = {
        name: hiddenFile.originalname,
        type: hiddenFile.mimetype,
        size: hiddenFile.size
      };

      const metaBuf = Buffer.from(JSON.stringify(meta));

      const encrypted = aesEncrypt(
        hiddenFile.buffer,
        req.body.key,
        Number(req.body.keySize),
        req.body.aesMode
      );

      const metaLen = Buffer.alloc(4);
      metaLen.writeUInt32BE(metaBuf.length);

      const payloadLen = Buffer.alloc(8);
      payloadLen.writeBigUInt64BE(BigInt(encrypted.length));

      const stegoAudio = Buffer.concat([
        audioFile.buffer,
        MAGIC,
        metaLen,
        metaBuf,
        payloadLen,
        encrypted
      ]);

      res.set({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="stego-${audioFile.originalname}"`
      });

      res.send(stegoAudio);

    } catch (err) {
      console.error("AUDIO EMBED ERROR:", err);
      res.status(500).send("Audio steganography failed");
    }
  }
);

/* ================= EXTRACT FILE FROM AUDIO ================= */

router.post(
  "/extract",
  upload.single("audio"),
  (req, res) => {
    try {
      const data = req.file.buffer;

      const magicIndex = data.lastIndexOf(MAGIC);
      if (magicIndex === -1) {
        return res.status(400).send("No hidden data found");
      }

      let offset = magicIndex + MAGIC.length;

      const metaLen = data.readUInt32BE(offset);
      offset += 4;

      const meta = JSON.parse(
        data.slice(offset, offset + metaLen).toString()
      );
      offset += metaLen;

      const payloadLen = Number(data.readBigUInt64BE(offset));
      offset += 8;

      const encrypted = data.slice(offset, offset + payloadLen);

      const decrypted = aesDecrypt(
        encrypted,
        req.body.key,
        Number(req.body.keySize),
        req.body.aesMode
      );

      res.set({
        "Content-Type": meta.type,
        "Content-Disposition": `attachment; filename="${meta.name}"`
      });

      res.send(decrypted);

    } catch (err) {
      console.error("AUDIO EXTRACT ERROR:", err);
      res.status(500).send("Audio steganography failed");
    }
  }
);

module.exports = router;
