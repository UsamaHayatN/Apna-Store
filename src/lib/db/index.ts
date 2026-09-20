import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Single instance in development to prevent connection pool exhaustion across HMR/reloads
declare global {
  // eslint-disable-next-line no-var
  var _postgresClient: postgres.Sql | undefined;
}

function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("hgeckqqwhylkobvmfbja.supabase.co")) {
      url.hostname = "aws-0-ap-northeast-1.pooler.supabase.com";
      url.port = "6543";
      if (url.username === "postgres") {
        url.username = "postgres.hgeckqqwhylkobvmfbja";
      }
      return url.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

const connectionString = normalizeSupabaseUrl(process.env.DATABASE_URL || "");

let connectionDisabled = false;

export function isDatabaseConfigured(): boolean {
  if (connectionDisabled) return false;
  if (!connectionString) return false;

  const lower = connectionString.toLowerCase();
  if (
    lower.includes("your-password") ||
    lower.includes("your_password") ||
    lower.includes("your_database_password") ||
    lower.includes("[password]") ||
    lower.includes("<password>") ||
    lower.includes("your-db-password") ||
    lower.includes("placeholder")
  ) {
    return false;
  }

  return (
    connectionString.startsWith("postgresql://") ||
    connectionString.startsWith("postgres://")
  );
}

export function markDatabaseConnectionFailed(reason?: unknown): void {
  connectionDisabled = true;
  console.warn("Disabling direct PostgreSQL connection fallback to in-memory store due to connection failure:", reason);
}

/**
 * Executes a database query with automatic connection failure detection and immediate fallback.
 */
export async function safeDbQuery<T>(
  queryFn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
  fallback: () => Promise<T> | T
): Promise<T> {
  if (!isDatabaseConfigured()) {
    return fallback();
  }
  try {
    const db = getDb();
    return await queryFn(db);
  } catch (err: unknown) {
    const msg = String(err);
    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("CONNECT_TIMEOUT") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("EHOSTUNREACH")
    ) {
      markDatabaseConnectionFailed(err);
    }
    console.warn("DB query failed, smoothly falling back:", err);
    return fallback();
  }
}

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (isDatabaseConfigured()) {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const clientOptions: postgres.Options<{}> = {
      max: isProd ? 1 : 5, // max 1 for serverless/Vercel functions to prevent pool exhaustion
      idle_timeout: 10,
      connect_timeout: 3, // 3s fast fail-safe: never hang serverless requests
      ssl: "require",
      prepare: false, // Required for Supabase transaction/session poolers
    };

    if (isProd) {
      client = postgres(connectionString, clientOptions);
    } else {
      if (!global._postgresClient) {
        global._postgresClient = postgres(connectionString, clientOptions);
      }
      client = global._postgresClient;
    }
    dbInstance = drizzle(client, { schema });
  } catch (error) {
    console.warn("Failed to initialize PostgreSQL connection client:", error);
  }
}

/**
 * Returns the active Drizzle database client or throws a clean descriptive error
 * indicating that DATABASE_URL needs to be configured in settings.
 */
export function getDb() {
  if (!dbInstance) {
    throw new Error(
      "Database is not configured. Please set a valid DATABASE_URL in your environment variables to perform this operation."
    );
  }
  return dbInstance;
}

export { schema };
