import { isDatabaseConfigured, getDb, schema } from "@/lib/db";

export interface AuditLogEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// In-memory buffer for development observability and testing verification
declare global {
  // eslint-disable-next-line no-var
  var _auditLogMemoryStore: (AuditLogEntry & { timestamp: string })[] | undefined;
}

const memoryLogs: (AuditLogEntry & { timestamp: string })[] =
  global._auditLogMemoryStore || (global._auditLogMemoryStore = []);

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "rawtoken",
  "secret",
  "authorization",
  "creditcard",
  "cvv",
]);

/**
 * Recursively redacts sensitive keys (passwords, tokens, secrets) from any object before logging.
 */
function sanitizeAuditPayload(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeAuditPayload);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      sanitized[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      sanitized[k] = sanitizeAuditPayload(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Records an immutable security audit event.
 * Never logs plaintext credentials or authentication secrets.
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const sanitizedChanges = entry.changes
    ? (sanitizeAuditPayload(entry.changes) as Record<string, unknown>)
    : null;

  const logPayload = {
    userId: entry.userId || null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    changes: sanitizedChanges,
    ipAddress: entry.ipAddress || null,
    userAgent: entry.userAgent || null,
    timestamp: new Date().toISOString(),
  };

  // Always buffer in memory for audit review and test assertion
  memoryLogs.push(logPayload);
  if (memoryLogs.length > 500) {
    memoryLogs.shift();
  }

  // Persist to Postgres database if configured
  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db.insert(schema.auditLogs).values({
        userId: entry.userId || null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: sanitizedChanges,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      });
    } catch (err) {
      console.warn("Failed to persist audit log to database:", err);
    }
  }
}

/**
 * Utility to retrieve recent audit logs (restricted to Owner and Admin roles).
 */
export function getRecentAuditLogs(limit: number = 50) {
  return [...memoryLogs].reverse().slice(0, limit);
}
