import { useState } from "react";
import { ArrowRight, ArrowRightLeft, Presentation, Wand2, Minimize2, ScanText, Compass } from "lucide-react";
import { toast } from "sonner";
import { ThemeThumb } from "./ThemeThumb";

const tools = [
  {
    id: "convert", icon: ArrowRightLeft, title: "Convert anything", desc: "Move between PDF, DOCX, TXT and PPTX while keeping layout and structure intact.", cta: "Convert a file",
    visual: (
      <div className="flex items-center justify-center gap-3 font-mono text-xs">
        <span className="rounded-md border border-border bg-background px-2.5 py-1.5">PDF</span>
        <span className="h-0.5 w-10 flow-line" />
        <span className="rounded-md border border-primary/60 bg-primary/10 px-2.5 py-1.5 text-cyan">DOCX</span>
      </div>
    ),
  },
  {
    id: "present", icon: Presentation, title: "AI presentation maker", desc: "Turn notes or reports into a structured deck with a theme picked from our library.", cta: "Build a deck",
    visual: (
      <div className="grid grid-cols-3 gap-1.5">
        <ThemeThumb kind="tech" /><ThemeThumb kind="pitch" /><ThemeThumb kind="education" />
      </div>
    ),
  },
  {
    id: "format", icon: Wand2, title: "Format & improve", desc: "Consistent headings, spacing and typography — your content, professionally set.", cta: "Polish a document",
    visual: (
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 rounded-md bg-paper/80 p-2 opacity-60">
          {[50, 90, 30, 80].map((w, i) => <div key={i} className="h-[3px] rounded bg-ink/40" style={{ width: `${w}%`, marginLeft: i % 2 ? 6 : 0 }} />)}
        </div>
        <div className="space-y-1 rounded-md bg-paper p-2">
          <div className="h-[5px] w-1/2 rounded bg-ink" />
          {[95, 90, 92].map((w, i) => <div key={i} className="h-[3px] rounded bg-ink/25" style={{ width: `${w}%` }} />)}
        </div>
      </div>
    ),
  },
  {
    id: "compress", icon: Minimize2, title: "Compress files", desc: "Shrink heavy PDFs and decks for email and upload limits, with quality you choose.", cta: "Reduce file size", featured: true,
    visual: (
      <div className="space-y-2 font-mono text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2"><span className="w-12">24.6 MB</span><div className="h-2 flex-1 rounded bg-muted-foreground/30" /></div>
        <div className="flex items-center gap-2"><span className="w-12 text-success">7.9 MB</span><div className="h-2 w-[32%] rounded bg-success" /><span className="ml-auto text-success">−68%</span></div>
      </div>
    ),
  },
  {
    id: "ocr", icon: ScanText, title: "Text extraction & OCR", desc: "Pull clean, editable text from scanned pages and image-based PDFs.", cta: "Extract text",
    visual: (
      <div className="relative h-14 overflow-hidden rounded-md bg-paper p-2">
        {[80, 95, 70, 88].map((w, i) => <div key={i} className="mb-1.5 h-[3px] rounded bg-ink/30" style={{ width: `${w}%` }} />)}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-cyan shadow-glow animate-scan" />
      </div>
    ),
  },
  {
    id: "guide", icon: Compass, title: "AI document guide", desc: "Not sure where to start? Describe your goal and get pointed to the right tool and theme.", cta: "Ask the guide",
    visual: (
      <div className="space-y-1.5 text-[11px]">
        <div className="ml-auto w-fit rounded-lg rounded-br-sm bg-primary/20 px-2.5 py-1.5">Make this email-friendly</div>
        <div className="w-fit rounded-lg rounded-bl-sm border border-border bg-background px-2.5 py-1.5 text-muted-foreground">Try Compress → Balanced</div>
      </div>
    ),
  },
];

export function Tools() {
  const [active, setActive] = useState("compress");
  return (
    <section id="tools" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="max-w-2xl">
        <p className="eyebrow">Tools</p>
        <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Everything Your Documents Need.</h2>
        <p className="mt-4 text-muted-foreground">Six focused tools, one workspace. Pick what you want to achieve — DocuMind handles the rest.</p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActive(t.id); toast(`${t.title}`, { description: "This tool is in development — you're viewing a design preview." }); }}
              className={`group panel relative flex flex-col rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 ${on ? "border-primary/60 shadow-glow" : ""} ${t.featured ? "lg:row-span-1" : ""}`}
            >
              {t.featured && <span className="absolute right-4 top-4 rounded-full bg-success/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">Popular</span>}
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg border ${on ? "border-primary/60 bg-primary/20 text-cyan" : "border-border bg-background text-muted-foreground group-hover:text-cyan"}`}>
                <t.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
              <div className="my-6 rounded-lg border border-border/70 bg-background/50 p-4">{t.visual}</div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                {t.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
