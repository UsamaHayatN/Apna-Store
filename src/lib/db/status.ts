import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config();

import postgres from "postgres";

export interface DatabaseStatusInfo {
  isConfigured: boolean;
  status: "connected" | "misconfigured_http" | "missing_credentials" | "connection_error";
  message: string;
  rawType: "postgres_uri" | "http_url" | "empty" | "invalid";
  supabaseUrl: string;
  hasSupabaseKey: boolean;
  databaseDetails?: {
    databaseName?: string;
    serverVersion?: string;
  };
}

export async function getDatabaseStatus(): Promise<DatabaseStatusInfo> {
  const url = process.env.DATABASE_URL || "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const hasSupabaseKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!url) {
    return {
      isConfigured: false,
      status: "missing_credentials",
      rawType: "empty",
      supabaseUrl,
      hasSupabaseKey,
      message: "DATABASE_URL environment variable is currently not set.",
    };
  }

  if (url.startsWith("https://") || url.startsWith("http://")) {
    return {
      isConfigured: false,
      status: "misconfigured_http",
      rawType: "http_url",
      supabaseUrl: supabaseUrl || url,
      hasSupabaseKey,
      message:
        "DATABASE_URL is set to a web URL (https://...) instead of a PostgreSQL URI (postgresql://...). PostgreSQL database connection requires a connection string URI.",
    };
  }

  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    return {
      isConfigured: false,
      status: "missing_credentials",
      rawType: "invalid",
      supabaseUrl,
      hasSupabaseKey,
      message: "DATABASE_URL must start with 'postgresql://' or 'postgres://'.",
    };
  }

  if (url.includes("[password]") || url.includes("YOUR_DATABASE_PASSWORD")) {
    return {
      isConfigured: false,
      status: "missing_credentials",
      rawType: "postgres_uri",
      supabaseUrl,
      hasSupabaseKey,
      message: "DATABASE_URL contains placeholder password text. Replace [password] with your actual Supabase database password.",
    };
  }

  // Attempt live connection handshake
  try {
    const sql = postgres(url, { connect_timeout: 4, max: 1 });
    const res = await sql`SELECT 1 as ok, current_database() as db_name, version() as ver;`;
    await sql.end();
    return {
      isConfigured: true,
      status: "connected",
      rawType: "postgres_uri",
      supabaseUrl,
      hasSupabaseKey,
      message: "PostgreSQL database is connected and active.",
      databaseDetails: {
        databaseName: res[0]?.db_name,
        serverVersion: res[0]?.ver ? String(res[0].ver).slice(0, 35) + "..." : undefined,
      },
    };
  } catch (err: any) {
    return {
      isConfigured: false,
      status: "connection_error",
      rawType: "postgres_uri",
      supabaseUrl,
      hasSupabaseKey,
      message: `Failed to connect to PostgreSQL server: ${err.message || String(err)}`,
    };
  }
}
