import { ArrowRight, FileText, Sparkles, UploadCloud, Gauge, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeThumb, type ThemeKind } from "./ThemeThumb";
import { startFree } from "./Nav";

export function Hero() {
  return (
    <section id="product" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div className="pointer-events-none absolute inset-0 grid-lines" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1fr_1.1fr] lg:px-8 lg:pt-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Your Documents. Smarter.
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.6rem]">
            Every Document.
            <br />
            <span className="text-gradient">A Smarter Way Forward.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Convert files, create beautiful presentations, refine documents, and reduce file sizes — all from one intelligent workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="hero" size="lg" onClick={startFree}>
              Start for Free <ArrowRight />
            </Button>
            <Button variant="glass" size="lg" asChild>
              <a href="#tools">Explore Tools</a>
            </Button>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-cyan" />
            Simple workflows. Professional results. No complicated software.
          </p>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

const themes: ThemeKind[] = ["academic", "tech", "business", "minimal"];

function HeroVisual() {
  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="absolute -inset-6 rounded-3xl bg-primary/10 blur-3xl" />
      <div className="panel relative overflow-hidden rounded-2xl">
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">workspace / Q3-lecture-notes.pdf</span>
          <span className="w-10" />
        </div>
        <div className="grid grid-cols-[1fr_1.15fr] gap-3 p-3 sm:p-4">
          {/* left column */}
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-center">
              <UploadCloud className="mx-auto h-5 w-5 text-cyan" />
              <p className="mt-1 text-[11px] font-medium">Drop files to begin</p>
              <p className="text-[10px] text-muted-foreground">PDF · DOCX · TXT · PPTX</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="truncate text-[11px] font-medium">Q3-lecture-notes.pdf</span>
              </div>
              <div className="mt-2 rounded-md bg-paper p-2.5">
                <div className="h-1.5 w-2/3 rounded bg-ink" />
                <div className="mt-2 space-y-1">
                  {[100, 92, 96, 70, 88, 60].map((w, i) => (
                    <div key={i} className="h-[3px] rounded bg-ink/20" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="mt-2 h-8 rounded bg-primary/15" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-medium"><Gauge className="h-3.5 w-3.5 text-success" /> Optimize</span>
                <span className="font-mono text-success">−62%</span>
              </div>
              <div className="mt-2 space-y-1.5 font-mono text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2"><span className="w-10">Before</span><div className="h-1.5 flex-1 rounded bg-muted-foreground/40" /><span>8.4 MB</span></div>
                <div className="flex items-center gap-2"><span className="w-10">After</span><div className="h-1.5 w-[38%] rounded bg-success" /><span className="ml-auto">3.2 MB</span></div>
              </div>
            </div>
          </div>
          {/* right column */}
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-medium">Presentation preview</span>
                <span className="font-mono text-muted-foreground">12 slides</span>
              </div>
              <ThemeThumb kind="academic" className="ring-2 ring-primary" />
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {themes.map((t, i) => (
                  <ThemeThumb key={t} kind={t} className={i === 0 ? "ring-1 ring-cyan" : "opacity-70"} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-violet/40 bg-violet/10 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-cyan" /> Design suggestion
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Your notes have dense headings and citations. <span className="text-foreground">Lecture Serif</span> keeps them readable from the back row.
              </p>
              <button className="mt-2 inline-flex items-center text-[11px] font-semibold text-cyan" tabIndex={-1}>
                Apply theme <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
