// Encryption at rest for integration credentials (motte #37).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const VERSION = "v1"
const IV_BYTES = 12
const TAG_BYTES = 16

/** Reads the 32-byte key lazily, so nothing needs it until a secret is used. */
export type KeySource = () => string

function loadKey(source: KeySource): Buffer {
  const key = Buffer.from(source(), "base64")
  if (key.length !== 32)
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY must be 32 bytes, base64 (openssl rand -base64 32)"
    )
  return key
}

/**
 * AES-256-GCM. `context` is bound as associated data: a ciphertext only
 * decrypts with the context it was sealed with (e.g. its owner and provider),
 * so rows can't be swapped. Output: `v1:<base64 iv|tag|ciphertext>`.
 */
export function seal(source: KeySource, plaintext: string, context: string) {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", loadKey(source), iv)
  cipher.setAAD(Buffer.from(context))
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`
}

/** Inverse of `seal`; throws if the key, context or ciphertext don't match. */
export function open(source: KeySource, sealed: string, context: string) {
  const [version, payload] = sealed.split(":")
  if (version !== VERSION || !payload)
    throw new Error(`Unsupported ciphertext version: ${version}`)
  const raw = Buffer.from(payload, "base64")
  const decipher = createDecipheriv(
    "aes-256-gcm",
    loadKey(source),
    raw.subarray(0, IV_BYTES)
  )
  decipher.setAAD(Buffer.from(context))
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))
  return Buffer.concat([
    decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8")
}
