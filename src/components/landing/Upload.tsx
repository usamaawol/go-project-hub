import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Lock, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = { name: string; size: string; progress: number };
const samples = [
  { name: "Annual-Report-2026.pdf", size: "6.8 MB" },
  { name: "Research-Proposal.docx", size: "1.2 MB" },
  { name: "Lecture-Week-4.pptx", size: "14.3 MB" },
];
const fmt = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function Upload() {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!items.some((i) => i.progress < 100)) return;
    const t = setInterval(() => {
      setItems((prev) => prev.map((i) => ({ ...i, progress: Math.min(100, i.progress + 4 + Math.random() * 10) })));
    }, 140);
    return () => clearInterval(t);
  }, [items]);

  const add = (list: { name: string; size: string }[]) =>
    setItems((p) => [...list.map((f) => ({ ...f, progress: 0 })), ...p].slice(0, 4));

  return (
    <section className="relative mx-auto max-w-5xl px-5 pb-24 lg:px-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          add(Array.from(e.dataTransfer.files).map((f) => ({ name: f.name, size: fmt(f.size) })));
        }}
        className={`panel rounded-2xl p-2 transition-all duration-300 ${drag ? "shadow-glow" : ""}`}
      >
        <div className={`rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${drag ? "border-cyan bg-cyan/5" : "border-border"}`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-cyan">
            <UploadCloud className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">Drop your document here</h2>
          <p className="mt-2 text-muted-foreground">
            or{" "}
            <button className="font-semibold text-cyan underline-offset-4 hover:underline" onClick={() => input.current?.click()}>
              browse files
            </button>
          </p>
          <input
            ref={input} type="file" hidden multiple accept=".pdf,.docx,.txt,.pptx"
            onChange={(e) => { add(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: fmt(f.size) }))); e.target.value = ""; }}
          />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {["PDF", "DOCX", "TXT", "PPTX"].map((t) => (
              <span key={t} className="rounded-md border border-border bg-background/60 px-2.5 py-1 font-mono text-xs text-muted-foreground">{t}</span>
            ))}
            <span className="ml-1 font-mono text-xs text-muted-foreground">· up to 50 MB</span>
          </div>
          <div className="mt-6">
            <Button variant="glass" size="sm" onClick={() => add([samples[Math.floor(Math.random() * samples.length)]!])}>
              Try with a sample file
            </Button>
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Your files stay private. In this preview, nothing leaves your browser.
          </p>
        </div>
        {items.length > 0 && (
          <ul className="space-y-2 p-3">
            {items.map((i, idx) => (
              <li key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 animate-in fade-in slide-in-from-top-1">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{i.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{i.size}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded bg-muted">
                    <div className="h-full bg-brand transition-all duration-150" style={{ width: `${i.progress}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {i.progress < 100 ? `Simulated upload… ${Math.round(i.progress)}%` : "Demo upload complete — processing isn't available in this preview."}
                  </p>
                </div>
                {i.progress >= 100 ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
                <button aria-label={`Remove ${i.name}`} onClick={() => setItems((p) => p.filter((_, j) => j !== idx))} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
