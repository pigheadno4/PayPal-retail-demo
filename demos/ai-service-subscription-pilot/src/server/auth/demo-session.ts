import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const SESSION_HOURS = 24;

function key(secret: string, purpose: string): Buffer {
  return createHmac("sha256", secret).update(purpose).digest();
}

function signature(value: string, secret: string): string {
  return createHmac("sha256", key(secret, "demo-session-cookie-v1")).update(value).digest("base64url");
}

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createSignedDemoSession(secret: string, clock: () => Date = () => new Date()) {
  const issuedAt = clock();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_HOURS * 60 * 60_000);
  const publicId = randomUUID();
  const rawToken = randomBytes(32).toString("base64url");
  const value = `${publicId}.${rawToken}.${expiresAt.getTime()}`;
  return {
    publicId,
    rawToken,
    tokenHash: hashSessionToken(rawToken),
    expiresAt,
    cookieValue: `${value}.${signature(value, secret)}`,
  } as const;
}

export function verifySignedDemoSession(cookieValue: string, secret: string, now = new Date()) {
  const [publicId, rawToken, expiresRaw, supplied] = cookieValue.split(".");
  if (!publicId || !rawToken || !expiresRaw || !supplied) throw new Error("invalid_session");
  const value = `${publicId}.${rawToken}.${expiresRaw}`;
  const expected = Buffer.from(signature(value, secret));
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("invalid_session");
  const expiresAt = new Date(Number(expiresRaw));
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) throw new Error("invalid_session");
  return { publicId, rawToken, tokenHash: hashSessionToken(rawToken), expiresAt } as const;
}

export function encryptDemoOtp(otp: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret, "demo-otp-cipher-v1"), iv);
  const ciphertext = Buffer.concat([cipher.update(otp, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptDemoOtp(value: string, secret: string): string {
  const [ivRaw, tagRaw, ciphertextRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !ciphertextRaw) throw new Error("invalid_ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(secret, "demo-otp-cipher-v1"), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

export function sessionHashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
