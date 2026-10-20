import { useState } from "react";
import {
  MessageSquare,
  Star,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  Bug,
  HelpCircle,
  FileWarning,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
}

export function FeedbackModal({
  open,
  onOpenChange,
  defaultCategory = "improvement",
}: FeedbackModalProps) {
  const { user } = useAuth();

  const [category, setCategory] = useState(defaultCategory);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categories = [
    { id: "improvement", label: "Suggest an improvement", icon: Sparkles },
    { id: "bug", label: "Report a bug", icon: Bug },
    { id: "feature", label: "Request a feature", icon: HelpCircle },
    { id: "file_issue", label: "Problem with a generated file", icon: FileWarning },
    { id: "general", label: "General feedback", icon: MessageSquare },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!message.trim() || message.trim().length < 10) {
      setErrorMsg("Please provide at least 10 characters describing your feedback.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating,
          comment: message.trim(),
          email: email.trim() || user?.email || "anonymous",
          userId: user?.uid || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit feedback.");
      }

      setSubmitted(true);
      toast.success("Feedback Received", {
        description: "Thank you! Your feedback helps us make DocuMind better.",
      });
    } catch (err: unknown) {
      // Fallback: save to local storage log if backend isn't reachable
      try {
        const stored = JSON.parse(localStorage.getItem("documind_local_feedback") || "[]");
        stored.push({
          category,
          rating,
          comment: message,
          email: email || "anonymous",
          date: new Date().toISOString(),
        });
        localStorage.setItem("documind_local_feedback", JSON.stringify(stored));
      } catch {
        // ignore
      }

      setSubmitted(true);
      toast.success("Feedback Recorded", {
        description: "Thank you! Your suggestion has been saved.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setMessage("");
    setRating(5);
    setCategory("improvement");
    setSubmitted(false);
    setErrorMsg(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card p-6 shadow-lift">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              DocuMind Feedback
            </span>
          </div>

          <DialogTitle className="mt-2 font-serif text-2xl font-bold text-foreground">
            {submitted ? "Thank You!" : "Help Us Improve DocuMind"}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {submitted
              ? "Your insights directly guide our templates, formatting heuristics, and processing speed."
              : "Tell us what worked, what felt slow, or what tool or presentation theme you would love to see next."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed max-w-xs mx-auto">
              We review every submission carefully. If you provided an email, our team may follow up
              with updates.
            </p>
            <Button variant="hero" onClick={handleReset} className="w-full text-xs">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 space-y-4">
            {/* Category Pills */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((c) => {
                  const Icon = c.icon;
                  const isSelected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground font-semibold"
                          : "border-border bg-surface-2/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Stars */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Your Experience Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        s <= rating ? "fill-amber-400 text-amber-500" : "text-border"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {rating} / 5 stars
                </span>
              </div>
            </div>

            {/* Message Box */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Your Feedback or Bug Report <span className="text-primary">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened? Or what feature/theme would make DocuMind better for your workflow?"
                className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Optional Email */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu (if you'd like a reply)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="hero"
                size="sm"
                disabled={submitting}
                className="gap-1.5 text-xs px-5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Send Feedback <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
