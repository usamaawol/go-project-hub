import { useState } from "react";
import { ArrowRight, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeThumb, type ThemeKind } from "./ThemeThumb";

type T = { name: string; kind: ThemeKind; cat: string; slides: number };
const templates: T[] = [
  { name: "Lecture Serif", kind: "academic", cat: "Academic", slides: 24 },
  { name: "Quarterly Ledger", kind: "business", cat: "Business", slides: 18 },
  { name: "Neural Grid", kind: "tech", cat: "Technology", slides: 20 },
  { name: "Series A", kind: "pitch", cat: "Pitch Deck", slides: 14 },
  { name: "Findings Column", kind: "research", cat: "Research", slides: 22 },
  { name: "Classroom Bright", kind: "education", cat: "Education", slides: 16 },
  { name: "Folio Contrast", kind: "creative", cat: "Creative", slides: 12 },
  { name: "Quiet Space", kind: "minimal", cat: "Minimal", slides: 10 },
];
const cats = ["All", ...Array.from(new Set(templates.map((t) => t.cat)))];

export function Templates() {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<T | null>(null);
  const shown = cat === "All" ? templates : templates.filter((t) => t.cat === cat);

  return (
    <section id="templates" className="relative border-y border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">Template library</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">100+ Designs. One Perfect Presentation.</h2>
            <p className="mt-4 text-muted-foreground">A curated preview of our theme library — each designed for a specific kind of story.</p>
          </div>
          <Button variant="glass" onClick={() => toast("Full library coming soon", { description: "You're seeing a curated selection of 8 themes." })}>
            Explore All Templates <ArrowRight />
          </Button>
        </div>
        <div role="tablist" aria-label="Template categories" className="mt-10 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${cat === c ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((t) => (
            <button key={t.name} onClick={() => setOpen(t)} className="group text-left animate-in fade-in zoom-in-95 duration-300">
              <div className="relative overflow-hidden rounded-lg border border-border transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-glow">
                <ThemeThumb kind={t.kind} className="rounded-none transition-transform duration-500 group-hover:scale-[1.03]" />
                <span className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background"><Eye className="h-3.5 w-3.5" /> Preview</span>
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-medium">{t.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{t.cat}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl border-border bg-popover">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{open.name}</DialogTitle>
                <DialogDescription>{open.cat} · {open.slides} slide layouts</DialogDescription>
              </DialogHeader>
              <ThemeThumb kind={open.kind} className="rounded-lg" />
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => <ThemeThumb key={i} kind={open.kind} className={i ? "opacity-60" : "ring-2 ring-primary"} />)}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>
                <Button variant="hero" onClick={() => { toast("Theme saved for later", { description: "Applying themes will be available at launch." }); setOpen(null); }}>Use this theme</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
