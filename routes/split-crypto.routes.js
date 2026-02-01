const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const archiver = require("archiver");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function deriveKey(key) {
  return crypto.createHash("sha256").update(key).digest();
}

function aesEncrypt(buf, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", deriveKey(key), iv);
  return Buffer.concat([iv, cipher.update(buf), cipher.final()]);
}

function aesDecrypt(buf, key) {
  const iv = buf.slice(0, 16);
  const data = buf.slice(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", deriveKey(key), iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

router.post("/encrypt", upload.single("file"), (req, res) => {
  const key = req.body.key;
  const parts = parseInt(req.body.parts, 10);

  /* ---------- METADATA ---------- */
  const meta = {
    name: req.file.originalname,
    type: req.file.mimetype
  };
  const metaBuf = Buffer.from(JSON.stringify(meta));
  const metaLen = Buffer.alloc(4);
  metaLen.writeUInt32BE(metaBuf.length);

  /* ---------- COMBINED DATA ---------- */
  const combined = Buffer.concat([
    metaLen,
    metaBuf,
    req.file.buffer
  ]);

  /* ---------- ENCRYPT ---------- */
  const encrypted = aesEncrypt(combined, key);

  /* ---------- SPLIT ---------- */
  const chunkSize = Math.ceil(encrypted.length / parts);
  const archive = archiver("zip");

  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": "attachment; filename=fragments.zip"
  });

  archive.pipe(res);

  for (let i = 0; i < parts; i++) {
    const chunk = encrypted.slice(i * chunkSize, (i + 1) * chunkSize);
    archive.append(chunk, { name: `fragment_${i + 1}.bin` });
  }

  archive.finalize();
});


router.post("/decrypt", upload.array("fragments"), (req, res) => {
  const key = req.body.key;

  /* ---------- SORT FRAGMENTS ---------- */
  const fragments = req.files
    .sort((a, b) => a.originalname.localeCompare(b.originalname))
    .map(f => f.buffer);

  /* ---------- REASSEMBLE ---------- */
  const encrypted = Buffer.concat(fragments);

  /* ---------- DECRYPT ---------- */
  const decrypted = aesDecrypt(encrypted, key);

  /* ---------- READ METADATA ---------- */
  let offset = 0;
  const metaLen = decrypted.readUInt32BE(offset);
  offset += 4;

  const meta = JSON.parse(
    decrypted.slice(offset, offset + metaLen).toString()
  );
  offset += metaLen;

  const fileData = decrypted.slice(offset);

  /* ---------- SEND ORIGINAL FILE ---------- */
  res.set({
    "Content-Type": meta.type,
    "Content-Disposition": `attachment; filename="${meta.name}"`
  });

  res.send(fileData);
});


module.exports = router;
