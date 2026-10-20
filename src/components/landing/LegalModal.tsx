import { ShieldCheck, FileCheck, Lock, Trash2, EyeOff, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LegalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "privacy" | "terms";
}

export function LegalModal({ open, onOpenChange, type }: LegalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-stone-200 bg-white p-6 sm:p-8 max-h-[85vh] overflow-y-auto shadow-lift">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {type === "privacy" ? (
              <ShieldCheck className="h-5 w-5 text-primary" />
            ) : (
              <FileCheck className="h-5 w-5 text-primary" />
            )}
            <DialogTitle className="font-serif text-2xl font-bold">
              {type === "privacy" ? "DocuMind Privacy Architecture" : "Terms of Service"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {type === "privacy"
              ? "How DocuMind safeguards your research, academic files, and confidential presentations."
              : "Clear, transparent usage terms for the DocuMind workspace platform."}
          </DialogDescription>
        </DialogHeader>

        {type === "privacy" ? (
          <div className="space-y-4 text-xs text-foreground/80 leading-relaxed pt-2 font-sans">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex items-start gap-3">
              <EyeOff className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground text-sm">Zero Model Training Guarantee</p>
                <p className="mt-1 text-foreground/80">
                  DocuMind will never use your uploaded documents, lecture notes, financial
                  statements, or presentations to train, fine-tune, or evaluate any artificial
                  intelligence model.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Trash2 className="h-4 w-4 text-red-600" /> Automatic Zero Retention
                </span>
                <p className="text-stone-600">
                  Documents processed through our pipeline reside strictly in volatile RAM during
                  execution and are automatically purged after transformation.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Cpu className="h-4 w-4 text-primary" /> Client-Side Processing Priority
                </span>
                <p className="text-stone-600">
                  Where feasible, parsing and lightweight operations are executed directly inside
                  your browser via WebAssembly, eliminating network transit altogether.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1.5">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Lock className="h-4 w-4 text-emerald-700" /> End-to-End Transport Encryption
              </span>
              <p className="text-stone-600">
                All file transfers use TLS 1.3 encryption with ephemeral keys. Only the requesting
                client session holds access tokens to download the transformed output.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs text-foreground/80 leading-relaxed pt-2 font-sans">
            <div>
              <p className="font-bold text-foreground text-sm">1. Document Ownership</p>
              <p className="mt-1 text-stone-600">
                You retain complete, exclusive ownership and intellectual property rights over all
                documents, templates, and media files you upload to DocuMind. We claim no licenses
                beyond the technical permission required to render and transform your files.
              </p>
            </div>

            <div>
              <p className="font-bold text-foreground text-sm">2. Free Tier Usage Fair Limits</p>
              <p className="mt-1 text-stone-600">
                Free accounts may process documents up to 50 MB per file. Automated scraping,
                abusive bulk requests, or malicious payload injection will result in session
                termination.
              </p>
            </div>

            <div>
              <p className="font-bold text-foreground text-sm">3. Template License</p>
              <p className="mt-1 text-stone-600">
                Exported presentation decks generated using DocuMind themes may be used freely for
                both commercial and academic presentations without attribution required.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-stone-200">
          <Button variant="hero" size="sm" onClick={() => onOpenChange(false)}>
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
