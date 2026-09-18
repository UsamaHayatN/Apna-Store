import fs from "node:fs";
import path from "node:path";
import { AuthUser } from "@/types";
import { hashPassword } from "./password";

export const DEV_ADMIN_EMAIL = "usamanissoana555@gmail.com";
export const DEV_ADMIN_USER_ID = "usr-dev-owner-usama";

const SEED_FILE_PATH = path.resolve(process.cwd(), ".dev-admin-seed.json");

/**
 * Loads the cached development admin user from disk if previously seeded.
 * The file only contains the PBKDF2 cryptographic hash, NEVER plaintext credentials.
 */
export function getDevAdminSeedFromDisk(): AuthUser | null {
  try {
    if (!fs.existsSync(SEED_FILE_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(SEED_FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data && data.email === DEV_ADMIN_EMAIL && data.passwordHash) {
      return {
        id: data.id || DEV_ADMIN_USER_ID,
        email: DEV_ADMIN_EMAIL,
        passwordHash: data.passwordHash,
        firstName: data.firstName || "Usama",
        lastName: data.lastName || "Owner",
        phone: data.phone || "+1 555-0100",
        role: "owner",
        status: "active",
        emailVerifiedAt: data.emailVerifiedAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // If reading fails or file is corrupted, safely return null
  }
  return null;
}

/**
 * Persists the development admin user (containing only cryptographic hash) to disk.
 */
export function saveDevAdminSeedToDisk(user: AuthUser): void {
  try {
    const payload = {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    fs.writeFileSync(SEED_FILE_PATH, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("⚠️  Unable to write local .dev-admin-seed.json cache:", err);
  }
}

/**
 * Creates or updates the development OWNER user using the environment password.
 * Securely hashes the password with PBKDF2-HMAC-SHA512.
 * Plaintext password is NEVER stored or logged.
 */
export async function createOrUpdateDevAdminUser(plainPassword: string): Promise<AuthUser> {
  const trimmed = plainPassword.trim();
  if (!trimmed) {
    throw new Error("INITIAL_ADMIN_PASSWORD must not be empty");
  }
  if (trimmed.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be at least 8 characters");
  }

  const passwordHash = await hashPassword(trimmed);
  const nowIso = new Date().toISOString();

  const user: AuthUser = {
    id: DEV_ADMIN_USER_ID,
    email: DEV_ADMIN_EMAIL,
    passwordHash,
    firstName: "Usama",
    lastName: "Owner",
    phone: "+1 555-0100",
    role: "owner",
    status: "active",
    emailVerifiedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  saveDevAdminSeedToDisk(user);
  return user;
}
