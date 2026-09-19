import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config();

import postgres from "postgres";

async function testConnection() {
  const url = process.env.DATABASE_URL;
  console.log("--------------------------------------------------");
  console.log("Supabase / PostgreSQL Connection Diagnostic");
  console.log("--------------------------------------------------");

  if (!url) {
    console.log("❌ Result: DATABASE_URL is not defined in environment variables.");
    process.exit(1);
  }

  if (url.startsWith("https://")) {
    console.log("⚠️  Result: DATABASE_URL is currently set to an HTTP/REST endpoint:");
    console.log(`   ${url}`);
    console.log("   PostgreSQL database connection requires a 'postgresql://' connection URI, not an https:// URL.");
    process.exit(1);
  }

  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    console.log("⚠️  Result: DATABASE_URL must start with 'postgresql://' or 'postgres://'.");
    process.exit(1);
  }

  console.log("Attempting handshake with PostgreSQL host...");
  const maskedUrl = url.replace(/:[^:@]+@/, ":****@");
  console.log(`Connection target: ${maskedUrl}`);

  try {
    const sql = postgres(url, { connect_timeout: 5, max: 1 });
    const result = await sql`SELECT 1 as connected, current_database() as db_name, version() as pg_version;`;
    console.log("✅ Success! Database connected successfully!");
    console.log("   Database Name:", result[0].db_name);
    console.log("   Version:", result[0].pg_version?.slice(0, 40) + "...");
    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.log("❌ Connection attempt failed:", err.message || err);
    process.exit(1);
  }
}

testConnection();
