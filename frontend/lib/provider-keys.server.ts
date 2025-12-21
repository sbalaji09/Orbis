import "server-only";

const ENVELOPE_PREFIX = "enc_v1";

function requireEncryptionKey(): Buffer {
  const raw = process.env.ORBIS_PROVIDER_KEYS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Missing ORBIS_PROVIDER_KEYS_ENCRYPTION_KEY (base64-encoded 32 bytes)"
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ORBIS_PROVIDER_KEYS_ENCRYPTION_KEY must decode to 32 bytes (AES-256-GCM)"
    );
  }
  return key;
}

export function encryptProviderKey(plainText: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  const key = requireEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    ENVELOPE_PREFIX,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

export function decryptProviderKey(encrypted: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  const key = requireEncryptionKey();
  const parts = encrypted.split(":");
  if (parts.length !== 4 || parts[0] !== ENVELOPE_PREFIX) {
    throw new Error("Invalid encrypted key format");
  }
  const iv = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

