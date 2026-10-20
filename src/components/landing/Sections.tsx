import { useState } from "react";
import { Upload as UploadIcon, MousePointerClick, Download, Info, Sparkles, Check, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ThemeThumb } from "./ThemeThumb";
import { startFree } from "./Nav";
import { toast } from "sonner";

function Heading({ eyebrow, title, sub, center }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: UploadIcon, t: "Upload your file", d: "PDF, DOCX, TXT or PPTX — drag it in or browse." },
    { icon: MousePointerClick, t: "Choose a tool or design", d: "Pick a tool yourself, or take the guide's recommendation." },
    { icon: Download, t: "Preview and download", d: "Check the result side by side, then download." },
  ];
  return (
    <section id="how" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <Heading center eyebrow="How it works" title="Three steps. No learning curve." />
      <ol className="relative mt-16 grid gap-10 md:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-7 hidden h-0.5 flow-line opacity-50 md:block" />
        {steps.map((s, i) => (
          <li key={s.t} className="relative text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/50 bg-background text-cyan shadow-glow">
              <s.icon className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand font-mono text-[11px] font-bold text-primary-foreground">{i + 1}</span>
            </div>
            <h3 className="mt-6 text-lg font-semibold">{s.t}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const modes = {
  Light: { pct: 28, note: "Near-original quality. Best for print." },
  Balanced: { pct: 62, note: "Sharp on screen, much lighter. Best for email." },
  Strong: { pct: 81, note: "Smallest size. Best for quick sharing." },
} as const;
type Mode = keyof typeof modes;

export function Compression() {
  const [mode, setMode] = useState<Mode>("Balanced");
  const original = 24.6;
  const { pct, note } = modes[mode];
  const after = +(original * (1 - pct / 100)).toFixed(1);
  return (
    <section className="border-y border-border bg-surface/40 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <div>
          <Heading eyebrow="Compression" title="Smaller Files. Quality That Matters." sub="Choose how far to go. DocuMind shrinks images, fonts and embedded media while keeping text crisp." />
          <ul className="mt-8 space-y-3 text-sm">
            {["Fits email and portal upload limits", "Text stays selectable and sharp", "Compare before you download"].map((x) => (
              <li key={x} className="flex items-center gap-2.5"><Check className="h-4 w-4 text-success" /> {x}</li>
            ))}
          </ul>
        </div>
        <div className="panel rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Conference-Deck-Final.pdf</span>
            <span className="ml-auto rounded bg-warning/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning">Example</span>
          </div>
          <div role="radiogroup" aria-label="Compression mode" className="mt-6 grid grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1">
            {(Object.keys(modes) as Mode[]).map((m) => (
              <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                className={`rounded-md py-2 text-sm font-medium transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-muted-foreground">Original</p><p className="mt-1 font-mono text-2xl">{original} MB</p></div>
            <div><p className="text-xs text-muted-foreground">Optimized</p><p className="mt-1 font-mono text-2xl text-success">{after} MB</p></div>
            <div><p className="text-xs text-muted-foreground">Reduction</p><p className="mt-1 font-mono text-2xl text-cyan">−{pct}%</p></div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-2.5 rounded-full bg-muted-foreground/25" />
            <div className="h-2.5 rounded-full bg-success transition-all duration-500" style={{ width: `${100 - pct}%` }} />
          </div>
          <p className="mt-4 text-sm text-foreground">{note}</p>
          <p className="mt-4 flex gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" /> Illustrative values. Actual results depend on the source file — image-heavy documents shrink the most.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Assistant() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 lg:grid-cols-[1fr_1.1fr] lg:px-8">
      <Heading eyebrow="AI guide" title="A Little Guidance. A Much Easier Workflow." sub="The guide reads your document's structure and recommends a theme from our library — with reasons, not guesses." />
      <div className="panel overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm">
          <Sparkles className="h-4 w-4 text-cyan" /> <span className="font-medium">DocuMind Guide</span>
          <span className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground"><FileText className="h-3 w-3" /> BIO-201-notes.docx</span>
        </div>
        <div className="space-y-4 p-5">
          <div className="ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-primary/20 px-4 py-3 text-sm">
            Which presentation design works best for my university lecture notes?
          </div>
          <div className="max-w-[92%] rounded-xl rounded-bl-sm border border-border bg-background/70 p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your notes have <span className="text-foreground">6 sections, 14 diagrams and numbered citations</span>. I'd recommend:
            </p>
            <div className="mt-4 flex gap-4 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <div className="w-32 shrink-0"><ThemeThumb kind="academic" /></div>
              <div className="text-sm">
                <p className="font-semibold">Lecture Serif</p>
                <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  <li>· High-contrast serif headings read well in large halls</li>
                  <li>· Dedicated citation footer on every slide</li>
                  <li>· Full-width diagram layouts</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="hero" onClick={() => toast("Preview only", { description: "The guide will be live at launch." })}>Apply Lecture Serif</Button>
              <Button size="sm" variant="glass" onClick={() => document.getElementById("templates")?.scrollIntoView()}>See alternatives</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  const plans = [
    { name: "Free", price: "$0", sub: "Forever", cta: "Start for Free", hero: true, features: [
      { t: "Convert, compress, format & OCR", p: false }, { t: "Up to 50 MB per file", p: false }, { t: "Curated essential templates", p: false }, { t: "AI guide — daily limit", p: false },
    ] },
    { name: "Pro", price: "TBA", sub: "Planned", cta: "Join the waitlist", hero: false, features: [
      { t: "Full 100+ theme library", p: true }, { t: "Larger files & batch processing", p: true }, { t: "Brand kits & custom fonts", p: true }, { t: "Priority processing", p: true },
    ] },
  ];
  return (
    <section id="pricing" className="border-t border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <Heading center eyebrow="Pricing" title="Free first. Pro when you need it." />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {plans.map((p) => (
            <div key={p.name} className={`panel flex flex-col rounded-2xl p-8 ${p.hero ? "border-primary/60 shadow-glow" : ""}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{p.sub}</span>
              </div>
              <p className="mt-4 font-display text-4xl font-semibold">{p.price}</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f.t} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-success" /> {f.t}
                    {f.p && <span className="ml-auto rounded bg-violet/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-violet">Planned</span>}
                  </li>
                ))}
              </ul>
              <Button className="mt-8" variant={p.hero ? "hero" : "glass"} size="lg"
                onClick={p.hero ? startFree : () => toast("Thanks for your interest", { description: "Waitlist sign-up will open soon." })}>
                {p.cta} <ArrowRight />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  ["Which file formats are supported?", "DocuMind is built for PDF, DOCX, TXT and PPTX, including conversions between them."],
  ["Is there a file-size limit?", "Free accounts will support files up to 50 MB each. Higher limits are planned for Pro."],
  ["What happens to my files?", "Files are processed only to produce your result and are deleted automatically afterwards. We never use your documents to train models."],
  ["Will compression reduce quality?", "Light mode keeps near-original quality; Strong mode trades some image detail for size. Text always remains sharp. Results depend on the source file."],
  ["How does the AI choose a design?", "It looks at your document's structure — headings, density, images, citations — and recommends a matching theme from our existing library. You always have the final say."],
  ["Is DocuMind really free?", "Yes. The core tools are free with reasonable usage limits. Pro will add the full template library and higher limits."],
];

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-24 lg:px-8">
      <Heading center eyebrow="FAQ" title="Questions, answered." />
      <Accordion type="single" collapsible className="mt-10">
        {faqs.map(([q, a]) => (
          <AccordionItem key={q} value={q} className="border-border">
            <AccordionTrigger className="text-left font-medium hover:no-underline">{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
