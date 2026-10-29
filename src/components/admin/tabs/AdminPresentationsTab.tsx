import React, { useState } from "react";
import {
  Presentation,
  Download,
  Trash2,
  Search,
  Filter,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  Eye,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PresentationSessionItem } from "../types";

interface AdminPresentationsTabProps {
  presentations: PresentationSessionItem[];
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminPresentationsTab({
  presentations,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminPresentationsTabProps) {
  const [search, setSearch] = useState("");
  const [filterVisuals, setFilterVisuals] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Permanently delete this temporary presentation session and file from disk?")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/presentations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Presentation session deleted.");
        onRefresh();
      } else {
        toast.error("Failed to delete session.");
      }
    } catch {
      toast.error("Error deleting presentation");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = presentations.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.purpose.toLowerCase().includes(search.toLowerCase());
    const matchesVisuals =
      filterVisuals === "all" ||
      (filterVisuals === "has_visuals" && p.hasVisuals) ||
      (filterVisuals === "text_only" && !p.hasVisuals);
    return matchesSearch && matchesVisuals;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-base font-bold text-foreground">
            Ephemeral Presentation Sessions ({filtered.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Inspect real active presentation sessions, AI visual attachment status, and disk assets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search presentation title..."
              className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary w-48 sm:w-60"
            />
          </div>

          <select
            value={filterVisuals}
            onChange={(e) => setFilterVisuals(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Visual Types</option>
            <option value="has_visuals">With AI Visuals</option>
            <option value="text_only">Text Only</option>
          </select>
        </div>
      </div>

      {/* Presentations Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No active presentation sessions found on the server.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-mono uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Presentation Title</th>
                  <th className="py-3 px-4">Theme & Purpose</th>
                  <th className="py-3 px-4">Slides</th>
                  <th className="py-3 px-4">AI Visuals</th>
                  <th className="py-3 px-4">Expires In</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    {/* Title */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-foreground truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        ID: {item.id}
                      </div>
                    </td>

                    {/* Theme & Purpose */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-foreground block">
                        {item.themeName}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {item.purpose}
                      </span>
                    </td>

                    {/* Slides */}
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold text-foreground whitespace-nowrap">
                      {item.slideCount} Slides
                    </td>

                    {/* AI Visuals */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.hasVisuals ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <Sparkles className="h-3 w-3" /> {item.visualCount} Visual{item.visualCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-muted text-muted-foreground border border-border">
                          Text Layout
                        </span>
                      )}
                    </td>

                    {/* Expiration */}
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        {Math.floor(item.secondsRemaining / 60)}m {item.secondsRemaining % 60}s
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-7 px-2.5 text-[11px] font-mono gap-1"
                        >
                          <a href={`/api/presentations/${item.id}/download`} download>
                            <Download className="h-3.5 w-3.5" />
                            <span>Download PPTX</span>
                          </a>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteSession(item.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Purge session"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
