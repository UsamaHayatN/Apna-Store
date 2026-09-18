import crypto from "node:crypto";

/**
 * Generates a high-entropy cryptographically secure random token (64 hex characters).
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates a SHA-256 hash of a plain token string.
 * Used to store tokens securely in the database so that database leaks
 * do not expose actionable reset or verification tokens.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
