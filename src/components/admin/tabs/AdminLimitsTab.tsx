import React, { useState } from "react";
import {
  SlidersHorizontal,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Cpu,
  Clock,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AdminSystemSettingsState } from "../types";
import { updateAdminSettings } from "@/lib/api-client";

interface AdminLimitsTabProps {
  settings: AdminSystemSettingsState;
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminLimitsTab({
  settings,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminLimitsTabProps) {
  const [form, setForm] = useState<AdminSystemSettingsState>({ ...settings });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateAdminSettings(form, adminKey);
      if (res && res.success) {
        toast.success("Operational limits and engine thresholds saved successfully!");
        onRefresh();
      } else {
        toast.error("Failed to save settings.");
      }
    } catch {
      toast.error("Error saving limits");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Reset all operational limits to documented system defaults?")) {
      return;
    }
    const defaults: Partial<AdminSystemSettingsState> = {
      maxSlideCount: 50,
      aiTimeoutSeconds: 15,
      temperature: 0.7,
      aiEngineMode: "full",
      activeProvider: "gemini",
    };
    setForm({ ...form, ...defaults });
    toast.info("Restored default limits. Click 'Save Changes' to commit.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Fair-Use Limits & Engine Parameters
            </h3>
            <p className="text-xs text-muted-foreground">
              Regulate presentation deck boundaries, request timeout safeguards, and computational modes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetDefaults}
              className="text-xs font-mono gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </Button>

            <Button
              size="sm"
              variant="hero"
              disabled={saving}
              onClick={handleSave}
              className="text-xs font-mono gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save Changes</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Max Slide Count */}
          <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
            <label className="font-mono text-xs font-bold text-foreground block">
              Maximum Presentation Slides
            </label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Upper bound for slide deck creation to prevent runaway synthesis and client memory exhaustion.
            </p>
            <input
              type="number"
              min={3}
              max={60}
              value={form.maxSlideCount}
              onChange={(e) =>
                setForm({ ...form, maxSlideCount: parseInt(e.target.value) || 50 })
              }
              className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* AI Timeout Seconds */}
          <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
            <label className="font-mono text-xs font-bold text-foreground block">
              AI Request Timeout (Seconds)
            </label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Maximum wait time for external AI models before triggering the deterministic local fallback.
            </p>
            <input
              type="number"
              min={5}
              max={60}
              value={form.aiTimeoutSeconds}
              onChange={(e) =>
                setForm({ ...form, aiTimeoutSeconds: parseInt(e.target.value) || 15 })
              }
              className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
            <label className="font-mono text-xs font-bold text-foreground block">
              Model Sampling Temperature ({form.temperature})
            </label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Controls creative variation versus factual adherence during presentation text synthesis.
            </p>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={form.temperature}
              onChange={(e) =>
                setForm({ ...form, temperature: parseFloat(e.target.value) || 0.7 })
              }
              className="w-full accent-primary"
            />
          </div>

          {/* AI Engine Mode */}
          <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
            <label className="font-mono text-xs font-bold text-foreground block">
              Execution Mode
            </label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Full uses remote neural APIs; Balanced optimizes for speed; Local operates 100% offline.
            </p>
            <select
              value={form.aiEngineMode}
              onChange={(e) =>
                setForm({ ...form, aiEngineMode: e.target.value as any })
              }
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="full">Full (External Neural APIs + Imagen 3)</option>
              <option value="balanced">Balanced (Fast synthesis + Contextual graphics)</option>
              <option value="local">Local (Offline deterministic synthesis only)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
