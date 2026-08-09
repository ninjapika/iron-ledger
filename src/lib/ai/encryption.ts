import "server-only";
import crypto from "crypto";

// A dedicated secret for encrypting user-supplied API keys at rest — kept
// separate from SESSION_SECRET (which signs session JWTs) so the two
// concerns can be rotated independently: rotating SESSION_SECRET logs
// everyone out, rotating this one would make stored API keys undecryptable,
// and neither should accidentally imply the other.
function getKey(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AI_KEY_ENCRYPTION_SECRET is missing or too short. Set a random 32+ character value in .env (e.g. `openssl rand -base64 32`)."
    );
  }
  // The secret itself is already high-entropy (same generation method as
  // SESSION_SECRET), so a plain hash to 32 bytes is enough here — no need
  // for a slow, brute-force-resistant KDF like scrypt, which is for
  // low-entropy human passwords.
  return crypto.createHash("sha256").update(secret).digest();
}

/** Encrypts a plaintext API key for storage. Stored format is
 * "iv.authTag.ciphertext", each segment base64 — never log or persist the
 * plaintext anywhere else. */
export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
}

/** Reverses encryptApiKey. Only ever call this immediately before an
 * outbound request to OpenRouter — never to populate a UI. */
export function decryptApiKey(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = stored.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Stored OpenRouter key is malformed — reconnect it from Settings.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}

/** A safe-to-store, safe-to-display fragment — first few + last 4 chars,
 * masked in between. Computed once at save time so the settings page never
 * needs to decrypt the real key just to render something on screen. */
export function maskApiKey(plaintext: string): string {
  if (plaintext.length <= 10) return "••••";
  return `${plaintext.slice(0, 6)}••••${plaintext.slice(-4)}`;
}
