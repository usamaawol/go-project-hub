import React, { useState } from "react";
import {
  Settings,
  Save,
  AlertTriangle,
  Megaphone,
  CheckCircle2,
  Shield,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AdminSystemSettingsState } from "../types";
import { updateAdminSettings } from "@/lib/api-client";
import { TEMPLATES } from "@/data/templates";

interface AdminSettingsTabProps {
  settings: AdminSystemSettingsState;
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminSettingsTab({
  settings,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminSettingsTabProps) {
  const [form, setForm] = useState<AdminSystemSettingsState>({ ...settings });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateAdminSettings(form, adminKey);
      if (res && res.success) {
        toast.success("Platform settings and feature toggles saved successfully!");
        onRefresh();
      } else {
        toast.error("Failed to save platform settings.");
      }
    } catch {
      toast.error("Error saving feature settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Platform Feature Settings & Announcements
            </h3>
            <p className="text-xs text-muted-foreground">
              Control system availability, global banner broadcasts, and template governance
            </p>
          </div>

          <Button
            size="sm"
            variant="hero"
            disabled={saving}
            onClick={handleSave}
            className="text-xs font-mono gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Settings</span>
          </Button>
        </div>

        <div className="space-y-6 text-xs">
          {/* Maintenance Mode */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="font-serif font-bold text-sm text-foreground">
                  Maintenance Mode
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px] max-w-xl">
                When enabled, non-administrator visitors will see an informative maintenance notice during scheduled infrastructure updates.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="checkbox"
                id="maintenance-toggle"
                checked={form.maintenanceMode}
                onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="maintenance-toggle" className="font-mono text-xs font-semibold cursor-pointer">
                {form.maintenanceMode ? "Active (Under Maintenance)" : "Disabled (Online)"}
              </label>
            </div>
          </div>

          {/* Announcement Banner */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <span className="font-serif font-bold text-sm text-foreground">
                  Global System Announcement Banner
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="announcement-toggle"
                  checked={form.announcement?.enabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      announcement: {
                        ...form.announcement,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="announcement-toggle" className="font-mono text-xs font-semibold cursor-pointer">
                  {form.announcement?.enabled ? "Broadcast Active" : "Broadcast Off"}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-1.5">
                <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                  Banner Text
                </label>
                <input
                  type="text"
                  value={form.announcement?.text || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      announcement: {
                        ...form.announcement,
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="System message shown at the top of all pages..."
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-muted-foreground font-semibold">
                  Banner Type
                </label>
                <select
                  value={form.announcement?.type || "info"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      announcement: {
                        ...form.announcement,
                        type: e.target.value as any,
                      },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Amber)</option>
                  <option value="success">Success (Emerald)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Template Governance Summary */}
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Catalog Governance: 100% Free Policy</span>
            </div>
            <p className="text-emerald-700 dark:text-emerald-400 text-[11px] leading-relaxed">
              All <strong>{TEMPLATES.length}</strong> catalog templates are registered with <code>tier: &apos;free&apos;</code>. No watermarks, paywalls, or credit card requirements are enforced anywhere across the user workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
