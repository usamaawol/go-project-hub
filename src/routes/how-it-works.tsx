import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  BookOpen,
  FileText,
  FileCode,
  Minimize2,
  Layers,
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  HelpCircle,
  Play,
  Lock,
  Download,
  FileCheck,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { restartProductTour } from "@/components/tour/ProductTour";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How DocuMind Works — Workflow Guide & Feature Breakdown" },
      {
        name: "description",
        content:
          "Learn how DocuMind transforms raw text into presentations, formats academic documents, compresses PDFs, and converts formats with privacy-first processing.",
      },
    ],
  }),
  component: HowItWorksPage,
});

export function HowItWorksPage() {
  const [collapsed, setCollapsed] = useState(false);

  const workflows = [
    {
      id: "presentation-maker",
      title: "1. Presentation Maker",
      subtitle: "Convert text, outlines, or reports into vector PowerPoint slides",
      badge: "AI-Assisted Workflow",
      color: "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400",
      route: "/presentation-maker",
      steps: [
        {
          num: "01",
          name: "Supply Your Content",
          desc: "Paste rough notes, executive briefs, meeting takeaways, or upload an existing PDF, DOCX, or TXT file.",
        },
        {
          num: "02",
          name: "AI Document Understanding",
          desc: "Our Gemini-powered engine extracts key ideas, structured headers, critical facts, and audience intent.",
        },
        {
          num: "03",
          name: "Theme Matching & Slide Curation",
          desc: "Browse recommended themes from our 50 free and 60 pro catalogs tailored to your subject tone.",
        },
        {
          num: "04",
          name: "Editable PPTX Download",
          desc: "Export standard widescreen 16:9 slides that can be opened in PowerPoint, Keynote, or Google Slides.",
        },
      ],
    },
    {
      id: "document-studio",
      title: "2. Document Studio",
      subtitle: "Academic and report typography separate from presentation decks",
      badge: "Editorial Formatting",
      color: "border-indigo-500/30 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400",
      route: "/document-studio",
      steps: [
        {
          num: "01",
          name: "Choose Academic Preset",
          desc: "Select APA 7th, MLA 9th, Chicago/Turabian, IEEE technical, or modern corporate business report.",
        },
        {
          num: "02",
          name: "Structured Cover Page",
          desc: "Supply author, institution, course, date, and abstract for automated title page assembly.",
        },
        {
          num: "03",
          name: "Typography & Margin Rules",
          desc: "Standardized 1-inch margins, running headers, table of contents, and hierarchical heading styling.",
        },
        {
          num: "04",
          name: "Clean Formatted Export",
          desc: "Download publication-ready documents ready for academic submission or client review.",
        },
      ],
    },
    {
      id: "converter",
      title: "3. Multi-Format Converter",
      subtitle: "Fast two-way conversions between PDF, DOCX, and TXT",
      badge: "Deterministic Conversion",
      color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
      route: "/converter",
      steps: [
        {
          num: "01",
          name: "Drop File in Browser",
          desc: "Drag and drop any supported document up to 50 MB into the conversion inspector.",
        },
        {
          num: "02",
          name: "Select Target Format",
          desc: "Choose between PDF, Microsoft Word (.docx), or plain UTF-8 text (.txt).",
        },
        {
          num: "03",
          name: "Serverless Parsing",
          desc: "Deterministic extraction preserves text paragraphs, line structures, and UTF-8 encoding.",
        },
        {
          num: "04",
          name: "Immediate Save",
          desc: "Download converted file instantly with zero waiting queues and no watermarks.",
        },
      ],
    },
    {
      id: "compressor",
      title: "4. Lossless PDF Compressor",
      subtitle: "Light, Balanced, and Strong compression with verified byte reduction",
      badge: "Ghostscript Engine",
      color: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
      route: "/pdf-compressor",
      steps: [
        {
          num: "01",
          name: "Upload Heavy PDF",
          desc: "Upload large reports, scanned lecture slides, or illustrated documentation.",
        },
        {
          num: "02",
          name: "Select Compression Profile",
          desc: "Pick Light (220 DPI for print), Balanced (150 DPI for web), or Strong (96 DPI for email).",
        },
        {
          num: "03",
          name: "Backend Stream Optimization",
          desc: "Deduplicates embedded fonts, flattens unused color spaces, and recompresses raster images.",
        },
        {
          num: "04",
          name: "Honest Byte Comparison",
          desc: "See real byte reduction stats calculated directly from original and compressed file sizes.",
        },
      ],
    },
    {
      id: "extractor",
      title: "5. Clean Text Extractor",
      subtitle: "Pull raw text from documents with word telemetry and search",
      badge: "Instant Telemetry",
      color: "border-cyan-500/30 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400",
      route: "/text-extractor",
      steps: [
        {
          num: "01",
          name: "Drop Document",
          desc: "Drop PDF, DOCX, or TXT file to inspect contents in milliseconds.",
        },
        {
          num: "02",
          name: "Telemetry Calculation",
          desc: "Live counts for total words, characters, lines, and average reading time.",
        },
        {
          num: "03",
          name: "Search & Inspect",
          desc: "Search within the extracted text with instant keyword occurrence highlighting.",
        },
        {
          num: "04",
          name: "Copy or Export",
          desc: "One-click copy to clipboard or clean .txt download for further processing.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        } flex flex-col justify-between pb-24 lg:pb-0`}
      >
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
          {/* Header section */}
          <div className="border-b border-border pb-8 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>DocuMind Architecture & Guides</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground">
              How DocuMind Works
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Every tool in DocuMind is purpose-built to solve specific document problems. Explore
              our workflows below or launch the guided interactive tour to see the controls in
              action.
            </p>

            {/* Launch Guided Tour CTA */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="hero"
                size="sm"
                onClick={() => {
                  restartProductTour();
                }}
              >
                <Play className="h-3.5 w-3.5 mr-1.5 fill-current" /> Launch Interactive Tour
              </Button>
              <Button variant="glass" size="sm" asChild>
                <Link to="/templates">
                  <Layers className="h-3.5 w-3.5 mr-1.5" /> Browse 110 Themes
                </Link>
              </Button>
            </div>
          </div>

          {/* Workflow Cards */}
          <div className="mt-12 space-y-12">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="rounded-3xl border border-border bg-card p-6 sm:p-8 lg:p-10 shadow-paper"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                  <div>
                    <span
                      className={`inline-block rounded-full border px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider mb-2 ${wf.color}`}
                    >
                      {wf.badge}
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                      {wf.title}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{wf.subtitle}</p>
                  </div>

                  <Button variant="glass" size="sm" asChild className="shrink-0">
                    <Link to={wf.route}>
                      Open Tool <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>

                {/* 4 Step Pipeline Grid */}
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {wf.steps.map((st) => (
                    <div
                      key={st.num}
                      className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-mono text-2xl font-bold text-primary/40 block">
                          {st.num}
                        </span>
                        <h3 className="mt-2 text-sm font-semibold text-foreground">{st.name}</h3>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          {st.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing & Free-First Transparency Section */}
          <div className="mt-16 rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-paper">
            <div className="text-center max-w-2xl mx-auto">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                Transparent Pricing
              </span>
              <h2 className="mt-2 font-serif text-3xl font-bold text-foreground">
                Free for Everyone. Affordable for Teams.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                We believe core document tools must be accessible to students, educators, and
                independent creators without mandatory subscriptions.
              </p>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
              {/* Free Tier */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col justify-between">
                <div>
                  <span className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                    Free Forever
                  </span>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-bold text-foreground">0 ETB</span>
                    <span className="text-xs text-muted-foreground">/ forever</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>50 fully editable presentation themes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Up to 20 slides per generated deck</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Full PDF, DOCX, and TXT converter</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Lossless PDF compression engine</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Zero watermarks or artificial limits</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-emerald-500/20">
                  <Button variant="hero" size="sm" className="w-full text-xs" asChild>
                    <Link to="/presentation-maker">Start Creating (Free)</Link>
                  </Button>
                </div>
              </div>

              {/* Pro Tier */}
              <div className="rounded-2xl border border-primary/40 bg-card p-6 flex flex-col justify-between shadow-card">
                <div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary uppercase">
                    Pro Workspace
                  </span>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-bold text-foreground">100 ETB</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Access to all 110 presentation themes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Generate decks with up to 50 slides</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Priority AI queue throughput</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Commercial licensing & corporate palettes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Telebirr, CBE Birr & Chapa payment methods</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <Button variant="glass" size="sm" className="w-full text-xs" asChild>
                    <Link to="/templates">Browse Pro Themes</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Security Guarantees */}
          <div className="mt-12 rounded-2xl border border-border bg-surface-2/30 p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Shield className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Zero Retention</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uploaded documents are processed ephemerally and discarded immediately after
                    delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Client-Side Speed</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Text extraction and format detection happen locally in your browser for instant
                    telemetry.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <FileCheck className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Native Vector Output</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Exported PowerPoint files contain true vector shapes, text boxes, and native
                    layouts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
