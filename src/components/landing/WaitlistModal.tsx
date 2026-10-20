import { useState } from "react";
import { Sparkles, Check, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const proFeatures = [
  "Full 100+ presentation theme library",
  "Higher file limits up to 200 MB per file",
  "Batch document processing & CLI access",
  "Custom brand typography & color palettes",
];

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const [email, setEmail] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([proFeatures[0]!]);
  const [submitted, setSubmitted] = useState(false);
  const [queueNumber, setQueueNumber] = useState(384);

  const toggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const randomQueue = Math.floor(300 + Math.random() * 200);
    setQueueNumber(randomQueue);
    setSubmitted(true);
    toast.success("Joined Pro Waitlist!", {
      description: `You are #${randomQueue} in line for early Pro access.`,
    });
  };

  const handleClose = () => {
    setSubmitted(false);
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card text-card-foreground p-6 sm:p-8 shadow-lift">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <DialogTitle className="font-serif text-2xl font-bold text-foreground">
              Join the DocuMind Pro Waitlist
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Be the first to access our complete 100+ presentation theme library and enterprise
            limits.
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mt-3 space-y-4 font-sans">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground uppercase font-semibold">
                Which planned features are most critical for you?
              </label>
              <div className="space-y-1.5">
                {proFeatures.map((f) => {
                  const isChecked = selectedFeatures.includes(f);
                  return (
                    <button
                      type="button"
                      key={f}
                      onClick={() => toggleFeature(f)}
                      className={`w-full flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer ${
                        isChecked
                          ? "border-primary bg-primary/10 text-primary font-medium shadow-xs"
                          : "border-border bg-muted/40 text-foreground/80 hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isChecked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </span>
                      <span>{f}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="waitlist-email"
                className="text-xs font-mono text-muted-foreground uppercase font-semibold"
              >
                Your Email Address
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button type="submit" variant="hero" className="w-full">
              Reserve Your Priority Access <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-primary border border-blue-200 shadow-xs">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-mono text-xs font-semibold text-primary border border-blue-200">
                Waitlist Priority #{queueNumber}
              </span>
              <p className="font-serif font-bold text-foreground text-xl mt-3">
                You&apos;re on the list!
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                We reserved your spot for{" "}
                <span className="text-foreground font-semibold">{email}</span>. We&apos;ll notify
                you as soon as the Pro tier opens.
              </p>
            </div>
            <Button variant="glass" className="w-full" onClick={handleClose}>
              Back to Overview
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
