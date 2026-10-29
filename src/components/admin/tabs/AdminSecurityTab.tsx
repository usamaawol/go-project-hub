import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Key,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Loader2,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bootstrapAdminUser } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

interface AdminSecurityTabProps {
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminSecurityTab({ onRefresh }: AdminSecurityTabProps) {
  const { user } = useAuth();
  const [masterSecret, setMasterSecret] = useState("");
  const [targetEmail, setTargetEmail] = useState(user?.email || "");
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const handleBootstrapAdmin = async () => {
    if (!masterSecret.trim()) {
      toast.error("Please enter the Master Administrator Secret Key.");
      return;
    }

    setIsBootstrapping(true);
    try {
      const res = await bootstrapAdminUser({
        secretKey: masterSecret.trim(),
        uid: user?.uid,
        email: targetEmail.trim() || user?.email || undefined,
      });

      if (res && res.success) {
        toast.success(res.message || "Administrator permissions granted!");
        setMasterSecret("");
        onRefresh();
      } else {
        toast.error(res?.error?.message || "Invalid master administrator secret.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Bootstrap error");
    } finally {
      setIsBootstrapping(false);
    }
  };

  const securityGuards = [
    {
      title: "Real Server-Side ID Token Verification",
      description: "All /api/admin/* endpoints require verified Firebase ID tokens and Admin role claims, never client-side boolean flags.",
      status: "enforced",
    },
    {
      title: "Presentation Maker AI Image Exclusivity",
      description: "AI image generation is exclusively reserved for Presentation Maker. Blocked server-side for Document Studio and cover pages.",
      status: "enforced",
    },
    {
      title: "Encrypted & Masked Secret Storage",
      description: "Provider API keys are never bundled in client JavaScript, never written to public Firestore, and masked upon transmission.",
      status: "enforced",
    },
    {
      title: "Zero-Storage Ephemeral Privacy",
      description: "User presentation files and conversions are processed in isolated temporary storage and auto-purged on download.",
      status: "enforced",
    },
    {
      title: "Rate Limiting & Cooldown Protection",
      description: "Providers encountering rate limits (429) enter an automated 2-minute cooldown with automatic fallback cascade.",
      status: "enforced",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current Identity Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">
                Active Session Authorization
              </h3>
              <p className="text-xs text-muted-foreground">
                Verified administrative identity and credential level
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Authorized Administrator</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl border border-border bg-muted/20">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Identity / Email
            </span>
            <span className="text-foreground font-semibold mt-1 block truncate">
              {user?.email || "admin@documind.app"}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-border bg-muted/20">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Access Token Scheme
            </span>
            <span className="text-foreground font-semibold mt-1 block truncate">
              Firebase Admin Bearer + Key
            </span>
          </div>

          <div className="p-3 rounded-xl border border-border bg-muted/20">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Role Authority
            </span>
            <span className="text-purple-600 font-bold mt-1 block truncate">
              super_admin (Full Access)
            </span>
          </div>
        </div>
      </div>

      {/* Admin Bootstrap Form */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-serif text-base font-bold text-foreground">
              Master Administrator Bootstrap & Role Elevation
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 max-w-2xl">
              Elevate any registered account to administrator by providing the master administrator secret. This sets verified Firebase custom claims and updates the user role record in Cloud Firestore.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-semibold text-muted-foreground">
              Target User Email / UID
            </label>
            <input
              type="text"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="user@example.com or user UID..."
              className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-semibold text-muted-foreground">
              Master Administrator Secret
            </label>
            <input
              type="password"
              value={masterSecret}
              onChange={(e) => setMasterSecret(e.target.value)}
              placeholder="Enter server master secret key..."
              className="w-full h-9 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            variant="hero"
            disabled={isBootstrapping || !masterSecret.trim()}
            onClick={handleBootstrapAdmin}
            className="text-xs font-mono gap-1.5"
          >
            {isBootstrapping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            <span>Promote Account to Admin</span>
          </Button>
        </div>
      </div>

      {/* Security Architecture Guards Checklist */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-serif text-base font-bold text-foreground">
            DocuMind Security Architecture Guardrails
          </h3>
          <p className="text-xs text-muted-foreground">
            Strict verification checks enforced across all administrative endpoints and worker processes
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {securityGuards.map((g) => (
            <div
              key={g.title}
              className="p-3.5 rounded-xl border border-border/70 bg-muted/20 flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="font-serif text-xs font-bold text-foreground block">
                  {g.title}
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {g.description}
                </p>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="h-3 w-3" />
                <span>Enforced</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
