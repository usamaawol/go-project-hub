import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  User as UserIcon,
  Shield,
  FileText,
  Bookmark,
  Settings,
  Download,
  ExternalLink,
  Clock,
  Sparkles,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  HardDrive,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { AuthModal } from "@/components/landing/AuthModal";
import { useAuth } from "@/hooks/use-auth";
import { TEMPLATES } from "@/data/templates";
import { downloadTemplatePptx } from "@/lib/pptx-export";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account & Workspace History — DocuMind" },
      {
        name: "description",
        content: "Manage your DocuMind account, document jobs, and saved templates.",
      },
    ],
  }),
  component: AccountPage,
});

interface SavedJob {
  id: string;
  name: string;
  tool: string;
  format: string;
  originalSize: string;
  resultSize?: string;
  date: string;
  status: "completed" | "processing";
}

const mockHistory: SavedJob[] = [
  {
    id: "job-101",
    name: "Quarterly_Financial_Report_Q4.pdf",
    tool: "Compress Files (Balanced)",
    format: "PDF",
    originalSize: "18.4 MB",
    resultSize: "4.8 MB (-74%)",
    date: "Today at 2:15 PM",
    status: "completed",
  },
  {
    id: "job-102",
    name: "Series_A_Venture_Pitch.pptx",
    tool: "Presentation Studio (Series A Deck)",
    format: "PPTX",
    originalSize: "16 Slides",
    resultSize: "2.1 MB",
    date: "Yesterday at 11:30 AM",
    status: "completed",
  },
  {
    id: "job-103",
    name: "Clinical_Trial_Findings_Protocol.docx",
    tool: "Convert to PDF",
    format: "PDF",
    originalSize: "3.2 MB",
    resultSize: "1.9 MB",
    date: "Oct 18, 2026",
    status: "completed",
  },
];

