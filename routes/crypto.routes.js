const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const argon2 = require("argon2");

const router = express.Router();

/* =====================================================
   RSA KEY PAIR (demo purpose)
===================================================== */
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

/* =====================================================
   AES HELPERS
===================================================== */
function deriveKey(secret, keySize) {
  // keySize: 128 / 192 / 256
  return crypto
    .createHash("sha256")
    .update(secret)
    .digest()
    .slice(0, keySize / 8);
}

function aesEncrypt(text, options) {
  const { key, keySize, mode, format } = options;

  const algorithm = `aes-${keySize}-${mode}`;
  const aesKey = deriveKey(key, keySize);

  const iv = mode === "ecb" ? null : crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    algorithm,
    aesKey,
    iv
  );

  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const encoded =
    format === "base64"
      ? encrypted.toString("base64")
      : encrypted.toString("hex");

  // For CBC, prepend IV
  return iv
    ? `${iv.toString("hex")}:${encoded}`
    : encoded;
}

function aesDecrypt(text, options) {
  const { key, keySize, mode, format } = options;

  const algorithm = `aes-${keySize}-${mode}`;
  const aesKey = deriveKey(key, keySize);

  let iv = null;
  let encryptedData = text;

  if (mode !== "ecb") {
    const parts = text.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }
    iv = Buffer.from(parts[0], "hex");
    encryptedData = parts[1];
  }

  const encryptedBuffer = Buffer.from(encryptedData, format);

  const decipher = crypto.createDecipheriv(
    algorithm,
    aesKey,
    iv
  );

  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/* =====================================================
   MAIN TEXT CRYPTO ROUTE
===================================================== */
router.post("/crypto-text", async (req, res) => {
  try {
    const { text, algorithm, mode, aes } = req.body;

    if (!text || !algorithm || !mode) {
      return res.json({ error: "Missing required fields" });
    }

    let result;

    switch (algorithm) {

      /* ================= AES ================= */
      case "aes":
        if (!aes || !aes.key) {
          return res.json({ error: "Secret key required for AES" });
        }

        result =
          mode === "encrypt"
            ? aesEncrypt(text, aes)
            : aesDecrypt(text, aes);
        break;

      /* ================= RSA ================= */
      case "rsa":
        result =
          mode === "encrypt"
            ? crypto
                .publicEncrypt(publicKey, Buffer.from(text))
                .toString("base64")
            : crypto
                .privateDecrypt(privateKey, Buffer.from(text, "base64"))
                .toString("utf8");
        break;

      /* ================= BASE64 ================= */
      case "base64":
        result =
          mode === "encrypt"
            ? Buffer.from(text, "utf8").toString("base64")
            : Buffer.from(text, "base64").toString("utf8");
        break;

      /* ================= SHA-256 ================= */
      case "sha256":
        if (mode === "decrypt") {
          return res.json({ error: "SHA-256 cannot be decrypted" });
        }
        result = crypto
          .createHash("sha256")
          .update(text)
          .digest("hex");
        break;

      /* ================= BCRYPT ================= */
      case "bcrypt":
        if (mode === "decrypt") {
          return res.json({ error: "bcrypt cannot be decrypted" });
        }
        result = await bcrypt.hash(text, 12);
        break;

      /* ================= ARGON2 ================= */
      case "argon2":
        if (mode === "decrypt") {
          return res.json({ error: "Argon2 cannot be decrypted" });
        }
        result = await argon2.hash(text);
        break;

      default:
        return res.json({ error: "Unsupported algorithm" });
    }

    res.json({ result });

  } catch (err) {
    console.error("CRYPTO ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});



const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/crypto-image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No image uploaded");
    }

    const { mode, key, keySize, aesMode } = req.body;

    if (!key || !keySize || !aesMode || !mode) {
      return res.status(400).send("Missing parameters");
    }

    // 🔐 Validate key length
    const requiredLength = keySize / 8;
    if (key.length < requiredLength) {
      return res
        .status(400)
        .send(`AES-${keySize} requires ${requiredLength} character key`);
    }

    const algorithm = `aes-${keySize}-${aesMode}`;

    // 🔑 Derive key safely
    const aesKey = crypto
      .createHash("sha256")
      .update(key)
      .digest()
      .slice(0, keySize / 8);

    const fileBuffer = req.file.buffer;

    /* ================= ENCRYPT ================= */
    if (mode === "encrypt") {
      const iv = aesMode === "ecb" ? null : crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, aesKey, iv);
      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);

      // Prepend IV for CBC
      const output = iv ? Buffer.concat([iv, encrypted]) : encrypted;

      res.set({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=encrypted-image.bin"
      });

      return res.send(output);
    }

    /* ================= DECRYPT ================= */
    if (mode === "decrypt") {
      let iv = null;
      let encryptedData = fileBuffer;

      if (aesMode !== "ecb") {
        if (fileBuffer.length < 17) {
          return res.status(400).send("Invalid encrypted file");
        }
        iv = fileBuffer.slice(0, 16);
        encryptedData = fileBuffer.slice(16);
      }

      const decipher = crypto.createDecipheriv(algorithm, aesKey, iv);
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);

      res.set({
        "Content-Type": "image/png",
        "Content-Disposition": "attachment; filename=decrypted-image.png"
      });

      return res.send(decrypted);
    }

    return res.status(400).send("Invalid mode");

  } catch (err) {
    console.error("IMAGE CRYPTO ERROR:", err);
    res.status(500).send("Image processing failed");
  }
});


module.exports = router;
