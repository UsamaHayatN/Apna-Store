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
    // Normalize any Supabase direct connection URL to use the connection pooler
    // This is required for serverless environments (Vercel, Netlify, etc.)
    // to prevent connection pool exhaustion
    if (url.hostname.includes(".supabase.co") && !url.hostname.includes("pooler")) {
      // Extract project ref from hostname (e.g., "xyzproject.supabase.co" -> "xyzproject")
      const projectRef = url.hostname.split(".")[0];
      url.hostname = `aws-0-ap-northeast-1.pooler.supabase.com`;
      url.port = "6543";
      if (url.username === "postgres") {
        url.username = `postgres.${projectRef}`;
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
 * Includes a per-query timeout to prevent hanging connections from blocking the serverless function.
 */
export async function safeDbQuery<T>(
  queryFn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
  fallback: () => Promise<T> | T,
  timeoutMs: number = 5000
): Promise<T> {
  if (!isDatabaseConfigured()) {
    return fallback();
  }
  try {
    const db = getDb();

    // Per-query timeout: prevents hanging connections from blocking everything
    const queryPromise = queryFn(db);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB query timed out")), timeoutMs)
    );

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err: unknown) {
    const msg = String(err);
    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("CONNECT_TIMEOUT") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("EHOSTUNREACH") ||
      msg.includes("SELF_SIGNED_CERT_IN_CHAIN") ||
      msg.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
      msg.includes("unable to get local issuer certificate") ||
      msg.includes("certificate has expired") ||
      msg.includes("timed out")
    ) {
      markDatabaseConnectionFailed(err);
    }
    console.warn("DB query failed, smoothly falling back:", err);
    return fallback();
  }
}

/**
 * Wraps any async operation with a timeout. Returns the fallback value if the
 * operation doesn't complete within timeoutMs.
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  fallback: T,
  timeoutMs: number = 5000,
  label: string = "operation"
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) =>
    setTimeout(() => {
      console.warn(`${label} timed out after ${timeoutMs}ms, using fallback`);
      resolve(fallback);
    }, timeoutMs)
  );

  return Promise.race([operation, timeoutPromise]);
}

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazily initialize the database connection.
 * On Vercel serverless, connecting at module-load time can cause cold start hangs.
 * We defer the connection until the first actual query.
 */
function initializeDatabase(): void {
  if (dbInstance) return;
  if (!isDatabaseConfigured()) return;

  try {
    const isProd = process.env.NODE_ENV === "production";
    const clientOptions: postgres.Options<{}> = {
      max: isProd ? 1 : 5, // max 1 for serverless/Vercel functions to prevent pool exhaustion
      idle_timeout: 5,
      connect_timeout: 5, // 5s — fail fast on Vercel serverless cold starts
      ssl: isProd ? "require" : { rejectUnauthorized: false },
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
    markDatabaseConnectionFailed(error);
  }
}

/**
 * Returns the active Drizzle database client or throws a clean descriptive error
 * indicating that DATABASE_URL needs to be configured in settings.
 */
export function getDb() {
  if (!dbInstance) {
    initializeDatabase();
  }
  if (!dbInstance) {
    throw new Error(
      "Database is not configured. Please set a valid DATABASE_URL in your environment variables to perform this operation."
    );
  }
  return dbInstance;
}

export { schema };
