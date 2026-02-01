const crypto = require('crypto');
const fs = require('fs');
const path = require('path');


exports.encryptImageAES = (req, res) => {
const imageBuffer = fs.readFileSync(req.file.path);


const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);


const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([
cipher.update(imageBuffer),
cipher.final()
]);


const outputPath = `uploads/encrypted-${Date.now()}.bin`;
fs.writeFileSync(outputPath, encrypted);


res.download(outputPath, 'encrypted-image.bin');
};