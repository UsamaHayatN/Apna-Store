import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Single instance in development to prevent connection pool exhaustion across HMR/reloads
declare global {
  // eslint-disable-next-line no-var
  var _postgresClient: postgres.Sql | undefined;
}

const connectionString = process.env.DATABASE_URL || "";

export function isDatabaseConfigured(): boolean {
  return (
    Boolean(connectionString) &&
    !connectionString.includes("YOUR_DATABASE_PASSWORD") &&
    !connectionString.includes("[password]") &&
    (connectionString.startsWith("postgresql://") ||
      connectionString.startsWith("postgres://"))
  );
}

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (isDatabaseConfigured()) {
  try {
    if (process.env.NODE_ENV === "production") {
      client = postgres(connectionString, { max: 10, idle_timeout: 20 });
    } else {
      if (!global._postgresClient) {
        global._postgresClient = postgres(connectionString, {
          max: 5,
          idle_timeout: 20,
        });
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
