import React, { useState } from "react";
import {
  Activity,
  Download,
  Search,
  Filter,
  Shield,
  Clock,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { StaffAuditLogItem, ImageLogItem } from "../types";
import { exportAdminAuditLogs } from "@/lib/api-client";

interface AdminLogsTabProps {
  auditLogs: StaffAuditLogItem[];
  imageLogs: ImageLogItem[];
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminLogsTab({
  auditLogs,
  imageLogs,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminLogsTabProps) {
  const [search, setSearch] = useState("");
  const [tabType, setTabType] = useState<"staff" | "image">("staff");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const data = await exportAdminAuditLogs(format, adminKey);
      const blob = new Blob(
        [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
        { type: format === "csv" ? "text/csv" : "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documind_audit_logs_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported audit logs as .${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export logs");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredStaffLogs = auditLogs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.staffName.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredImageLogs = imageLogs.filter((l) =>
    l.prompt.toLowerCase().includes(search.toLowerCase()) ||
    l.provider.toLowerCase().includes(search.toLowerCase()) ||
    (l.concept && l.concept.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Header with Switch and Export */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-base font-bold text-foreground">
            Activity & Operational Audit Trail
          </h3>
          <p className="text-xs text-muted-foreground">
            Trace administrative modifications, policy enforcement, and multi-provider generation runs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setTabType("staff")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                tabType === "staff"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Admin Changes ({auditLogs.length})
            </button>
            <button
              onClick={() => setTabType("image")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                tabType === "image"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Image Operations ({imageLogs.length})
            </button>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary w-40 sm:w-48"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={isExporting}
            onClick={() => handleExport("csv")}
            className="h-8 px-2.5 text-xs font-mono gap-1"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isExporting}
            onClick={() => handleExport("json")}
            className="h-8 px-2.5 text-xs font-mono gap-1"
          >
            <Download className="h-3 w-3" />
            <span>JSON</span>
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {tabType === "staff" ? (
          <div className="overflow-x-auto">
            {filteredStaffLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">
                No administrative audit records match your query.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-mono uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStaffLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-foreground font-semibold whitespace-nowrap">
                        {log.staffName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-primary">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filteredImageLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">
                No image generation records match your query.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-mono uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Concept / Slide</th>
                    <th className="py-3 px-4">Provider & Model</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredImageLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold text-foreground block truncate">
                          {log.concept || "Presentation Visual"}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground line-clamp-1">
                          {log.prompt}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="font-semibold text-foreground block">
                          {log.provider}
                        </span>
                        <span className="text-muted-foreground text-[10px] block">
                          {log.model}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {log.durationMs}ms
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                            log.status === "success"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : log.status === "fallback"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
