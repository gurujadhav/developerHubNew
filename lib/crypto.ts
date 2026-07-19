import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.WEBHOOK_SECRET || "default-secret-key-32-chars-long-!";
// Derive a 32-byte key using sha256 to ensure it's valid for aes-256-cbc.
const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(text: string): string {
  if (!text) return "";
  const textParts = text.split(":");
  const ivHex = textParts.shift();
  if (!ivHex) return "";
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = textParts.join(":");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
