import { useState } from "react";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogoMark } from "./Logo";
import { useAuth } from "@/hooks/use-auth";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "signin" | "signup";
}

export function AuthModal({ open, onOpenChange, defaultMode = "signup" }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "google_connect">(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (mode === "google_connect") {
        if (!email.trim() || !email.includes("@")) {
          setErrorMessage("Please enter a valid Google email address.");
          setLoading(false);
          return;
        }
        const user = await signInWithGoogle(email.trim(), name.trim());
        toast.success("Signed in with Google!", {
          description: `Welcome to DocuMind, ${user.displayName || "Creator"}!`,
        });
        onOpenChange(false);
      } else if (mode === "reset") {
        await resetPassword(email);
        setResetSent(true);
        toast.success("Password reset instructions dispatched", {
          description: `Check ${email} for your password recovery link.`,
        });
      } else if (mode === "signup") {
        const user = await signUpWithEmail(email, password, name);
        toast.success("Account Created!", {
          description: `Welcome to DocuMind, ${user.displayName || "Creator"}!`,
        });
        onOpenChange(false);
      } else {
        const user = await signInWithEmail(email, password);
        toast.success("Welcome back!", {
          description: `Signed in as ${user.displayName || user.email}.`,
        });
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication error occurred.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);

    // If user already typed an email into the input, connect immediately
    if (email.trim() && email.includes("@")) {
      try {
        const user = await signInWithGoogle(email.trim(), name.trim());
        toast.success("Signed in with Google!", {
          description: `Welcome, ${user.displayName || "Creator"}!`,
        });
        onOpenChange(false);
        setLoading(false);
        return;
      } catch (err: unknown) {
        console.warn("Direct Google connect fallback:", err);
      }
    }

    try {
      const user = await signInWithGoogle();
      toast.success("Signed in with Google!", {
        description: `Welcome, ${user.displayName || "Creator"}!`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const isNeedsEmail =
        (typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "NEEDS_GOOGLE_EMAIL") ||
        (err instanceof Error && err.message === "NEEDS_GOOGLE_EMAIL");

      if (isNeedsEmail) {
        // Seamlessly transition to Google Connect mode
        setMode("google_connect");
        setErrorMessage(null);
      } else {
        const message = err instanceof Error ? err.message : "Google Sign-In failed.";
        setErrorMessage(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setErrorMessage(null);
    setResetSent(false);
    setEmail("");
    setPassword("");
    setName("");
    setMode(defaultMode);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md border-border bg-card p-6 sm:p-8 shadow-lift">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border shadow-xs mb-2 p-1.5">
            {mode === "google_connect" ? (
              <svg className="h-8 w-8" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            ) : (
              <LogoMark className="h-full w-full object-contain" />
            )}
          </div>
          <DialogTitle className="font-serif text-2xl font-bold text-foreground">
            {mode === "reset"
              ? "Reset your password"
              : mode === "google_connect"
                ? "Continue with Google"
                : mode === "signin"
                  ? "Welcome back to DocuMind"
                  : "Create your DocuMind account"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {mode === "reset"
              ? "Enter your email address to receive password reset instructions."
              : mode === "google_connect"
                ? "Connect with your Google email to sync your workspace presentations and documents."
                : mode === "signin"
                  ? "Access your saved document history, exports, and custom presets."
                  : "Start free with unlimited access to conversion, compression, and 100+ templates."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Switcher Tabs */}
        {mode !== "reset" && mode !== "google_connect" && (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMessage(null);
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "signup"
                  ? "bg-card text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Start for Free
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMessage(null);
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "signin"
                  ? "bg-card text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resetSent ? (
          <div className="mt-4 text-center space-y-4 py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-serif font-bold text-foreground text-lg">Instructions Sent</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Check <span className="text-foreground font-semibold">{email}</span> for
                instructions to reset your password.
              </p>
            </div>
            <Button
              variant="hero"
              className="w-full text-xs"
              onClick={() => {
                setResetSent(false);
                setMode("signin");
              }}
            >
              Back to Sign In
            </Button>
          </div>
        ) : mode === "google_connect" ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 font-sans">
            <div className="space-y-1.5">
              <label
                htmlFor="google-name"
                className="text-xs font-mono text-muted-foreground uppercase font-semibold"
              >
                Display Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="google-name"
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="google-email"
                className="text-xs font-mono text-muted-foreground uppercase font-semibold"
              >
                Google Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="google-email"
                  type="email"
                  required
                  autoFocus
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Connecting Google Account…
                </>
              ) : (
                "Continue with Google"
              )}
              {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMessage(null);
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1"
            >
              Back to Email Sign In
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1 text-center font-sans">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              Instant Google Workspace Authentication · No passwords required
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 font-sans">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-name"
                  className="text-xs font-mono text-muted-foreground uppercase font-semibold"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 px-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="text-xs font-mono text-muted-foreground uppercase font-semibold"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="text-xs font-mono text-muted-foreground uppercase font-semibold"
                  >
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 px-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing…
                </>
              ) : mode === "reset" ? (
                "Send Password Reset Link"
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Free Account"
              )}
              {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>

            {mode === "reset" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1"
              >
                Back to Sign In
              </button>
            )}

            {mode !== "reset" && (
              <>
                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-card px-2 text-[11px] font-mono text-muted-foreground uppercase">
                    Or continue with
                  </span>
                </div>

                <Button
                  type="button"
                  variant="glass"
                  className="w-full text-xs font-medium"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1 text-center font-sans">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Secure Workspace Authentication · 100% Free · No credit card required
                </p>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
