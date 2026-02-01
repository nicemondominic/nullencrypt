const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAGIC = Buffer.from("CRYPTOSECURE_STEGO");

/* ===== AES HELPERS ===== */
function deriveKey(key, size) {
  return crypto.createHash("sha256").update(key).digest().slice(0, size / 8);
}

function aesEncrypt(data, key, size, mode) {
  const iv = mode === "ecb" ? null : crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    `aes-${size}-${mode}`,
    deriveKey(key, size),
    iv
  );
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  return iv ? Buffer.concat([iv, enc]) : enc;
}

function aesDecrypt(data, key, size, mode) {
  let iv = null;
  let enc = data;
  if (mode !== "ecb") {
    iv = data.slice(0, 16);
    enc = data.slice(16);
  }
  const decipher = crypto.createDecipheriv(
    `aes-${size}-${mode}`,
    deriveKey(key, size),
    iv
  );
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}

/* ===== EMBED FILE INTO VIDEO ===== */
// ===== EMBED FILE INTO VIDEO (WITH METADATA) =====
router.post("/embed", upload.fields([
  { name: "video" },
  { name: "file" }
]), (req, res) => {
  try {
    const video = req.files.video[0].buffer;
    const file = req.files.file[0];

    // 🔹 Metadata
    const meta = {
      name: file.originalname,
      type: file.mimetype
    };
    const metaBuf = Buffer.from(JSON.stringify(meta));

    const encrypted = aesEncrypt(
      file.buffer,
      req.body.key,
      req.body.keySize,
      req.body.aesMode
    );

    const metaLen = Buffer.alloc(4);
    metaLen.writeUInt32BE(metaBuf.length);

    const payloadLen = Buffer.alloc(8);
    payloadLen.writeBigUInt64BE(BigInt(encrypted.length));

    const stegoVideo = Buffer.concat([
      video,
      MAGIC,
      metaLen,
      metaBuf,
      payloadLen,
      encrypted
    ]);

    res.set({
      "Content-Type": "video/mp4",
      "Content-Disposition": "attachment; filename=stego-video.mp4"
    });

    res.send(stegoVideo);

  } catch (err) {
    console.error(err);
    res.status(500).send("Video steganography failed");
  }
});


/* ===== EXTRACT FILE FROM VIDEO ===== */
// ===== EXTRACT FILE FROM VIDEO (WITH METADATA) =====
router.post("/extract", upload.single("video"), (req, res) => {
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

    const payloadLen = Number(
      data.readBigUInt64BE(offset)
    );
    offset += 8;

    const encrypted = data.slice(offset, offset + payloadLen);

    const decrypted = aesDecrypt(
      encrypted,
      req.body.key,
      req.body.keySize,
      req.body.aesMode
    );

    res.set({
      "Content-Type": meta.type,
      "Content-Disposition": `attachment; filename="${meta.name}"`
    });

    res.send(decrypted);

  } catch (err) {
    console.error(err);
    res.status(500).send("Video steganography failed");
  }
});


module.exports = router;
