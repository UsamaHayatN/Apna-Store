import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Database, AlertTriangle, CheckCircle2, Server, KeyRound, ExternalLink, HelpCircle } from "lucide-react";
import { getDatabaseStatus } from "@/lib/db/status";

export async function DatabaseStatusCard() {
  const dbStatus = await getDatabaseStatus();

  return (
    <Card className="rounded-none border-neutral-200">
      <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-900 text-white">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Supabase & Database Connectivity</CardTitle>
              <CardDescription className="text-xs">PostgreSQL engine, connection status, and schema sync</CardDescription>
            </div>
          </div>
          <div>
            {dbStatus.status === "connected" ? (
              <Badge variant="success" className="px-3 py-1 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : dbStatus.status === "misconfigured_http" ? (
              <Badge variant="warning" className="px-3 py-1 text-xs bg-amber-100 text-amber-900 border-amber-300">
                <AlertTriangle className="w-3 h-3 mr-1 text-amber-700" />
                Needs PostgreSQL URI
              </Badge>
            ) : (
              <Badge variant="neutral" className="px-3 py-1 text-xs bg-neutral-200 text-neutral-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Pending Connection
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Status diagnosis banner */}
        {dbStatus.status === "connected" ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Database is actively connected!</p>
              <p className="mt-0.5 text-emerald-800">
                Live PostgreSQL database connection is operational. Schema migrations and seed records can be synced.
                {dbStatus.databaseDetails?.databaseName && (
                  <span className="block mt-1 text-[11px] font-mono">
                    Database: {dbStatus.databaseDetails.databaseName}
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : dbStatus.status === "misconfigured_http" ? (
          <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Action Needed: Replace HTTPS URL with PostgreSQL Connection String</p>
              <p className="text-amber-800 leading-relaxed">
                Currently, <code className="bg-amber-100 px-1 py-0.5 font-mono text-[11px]">DATABASE_URL</code> is set to your Supabase project web URL (<code className="bg-amber-100 px-1 py-0.5 font-mono text-[11px]">https://...supabase.co</code>).
                PostgreSQL and Drizzle ORM require a database connection string URI starting with <code className="bg-amber-100 px-1 py-0.5 font-mono text-[11px]">postgresql://...</code>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{dbStatus.message}</p>
            </div>
          </div>
        )}

        {/* Configuration Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 border border-neutral-200 bg-neutral-50/30 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
              <Server className="w-3.5 h-3.5" />
              <span>Supabase Project URL</span>
            </div>
            <div className="font-mono text-neutral-800 break-all text-[11px]">
              {dbStatus.supabaseUrl || "Not defined"}
            </div>
          </div>

          <div className="p-3 border border-neutral-200 bg-neutral-50/30 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Supabase API Key</span>
            </div>
            <div className="font-mono text-neutral-800 text-[11px]">
              {dbStatus.hasSupabaseKey ? "Configured (Publishable Key)" : "Not defined"}
            </div>
          </div>
        </div>

        {/* Instructions on how to get the correct URI */}
        {dbStatus.status !== "connected" && (
          <div className="border border-neutral-200 p-4 space-y-3 bg-neutral-50/50 text-xs">
            <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
              <span>How to obtain the PostgreSQL Connection URI from Supabase:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-neutral-600 leading-relaxed pl-1">
              <li>Log into your Supabase Dashboard and select your project.</li>
              <li>Click on the <strong>Settings</strong> (gear icon) at the bottom of the left sidebar.</li>
              <li>Select <strong>Database</strong> from the settings menu.</li>
              <li>Scroll down to the <strong>Connection string</strong> section and click the <strong>URI</strong> tab.</li>
              <li>
                Copy the connection string (format: <code className="bg-neutral-200 px-1 py-0.5 font-mono text-[10px]">postgresql://postgres:[PASSWORD]@...supabase.com:6543/postgres</code>).
              </li>
              <li>Replace <code className="font-mono text-[10px]">[PASSWORD]</code> with your actual Supabase database password.</li>
            </ol>
            <div className="pt-1 text-[11px] text-neutral-500">
              💡 You can simply paste this connection URI directly into the chat, and I will configure and verify it for you!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
