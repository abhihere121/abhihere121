const crypto = require("crypto");

function timingSafeEqualStr(a, b) {
  const aBuf = Buffer.from(String(a), "utf8");
  const bBuf = Buffer.from(String(b), "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function hmacHex(secret, message) {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function hmacBase64(secret, buffer) {
  return crypto.createHmac("sha256", secret).update(buffer).digest("base64");
}

function encryptAes256Gcm(plaintext, keyBase64) {
  const key = Buffer.from(String(keyBase64), "base64");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes base64");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

function decryptAes256Gcm(ciphertextBase64, keyBase64) {
  const key = Buffer.from(String(keyBase64), "base64");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes base64");
  const buf = Buffer.from(String(ciphertextBase64), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

module.exports = {
  timingSafeEqualStr,
  hmacHex,
  hmacBase64,
  encryptAes256Gcm,
  decryptAes256Gcm
};

