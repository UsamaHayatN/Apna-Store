"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Shield, Clock, Terminal, ChevronDown, ChevronUp } from "lucide-react";

export interface AuditLogItem {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

interface AuditTrailCardProps {
  logs: AuditLogItem[];
}

export function AuditTrailCard({ logs }: AuditTrailCardProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const getActionBadge = (action: string) => {
    if (action.includes("create") || action.includes("register")) {
      return <Badge variant="success" className="text-[9px] uppercase font-mono">{action}</Badge>;
    }
    if (action.includes("delete") || action.includes("suspend") || action.includes("disable")) {
      return <Badge variant="danger" className="text-[9px] uppercase font-mono">{action}</Badge>;
    }
    if (action.includes("update") || action.includes("role")) {
      return <Badge variant="warning" className="text-[9px] uppercase font-mono">{action}</Badge>;
    }
    return <Badge variant="outline" className="text-[9px] uppercase font-mono">{action}</Badge>;
  };

  return (
    <Card className="rounded-none border-neutral-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-900" />
              Security & Audit Trail
            </CardTitle>
            <CardDescription>
              Immutable cryptographic log of administrative and authentication events
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {logs.length} Logged Events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200">
            <Terminal className="w-6 h-6 mx-auto mb-2 text-neutral-300" />
            No audit events recorded yet in this session.
          </div>
        ) : (
          <div className="border border-neutral-200 divide-y divide-neutral-100 text-xs">
            {logs.slice(0, 15).map((log, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <div key={idx} className="p-3.5 hover:bg-neutral-50/50 transition-colors">
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                    onClick={() => toggleExpand(idx)}
                  >
                    <div className="flex items-center gap-2.5">
                      {getActionBadge(log.action)}
                      <span className="font-medium text-neutral-900 font-mono text-[11px]">
                        {log.entityType}: {log.entityId}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      {log.ipAddress && (
                        <span className="font-mono text-neutral-500 hidden sm:inline">
                          {log.ipAddress}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2 bg-neutral-50 p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-600">
                        <div>
                          <span className="font-medium text-neutral-800">Operator / User ID:</span>{" "}
                          <span className="font-mono">{log.userId || "System / Anonymous"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-neutral-800">Timestamp:</span>{" "}
                          <span>{new Date(log.timestamp).toISOString()}</span>
                        </div>
                        {log.ipAddress && (
                          <div>
                            <span className="font-medium text-neutral-800">IP Address:</span>{" "}
                            <span className="font-mono">{log.ipAddress}</span>
                          </div>
                        )}
                        {log.userAgent && (
                          <div className="col-span-1 sm:col-span-2 truncate">
                            <span className="font-medium text-neutral-800">User Agent:</span>{" "}
                            <span className="font-mono text-[10px]">{log.userAgent}</span>
                          </div>
                        )}
                      </div>

                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div>
                          <span className="font-medium text-neutral-800 text-[11px] block mb-1">
                            Payload Diff & Metadata (Redacted):
                          </span>
                          <pre className="p-2 bg-neutral-900 text-neutral-100 text-[10px] font-mono overflow-x-auto">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