function AccountPage() {
  const { user, logout, isFirebaseConfigured } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "bookmarks" | "settings">("history");
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(mockHistory);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [defaultCompression, setDefaultCompression] = useState("Balanced (60-75% reduction)");

  // Sample favorited templates
  const favoritedTemplates = TEMPLATES.slice(0, 4);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Preferences Saved", {
      description: "Your workspace defaults and display name have been updated.",
    });
  };

  const handleDownloadPptx = async (t: (typeof TEMPLATES)[0]) => {
    try {
      toast.info("Generating Presentation...", { description: `Exporting "${t.name}" to .pptx.` });
      const filename = await downloadTemplatePptx(t);
      toast.success("Downloaded!", { description: `Saved ${filename}.` });
    } catch {
      toast.error("Download failed.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <div
          className={`flex-1 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"} flex flex-col justify-between`}
        >
          <main className="mx-auto max-w-xl px-5 py-24 text-center my-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-6 shadow-xs">
              <UserIcon className="h-8 w-8" />
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              Sign in to view your history
            </h1>
            <p className="mt-3 text-sm text-foreground/70 leading-relaxed max-w-md mx-auto">
              DocuMind's tools and 110+ templates are accessible for everyone. Sign in or create a
              free account to sync your document transformations and bookmarked designs across
              devices.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button variant="hero" size="lg" onClick={() => setAuthOpen(true)}>
                Sign In to Your Account
              </Button>
              <Button variant="glass" size="lg" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Return to Workspace
                </Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode="signin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"} flex flex-col justify-between`}
      >
        <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8 w-full flex-1">
          {/* Navigation Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Link to="/" className="hover:text-primary transition-colors">
              DocuMind Home
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Account & Workspace</span>
          </div>

          {/* Profile Header Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="h-16 w-16 rounded-2xl object-cover border border-border shadow-xs"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 font-serif text-2xl font-bold">
                    {(user.displayName || user.email || "D")[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-serif text-2xl font-bold text-foreground">
                      {user.displayName || user.email?.split("@")[0] || "DocuMind Creator"}
                    </h1>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      100% Free Plan
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">{user.email}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      Auth: {user.providerId === "google.com" ? "Google SSO" : "Email & Password"}
                    </span>
                    <span>•</span>
                    <span>{isFirebaseConfigured ? "Firebase Cloud Sync" : "Local Workspace"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="glass" size="sm" asChild>
                  <a href="/#workspace">
                    <FileText className="h-4 w-4 mr-1.5" /> Launch Workspace
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await logout();
                    toast.success("Signed out successfully.");
                  }}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
                </Button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-mono text-muted-foreground uppercase">
                  Documents Handled
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-foreground">24</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-muted-foreground uppercase">
                  Presentations Built
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-primary">8 Decks</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-muted-foreground uppercase">
                  Data Storage Saved
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  142 MB
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-muted-foreground uppercase">
                  Access Level
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-foreground">Unlimited</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-8 flex gap-2 border-b border-border pb-3">
            <button
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-card text-primary shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Document Job History</span>
              <span className="rounded-full bg-surface-2 px-1.5 py-0.2 text-[10px] font-mono">
                {savedJobs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("bookmarks")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "bookmarks"
                  ? "bg-card text-primary shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              <span>Bookmarked Templates</span>
              <span className="rounded-full bg-surface-2 px-1.5 py-0.2 text-[10px] font-mono">
                {favoritedTemplates.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-card text-primary shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Workspace Preferences</span>
            </button>
          </div>

          {/* Tab Content 1: Job History */}
          {activeTab === "history" && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>Recent Document Jobs (30-day retention)</span>
                <span>All files processed deterministically</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                <div className="divide-y divide-border">
                  {savedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 gap-3 hover:bg-surface-2/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{job.name}</p>
                            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                              {job.format}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {job.tool} • {job.originalSize}{" "}
                            {job.resultSize && `→ ${job.resultSize}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-mono">
                        <span className="text-muted-foreground">{job.date}</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                        </span>
                        <Button
                          size="sm"
                          variant="glass"
                          className="h-8 text-xs"
                          onClick={() =>
                            toast.success(`Exporting ${job.name}`, {
                              description: "Ready for download.",
                            })
                          }
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Bookmarked Templates */}
          {activeTab === "bookmarks" && (
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-mono">
                  Saved Presentation Themes ({favoritedTemplates.length} of 110 Available)
                </p>
                <Link to="/" className="text-xs font-semibold text-primary hover:underline">
                  Browse Full Catalog →
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {favoritedTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-paper flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary font-bold">
                          {t.category}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {t.slidesCount} slides
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-lg font-bold text-foreground">
                        {t.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="glass"
                        className="text-xs flex-1"
                        onClick={() => handleDownloadPptx(t)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> PPTX
                      </Button>
                      <Button size="sm" variant="hero" className="text-xs flex-1" asChild>
                        <a href="/#workspace">Use</a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content 3: Settings */}
          {activeTab === "settings" && (
            <div className="mt-6 max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-paper">
              <h2 className="font-serif text-xl font-bold text-foreground">
                Workspace Preferences
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure your default document processing parameters and layout presets.
              </p>

              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase font-semibold">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase font-semibold">
                    Default Compression Engine
                  </label>
                  <select
                    value={defaultCompression}
                    onChange={(e) => setDefaultCompression(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option>Balanced (60-75% reduction, crisp text)</option>
                    <option>Aggressive (75-90% reduction, email-optimized)</option>
                    <option>Archival (Lossless metadata purge)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase font-semibold">
                    Presentation Export Aspect Ratio
                  </label>
                  <input
                    type="text"
                    disabled
                    value="16:9 Widescreen (Modern Standard)"
                    className="w-full rounded-lg border border-border bg-surface-2/60 px-3.5 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <Button type="submit" variant="hero" size="sm">
                    Save Workspace Defaults
                  </Button>
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem("documind_auth_session");
                      toast.info("Local Cache Cleared");
                    }}
                  >
                    Clear Local Cache
                  </Button>
                </div>
              </form>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
