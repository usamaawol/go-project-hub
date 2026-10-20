import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Lock,
  UploadCloud,
  X,
  Presentation,
  Minimize2,
  ArrowRightLeft,
  ScanText,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type FileItem = {
  id: string;
  name: string;
  size: string;
  bytes: number;
  progress: number;
  type: "pdf" | "docx" | "txt" | "pptx";
  error?: string | undefined;
};

const samples = [
  { name: "Academic_Lecture_Notes.docx", size: "1.8 MB", bytes: 1800000, type: "docx" as const },
  { name: "Executive_Strategy_2026.pdf", size: "8.4 MB", bytes: 8400000, type: "pdf" as const },
  { name: "Seed_Pitch_Deck.pptx", size: "14.2 MB", bytes: 14200000, type: "pptx" as const },
  { name: "Clinical_Trial_Summary.txt", size: "280 KB", bytes: 280000, type: "txt" as const },
];

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTS = ["pdf", "docx", "doc", "txt", "pptx", "ppt"];

const fmt = (b: number) =>
  b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;

const detectType = (name: string): "pdf" | "docx" | "txt" | "pptx" => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "pptx" || ext === "ppt") return "pptx";
  return "txt";
};

export function Upload() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulated upload progress ticker
  useEffect(() => {
    if (!items.some((i) => i.progress < 100 && !i.error)) return;
    const interval = setInterval(() => {
      setItems((prev) =>
        prev.map((i) => {
          if (i.progress >= 100 || i.error) return i;
          return {
            ...i,
            progress: Math.min(100, i.progress + 8 + Math.random() * 10),
          };
        }),
      );
    }, 120);
    return () => clearInterval(interval);
  }, [items]);

  const processFiles = (fileList: File[]) => {
    const newItems: FileItem[] = [];

    for (const f of fileList) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      let error: string | undefined;

      if (!ALLOWED_EXTS.includes(ext)) {
        error = "Unsupported format. Please select PDF, DOCX, TXT, or PPTX.";
      } else if (f.size > MAX_BYTES) {
        error = "File exceeds the 50 MB maximum size limit.";
      }

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        name: f.name,
        size: fmt(f.size),
        bytes: f.size,
        progress: error ? 100 : 0,
        type: detectType(f.name),
        error,
      });

      if (error) {
        toast.error("File Validation Error", { description: error });
      }
    }

    setItems((prev) => [...newItems, ...prev].slice(0, 4));
  };

  const handleAction = (toolTitle: string, fileName: string, targetId: string) => {
    toast(`Workspace Ready: ${toolTitle}`, {
      description: `Loaded "${fileName}" into studio memory for preview demonstration.`,
    });
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="workspace" className="relative mx-auto max-w-5xl px-5 pb-20 lg:px-8">
      {/* Workspace Header Toolbar */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-foreground/80">
            Document Studio · 100% Free Access
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground mr-1">
            Studio Theme:
          </span>
          <ThemeToggle />
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const dropped = Array.from(e.dataTransfer.files);
          if (dropped.length) processFiles(dropped);
        }}
        className={`rounded-2xl border bg-card p-3 sm:p-4 shadow-paper transition-all duration-300 ${
          drag ? "border-primary ring-2 ring-primary/20 shadow-lift" : "border-border"
        }`}
      >
        <div
          className={`rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            drag ? "border-primary bg-primary/10" : "border-border bg-muted/20"
          }`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-primary border border-border shadow-xs">
            <UploadCloud className="h-7 w-7 text-primary" />
          </div>

          <h3 className="mt-5 text-xl sm:text-2xl font-serif font-bold text-foreground">
            Drop your document here
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            or{" "}
            <button
              type="button"
              className="font-semibold text-primary underline underline-offset-4 hover:underline cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              browse from your computer
            </button>
          </p>

          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.docx,.doc,.txt,.pptx,.ppt"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) processFiles(files);
              e.target.value = "";
            }}
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {["PDF", "DOCX", "TXT", "PPTX"].map((t) => (
              <span
                key={t}
                className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs font-medium text-foreground shadow-xs"
              >
                {t}
              </span>
            ))}
            <span className="font-mono text-xs text-muted-foreground ml-1">· up to 50 MB</span>
          </div>

          {/* Quick Sample File Chips */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">Try with sample data:</span>
            {samples.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() =>
                  setItems((p) =>
                    [
                      {
                        id: Math.random().toString(36).substring(2, 9),
                        name: s.name,
                        size: s.size,
                        bytes: s.bytes,
                        progress: 0,
                        type: s.type,
                      },
                      ...p,
                    ].slice(0, 4),
                  )
                }
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors shadow-xs cursor-pointer"
              >
                + {s.name.split("_")[0]} ({s.size})
              </button>
            ))}
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            Your files stay private. In this frontend studio, documents remain strictly on your
            device.
          </p>
        </div>

        {/* Uploaded Documents List & Workflow Dispatcher */}
        {items.length > 0 && (
          <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="font-mono">
                {items.length} file{items.length > 1 ? "s" : ""} staged in studio
              </span>
              <button
                onClick={() => setItems([])}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Clear workspace
              </button>
            </div>

            <ul className="space-y-3">
              {items.map((i) => {
                const isComplete = i.progress >= 100 && !i.error;
                return (
                  <li
                    key={i.id}
                    className="rounded-xl border border-border bg-card p-4 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
                        {i.error ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate font-semibold text-foreground">{i.name}</span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">
                            {i.size}
                          </span>
                        </div>

                        {!i.error ? (
                          <>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
                              <div
                                className="h-full bg-primary transition-all duration-150"
                                style={{ width: `${i.progress}%` }}
                              />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {!isComplete
                                  ? `Simulating upload… ${Math.round(i.progress)}%`
                                  : "Document staged in client memory"}
                              </span>
                              {isComplete && (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium font-mono text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" /> Staged
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-destructive">{i.error}</p>
                        )}
                      </div>
                      <button
                        aria-label={`Remove ${i.name}`}
                        onClick={() => setItems((p) => p.filter((item) => item.id !== i.id))}
                        className="text-stone-400 hover:text-foreground p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Quick Transformation Actions for Staged Files */}
                    {isComplete && (
                      <div className="mt-3.5 border-t border-stone-200 pt-3">
                        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" /> Choose goal for this
                          document:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="glass"
                            className="text-xs h-8"
                            onClick={() => handleAction("Convert Documents", i.name, "tools")}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" /> Convert Format
                          </Button>
                          <Button
                            size="sm"
                            variant="glass"
                            className="text-xs h-8"
                            onClick={() =>
                              handleAction("Create Presentations", i.name, "templates")
                            }
                          >
                            <Presentation className="h-3.5 w-3.5 text-purple-600" /> Create Slides
                          </Button>
                          <Button
                            size="sm"
                            variant="glass"
                            className="text-xs h-8"
                            onClick={() => handleAction("Compress Files", i.name, "compression")}
                          >
                            <Minimize2 className="h-3.5 w-3.5 text-emerald-600" /> Compress File
                          </Button>
                          <Button
                            size="sm"
                            variant="glass"
                            className="text-xs h-8"
                            onClick={() => handleAction("Extract Text", i.name, "tools")}
                          >
                            <ScanText className="h-3.5 w-3.5 text-amber-600" /> Extract Text
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
