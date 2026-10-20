import { useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Presentation,
  Minimize2,
  ScanText,
  Wand2,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  Sparkles,
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

type ToolKey = "convert" | "present" | "compress" | "extract" | "format" | "understand";

interface ToolCard {
  id: ToolKey;
  icon: typeof ArrowRightLeft;
  title: string;
  desc: string;
  cta: string;
  badge?: string;
}

export function Tools() {
  const [activeModal, setActiveModal] = useState<ToolKey | null>(null);

  // Conversion studio states
  const [fromFmt, setFromFmt] = useState("PDF");
  const [toFmt, setToFmt] = useState("DOCX");
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState(false);

  // Extract OCR states
  const [copiedText, setCopiedText] = useState(false);

  // Formatting state
  const [formatStyle, setFormatStyle] = useState<"before" | "after">("after");

  // Summarize / understand state
  const [summaryGenerated, setSummaryGenerated] = useState(false);

  const tools: ToolCard[] = [
    {
      id: "convert",
      icon: ArrowRightLeft,
      title: "Convert Documents",
      desc: "Transform supported files into useful formats while keeping table structures, vectors, and font styles intact.",
      cta: "Open Converter",
    },
    {
      id: "present",
      icon: Presentation,
      title: "Create Presentations",
      desc: "Turn rough documents, notes, or outlines into visually polished slides paired with curated presentation themes.",
      cta: "Browse Presentation Themes",
    },
    {
      id: "compress",
      icon: Minimize2,
      title: "Compress Files",
      desc: "Reduce file size while preserving readability and layout as much as possible for email and portal limits.",
      cta: "Configure Compression",
      badge: "Essential",
    },
    {
      id: "extract",
      icon: ScanText,
      title: "Extract Text",
      desc: "Pull clean, editable text and structured markdown from supported scanned pages and image-based documents.",
      cta: "Test Text Extractor",
    },
    {
      id: "format",
      icon: Wand2,
      title: "Improve Formatting",
      desc: "Make documents cleaner, more consistent, and easier to read with balanced margins and typographic scales.",
      cta: "Preview Formatting",
    },
    {
      id: "understand",
      icon: BookOpen,
      title: "Understand Documents",
      desc: "Get optional AI-powered summaries, key takeaways, and guided next steps from lengthy research or reports.",
      cta: "Explore Document Guide",
      badge: "Optional AI",
    },
  ];

  const handleCardClick = (id: ToolKey) => {
    if (id === "compress") {
      document.getElementById("compression")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (id === "present") {
      document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (id === "understand") {
      document.getElementById("guidance")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setActiveModal(id);
  };

  const handleSimulateConvert = () => {
    setConverting(true);
    setConverted(false);
    setTimeout(() => {
      setConverting(false);
      setConverted(true);
      toast.success("Conversion Simulated", {
        description: `Transformed document from ${fromFmt} to ${toFmt} (Demo).`,
      });
    }, 1100);
  };

  const handleCopyText = () => {
    navigator.clipboard?.writeText(
      "EXECUTIVE SUMMARY // Q3 2026\nIndustrial electrification increased by 34% over baseline, driven by thermal storage and unified policy frameworks.",
    );
    setCopiedText(true);
    toast("Copied Text", { description: "Extracted content copied to clipboard." });
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <section id="tools" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="max-w-2xl">
        <p className="eyebrow">Studio Capabilities</p>
        <h2 className="mt-3 text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
          What would you like to do today?
        </h2>
        <p className="mt-4 text-base text-foreground/70 leading-relaxed">
          Choose a goal. DocuMind will help you get there with simple, reliable tools built for
          everyday documents.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <div
            key={t.id}
            onClick={() => handleCardClick(t.id)}
            className="group relative flex flex-col rounded-2xl border border-stone-200 bg-white p-7 text-left shadow-paper cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-lift hover:-translate-y-1"
          >
            {t.badge && (
              <span className="absolute right-5 top-5 rounded-full bg-stone-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-600 border border-stone-200">
                {t.badge}
              </span>
            )}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-foreground group-hover:border-primary/30 group-hover:bg-blue-50/60 group-hover:text-primary transition-colors">
              <t.icon className="h-6 w-6 stroke-[1.75]" />
            </div>

            <h3 className="mt-6 text-xl font-serif font-bold text-foreground group-hover:text-primary transition-colors">
              {t.title}
            </h3>
            <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{t.desc}</p>

            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary pt-2">
              {t.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        ))}
      </div>

      {/* Interactive Tool Experience Dialogs */}
      <Dialog open={!!activeModal} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-xl border-stone-200 bg-white p-6 sm:p-8 shadow-lift">
          {activeModal === "convert" && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                  <DialogTitle className="font-serif text-2xl font-bold">
                    Convert Documents
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-stone-600">
                  Select your source document and choose the desired target format.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase font-semibold">
                    From Format
                  </label>
                  <div className="flex gap-1.5">
                    {["PDF", "DOCX", "TXT", "PPTX"].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFromFmt(fmt)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                          fromFmt === fmt
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase font-semibold">
                    To Target
                  </label>
                  <div className="flex gap-1.5">
                    {["DOCX", "PPTX", "PDF", "TXT"].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setToFmt(fmt)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                          toFmt === fmt
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-2 text-xs text-foreground/80 font-sans">
                <div className="flex justify-between items-center">
                  <span>Layout Geometry Preservation</span>
                  <span className="font-mono text-emerald-700 font-semibold">Enabled</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Embedded High-Resolution Assets</span>
                  <span className="font-mono text-emerald-700 font-semibold">Lossless</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-stone-200">
                  <span>Sample file staged:</span>
                  <span className="font-mono">Quarterly_Report_Draft.pdf</span>
                </div>
              </div>

              {converting && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Converting typography and tables…</span>
                    <span>68%</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              )}

              {converted && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-emerald-950 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Quarterly_Report_Draft.{toFmt.toLowerCase()} ready (Demo)
                  </span>
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => toast("Sample download ready (simulated)")}
                  >
                    Download
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-200">
                <Button variant="ghost" onClick={() => setActiveModal(null)}>
                  Close
                </Button>
                <Button variant="hero" onClick={handleSimulateConvert} disabled={converting}>
                  {converting ? "Processing…" : `Simulate Conversion to ${toFmt}`}
                </Button>
              </div>
            </div>
          )}

          {activeModal === "extract" && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <ScanText className="h-5 w-5 text-amber-600" />
                  <DialogTitle className="font-serif text-2xl font-bold">Extract Text</DialogTitle>
                </div>
                <DialogDescription className="text-sm text-stone-600">
                  Extract readable text and tables from flattened images or scanned papers.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
                    Scanned Document Preview
                  </span>
                  <div className="relative rounded-lg border border-stone-200 bg-white p-3 h-40 flex flex-col justify-between overflow-hidden shadow-xs">
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-1/2 bg-stone-300 rounded" />
                      <div className="h-2 w-3/4 bg-stone-200 rounded" />
                      <div className="h-2 w-full bg-stone-200 rounded" />
                    </div>
                    <div className="rounded border border-primary/40 bg-blue-50/80 p-2 text-[9px] font-mono text-primary font-bold">
                      [Detected Paragraph: 99.2% confidence]
                    </div>
                    <div className="h-2 w-2/3 bg-stone-200 rounded" />
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary shadow-xs animate-scan" />
                  </div>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
                      Extracted Text
                    </span>
                    <button
                      onClick={handleCopyText}
                      className="text-xs font-mono text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedText ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white p-3 h-40 font-mono text-xs text-foreground/80 overflow-y-auto leading-relaxed shadow-xs">
                    <p className="font-bold text-foreground">EXECUTIVE SUMMARY // Q3 2026</p>
                    <p className="mt-2 text-stone-600 text-[11px]">
                      Industrial electrification increased by 34% over baseline, driven by thermal
                      storage and unified policy frameworks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-200">
                <Button variant="ghost" onClick={() => setActiveModal(null)}>
                  Close
                </Button>
                <Button variant="hero" onClick={handleCopyText}>
                  {copiedText ? "Copied to Clipboard" : "Copy Extracted Content"}
                </Button>
              </div>
            </div>
          )}

          {activeModal === "format" && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-600" />
                  <DialogTitle className="font-serif text-2xl font-bold">
                    Improve Formatting
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-stone-600">
                  Preview how DocuMind standardizes fonts, paragraph rhythm, and margin geometry.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <span className="text-xs font-mono text-muted-foreground uppercase font-semibold">
                  Compare Document Layout
                </span>
                <div className="flex gap-1 rounded-lg border border-stone-200 bg-stone-100 p-0.5">
                  <button
                    onClick={() => setFormatStyle("before")}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      formatStyle === "before"
                        ? "bg-white text-foreground shadow-xs font-semibold"
                        : "text-stone-600 hover:text-foreground"
                    }`}
                  >
                    Raw Draft
                  </button>
                  <button
                    onClick={() => setFormatStyle("after")}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      formatStyle === "after"
                        ? "bg-primary text-white shadow-xs font-semibold"
                        : "text-stone-600 hover:text-foreground"
                    }`}
                  >
                    Polished Work
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 min-h-[160px] shadow-inner">
                {formatStyle === "before" ? (
                  <div className="space-y-2.5 font-serif text-stone-600 opacity-70">
                    <p className="text-sm font-bold text-stone-900 tracking-tight">
                      quarterly_strategy_notes(1).docx
                    </p>
                    <p className="text-xs leading-normal">
                      inconsistent margin indentations... random font switches between Times and
                      Calibri... misaligned line spacing without typographic hierarchy.
                    </p>
                    <div className="h-2 w-1/3 bg-stone-300 rounded" />
                  </div>
                ) : (
                  <div className="space-y-2.5 bg-white p-4 rounded-lg border border-stone-200 shadow-xs">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold">
                      Section 01 // Executive Report
                    </span>
                    <h4 className="font-serif text-base font-bold text-foreground">
                      Strategic Priorities & Roadmap
                    </h4>
                    <p className="text-xs text-foreground/80 leading-relaxed font-sans">
                      Balanced 1.5 line height, 1-inch optical margins, and harmonious typographic
                      pairing set in Newsreader and Manrope.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-200">
                <Button variant="ghost" onClick={() => setActiveModal(null)}>
                  Close
                </Button>
                <Button
                  variant="hero"
                  onClick={() => {
                    toast.success("Formatting Applied", {
                      description: "Document styled with Intelligent Paper typography.",
                    });
                    setActiveModal(null);
                  }}
                >
                  Apply Formatting Rules
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
