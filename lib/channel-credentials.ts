import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const configuredKey = process.env.CHANNEL_CREDENTIALS_KEY;
  if (!configuredKey) throw new Error("CHANNEL_CREDENTIALS_KEY chưa được cấu hình.");
  const key = /^[\da-f]{64}$/i.test(configuredKey)
    ? Buffer.from(configuredKey, "hex")
    : Buffer.from(configuredKey, "base64");
  if (key.length !== 32) throw new Error("CHANNEL_CREDENTIALS_KEY phải giải mã thành 32 byte.");
  return key;
}

export function assertChannelCredentialEncryptionConfigured() {
  encryptionKey();
}

export function encryptChannelCredentials(credentials: Record<string, unknown>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptChannelCredentials(encrypted: string) {
  const [encodedIv, encodedTag, encodedCiphertext, extra] = encrypted.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext || extra) throw new Error("Thông tin xác thực của kênh không hợp lệ.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  const credentials: unknown = JSON.parse(plaintext);
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    throw new Error("Thông tin xác thực của kênh không hợp lệ.");
  }
  return credentials as Record<string, unknown>;
}

const SECRET_PREFIX = "encrypted:v1:";

export function encryptSecretValue(value: string) {
  return `${SECRET_PREFIX}${encryptChannelCredentials({ value })}`;
}

export function decryptSecretValue(encrypted: string) {
  if (!encrypted.startsWith(SECRET_PREFIX)) throw new Error("Giá trị bí mật chưa được mã hoá theo định dạng hiện tại.");
  const credentials = decryptChannelCredentials(encrypted.slice(SECRET_PREFIX.length));
  if (typeof credentials.value !== "string") throw new Error("Giá trị bí mật đã lưu không hợp lệ.");
  return credentials.value;
}

export function readStoredSecret(value: string) {
  return value.startsWith(SECRET_PREFIX) ? decryptSecretValue(value) : value;
}

export function isEncryptedSecret(value: string) {
  return value.startsWith(SECRET_PREFIX);
}
