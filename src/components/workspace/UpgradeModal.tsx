import { Sparkles, Check, Shield, Layers, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proThemeName?: string | undefined;
  onSelectFreeAlternative?: (() => void) | undefined;
}

export function UpgradeModal({
  open,
  onOpenChange,
  proThemeName,
  onSelectFreeAlternative,
}: UpgradeModalProps) {
  const proBenefits = [
    "Access to all 100+ presentation themes (including Pro-exclusive collections)",
    "Generate presentations with more than 20 slides (up to 50 slides)",
    "Higher monthly AI generation allowance",
    "Advanced layout & typography customization",
    "Priority document processing and queue throughput",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card p-6 sm:p-8 shadow-lift">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Pro Exclusive Theme
            </span>
          </div>

          <DialogTitle className="mt-2 font-serif text-2xl font-bold text-foreground">
            {proThemeName
              ? `Unlock "${proThemeName}" with DocuMind Pro`
              : "Upgrade to DocuMind Pro"}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {proThemeName ? (
              <>
                <span className="font-semibold text-foreground">{proThemeName}</span> is a
                Pro-exclusive presentation theme. Upgrade to access all 100+ themes and generate
                decks with more than 20 slides.
              </>
            ) : (
              "Enjoy unlimited access to all 100+ presentation themes and extended slide capacity."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Pricing Card Banner */}
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-mono uppercase text-primary font-bold">Pro Membership</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-bold text-foreground">100 ETB</span>
                <span className="text-xs text-muted-foreground font-sans">/ month</span>
              </div>
            </div>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-mono text-foreground font-semibold border border-border">
              Cancel Anytime
            </span>
          </div>

          <ul className="mt-4 space-y-2 border-t border-primary/10 pt-3 text-xs text-foreground/80 font-sans">
            {proBenefits.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Notice: Payment Gateway Status */}
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-surface-2 p-3 text-[11px] text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p>
            Payment provider integration is currently being finalized. Pro subscriptions will open
            shortly. All 50 free themes remain 100% free with zero watermarks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
          <Button
            variant="glass"
            className="w-full text-xs"
            onClick={() => {
              onOpenChange(false);
              if (onSelectFreeAlternative) onSelectFreeAlternative();
            }}
          >
            Explore 50 Free Themes Instead
          </Button>
          <Button
            variant="hero"
            className="w-full text-xs"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Got It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
