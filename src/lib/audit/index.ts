import { getDb, isDatabaseConfigured } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

interface AuditLogPayload {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: { before?: unknown; after?: unknown; diff?: unknown };
  ipAddress?: string | null;
  userAgent?: string | null;
}

// In-memory fallback audit log store for dev/testing
declare global {
  // eslint-disable-next-line no-var
  var _memoryAuditLogs:
    | Array<AuditLogPayload & { id: string; createdAt: Date }>
    | undefined;
}

const memoryAuditLogs =
  global._memoryAuditLogs || (global._memoryAuditLogs = []);

export async function recordAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    if (isDatabaseConfigured()) {
      const db = getDb();
      await db.insert(auditLogs).values({
        userId: payload.userId || null,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        changes: payload.changes || {},
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
      });
      return;
    }
  } catch (error) {
    console.warn("Could not persist audit log to PostgreSQL:", error);
  }

  // In-memory fallback recording
  memoryAuditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...payload,
    createdAt: new Date(),
  });
}

export function getMemoryAuditLogs() {
  return [...memoryAuditLogs];
}
