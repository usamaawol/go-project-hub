import { useState } from "react";
import {
  Upload as UploadIcon,
  Sliders,
  Download,
  Info,
  Sparkles,
  Check,
  FileText,
  ArrowRight,
  Gauge,
  GraduationCap,
  Briefcase,
  Building2,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AuthModal } from "./AuthModal";
import { UpgradeModal } from "@/components/workspace/UpgradeModal";

function Heading({
  eyebrow,
  title,
  sub,
  center,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
        {title}
      </h2>
      {sub && <p className="mt-4 text-base text-foreground/70 leading-relaxed">{sub}</p>}
    </div>
  );
}

// ----------------------------------------------------
// Section 4.F: Compression Feature
// ----------------------------------------------------
const compressionProfiles = {
  Light: {
    name: "Light Compression",
    originalMb: 12,
    optimizedMb: 9.6,
    pct: 20,
    quality: "Near-original (220 DPI)",
    desc: "Maintains optimal print fidelity. Ideal for scholarly papers, portfolio submissions, and formal documents.",
    textClarity: "100% Vector Intact",
  },
  Balanced: {
    name: "Balanced Compression",
    originalMb: 12,
    optimizedMb: 8.0,
    pct: 33,
    quality: "Screen & Email (150 DPI)",
    desc: "The recommended standard. Sharp on displays and light enough to pass standard email attachment limits.",
    textClarity: "100% Vector Intact",
  },
  Strong: {
    name: "Strong Compression",
    originalMb: 12,
    optimizedMb: 4.8,
    pct: 60,
    quality: "Maximum Shrink (96 DPI)",
    desc: "Aggressive bitmap downsampling and stream compression for tight storage caps and fast network distribution.",
    textClarity: "100% Vector Intact",
  },
} as const;

type ProfileKey = keyof typeof compressionProfiles;

export function Compression() {
  const [profile, setProfile] = useState<ProfileKey>("Balanced");
  const data = compressionProfiles[profile];

  return (
    <section id="compression" className="border-y border-stone-200/80 bg-stone-50/50 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Heading
              eyebrow="Compression Studio"
              title="Smaller files. Work that stays intact."
              sub="Reduce document size for easier sharing and storage, with controls that help you balance file size and visual quality."
            />

            <div className="mt-8 space-y-3.5 text-sm">
              {[
                "Preserves clean typography, selectable text, and vector path sharpness",
                "Selective image re-encoding with bicubic downsampling",
                "Subsets unused font glyphs and purges redundant document metadata",
                "Ideal for portal upload caps and strict email gateways",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary border border-blue-200">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground/80 font-medium">{feat}</span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Button
                variant="hero"
                onClick={() =>
                  document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Upload Document to Compress <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Interactive Compression Comparison Card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-paper">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <span className="font-semibold text-sm text-foreground block">
                    Q3_Annual_Report_Final.pdf
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Interactive compression benchmark demo
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                Illustrative Demo
              </span>
            </div>

            {/* Profile Selector */}
            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-primary" /> Select Compression Level:
              </label>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-stone-200 bg-stone-50 p-1">
                {(Object.keys(compressionProfiles) as ProfileKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setProfile(k)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      profile === k
                        ? "bg-white text-primary shadow-xs border border-stone-200"
                        : "text-stone-600 hover:text-foreground"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics Display */}
            <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4 text-center">
              <div>
                <p className="text-[11px] font-mono text-muted-foreground">Original File</p>
                <p className="mt-1 font-serif text-2xl font-bold text-foreground">
                  {data.originalMb} <span className="text-xs font-sans font-normal">MB</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-muted-foreground">Optimized Example</p>
                <p className="mt-1 font-serif text-2xl font-bold text-emerald-700">
                  {data.optimizedMb} <span className="text-xs font-sans font-normal">MB</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-muted-foreground">Estimated Reduction</p>
                <p className="mt-1 font-serif text-2xl font-bold text-primary">{data.pct}%</p>
              </div>
            </div>

            {/* Visual Quality Indicator */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>Visual Quality Rating</span>
                <span className="font-semibold text-foreground">{data.quality}</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${100 - data.pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>Text Quality: {data.textClarity}</span>
                <span>Savings: {(data.originalMb - data.optimizedMb).toFixed(1)} MB</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200/80">
              {data.desc}
            </p>

            <p className="mt-4 flex gap-1.5 border-t border-stone-100 pt-3 text-[11px] text-muted-foreground italic">
              <Info className="h-4 w-4 shrink-0 text-stone-400" />
              Actual results depend on file contents and format. Some files may not shrink
              significantly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------
// Section 4.G: Intelligent Document Guidance
// ----------------------------------------------------
interface GuidanceScenario {
  id: string;
  query: string;
  suggestedSteps: string[];
  recommendedTool: string;
  summary: string;
}

const guidanceScenarios: GuidanceScenario[] = [
  {
    id: "presentation",
    query: "I have a long PDF and need to present its main ideas.",
    summary:
      "For long documents, the optimal workflow extracts dense text, produces a structured outline, and wraps the content in a tailored presentation theme.",
    suggestedSteps: [
      "1. Extract the document's text.",
      "2. Generate a concise outline.",
      "3. Select a presentation theme.",
      "4. Create a presentation.",
      "5. Review and export the result.",
    ],
    recommendedTool: "Create Presentations → Lecture Serif Theme",
  },
  {
    id: "email",
    query: "My 35 MB thesis PDF exceeds the university upload limit.",
    summary:
      "When hitting strict submission boundaries, balanced compression deflates heavy bitmap figures while preserving vector math equations and citations.",
    suggestedSteps: [
      "1. Stage document in the compression module.",
      "2. Select Balanced mode (150 DPI).",
      "3. Inspect text sharpness on sample equations.",
      "4. Export optimized PDF under 10 MB.",
    ],
    recommendedTool: "Compress Files → Balanced Profile",
  },
  {
    id: "reformat",
    query: "I have an unformatted Word document that needs to look like a professional report.",
    summary:
      "Raw drafts benefit from standardized typographic scales, harmonic margins, and executive header hierarchies.",
    suggestedSteps: [
      "1. Upload rough draft.",
      "2. Select Modern Professional styling.",
      "3. Auto-align margins and line spacing.",
      "4. Download polished DOCX.",
    ],
    recommendedTool: "Improve Formatting → Modern Professional",
  },
];

export function IntelligentGuidance() {
  const [activeIdx, setActiveIdx] = useState(0);
  const scenario = guidanceScenarios[activeIdx]!;

  return (
    <section id="guidance" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[1.05fr_1.15fr] lg:items-center">
        <div>
          <Heading
            eyebrow="Workflow Assistant"
            title="Not sure which tool to use? Start here."
            sub="DocuMind's optional AI guide recommends the ideal sequence of steps based on your specific document goal. Explore suggested workflows or consult the assistant."
          />

          <div className="mt-8 space-y-2">
            <p className="text-xs font-mono uppercase text-muted-foreground font-semibold">
              Select an example question:
            </p>
            <div className="space-y-2">
              {guidanceScenarios.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    activeIdx === idx
                      ? "border-primary bg-blue-50/70 text-primary font-semibold shadow-xs"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <span className="font-serif italic font-normal mr-1.5 text-stone-400">“</span>
                  {s.query}
                  <span className="font-serif italic font-normal ml-1 text-stone-400">”</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            Optional AI feature · Demonstration responses shown
          </p>
        </div>

        {/* Chat-Style Assistant Cockpit */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 shadow-paper">
          <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary border border-blue-200">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">DocuMind Guide</p>
              <p className="text-[10px] font-mono text-muted-foreground">
                Interactive workflow preview
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* User Bubble */}
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-xs bg-stone-100 p-3.5 text-xs text-foreground font-medium shadow-xs">
              “{scenario.query}”
            </div>

            {/* Assistant Response Card */}
            <div className="max-w-[95%] rounded-2xl rounded-bl-xs border border-stone-200 bg-stone-50/70 p-5 space-y-3 shadow-inner">
              <p className="text-xs text-foreground/80 leading-relaxed font-sans">
                {scenario.summary}
              </p>

              <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold block">
                  Recommended Workflow:
                </span>
                <ul className="space-y-1.5 text-xs text-stone-700">
                  {scenario.suggestedSteps.map((step) => (
                    <li key={step} className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="font-mono text-[11px] text-stone-500">
                  Suggested Tool:{" "}
                  <strong className="text-foreground">{scenario.recommendedTool}</strong>
                </span>
                <Button
                  size="sm"
                  variant="hero"
                  onClick={() => {
                    toast.success("Workflow Activated", {
                      description: `Prepared workspace for: ${scenario.recommendedTool}`,
                    });
                    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Start This Workflow
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------
// Section 4.H: How It Works
// ----------------------------------------------------
export function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Choose your goal",
      desc: "Upload a supported file or choose a document tool.",
    },
    {
      num: "02",
      title: "Make it yours",
      desc: "Choose a format, style, template, or processing option.",
    },
    {
      num: "03",
      title: "Review and export",
      desc: "Preview the result and download your finished file when the relevant functionality is available.",
    },
  ];

  return (
    <section id="how" className="border-t border-stone-200/80 bg-stone-50/40 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Heading center eyebrow="Workflow" title="Three steps. A better document." />

        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-7 hidden h-0.5 flow-line opacity-30 md:block" />

          {steps.map((s) => (
            <div
              key={s.num}
              className="relative rounded-2xl border border-stone-200 bg-white p-7 text-center shadow-paper transition-all hover:border-primary/40 hover:shadow-lift"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 font-serif text-xl font-bold text-primary shadow-xs">
                {s.num}
              </div>
              <h3 className="mt-6 text-xl font-serif font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-foreground/70 leading-relaxed max-w-xs mx-auto">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------
// Section 4.I: Designed for Different People
// ----------------------------------------------------
export function DesignedForPeople() {
  const personas = [
    {
      id: "students",
      icon: GraduationCap,
      label: "For Students",
      tagline: "Academic clarity & thesis readiness",
      desc: "Prepare academic documents, extract notes, and organize presentation content without fighting layout software.",
      highlights: [
        "Thesis formatting templates",
        "Lecture notes to slide decks",
        "Citation footnote consistency",
      ],
    },
    {
      id: "professionals",
      icon: Briefcase,
      label: "For Professionals",
      tagline: "Speed, polish, and reliable delivery",
      desc: "Improve reports, convert files, and prepare polished business documents that look intentionally art-directed.",
      highlights: [
        "Executive summary styling",
        "Lossless PDF to DOCX/PPTX",
        "Email-ready compression",
      ],
    },
    {
      id: "business",
      icon: Building2,
      label: "For Businesses",
      tagline: "Consistent materials at team scale",
      desc: "Create consistent materials and streamline everyday document workflows across marketing, legal, and ops.",
      highlights: [
        "Harmonized typographic scales",
        "Lightweight batch operations",
        "Zero model training privacy",
      ],
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <Heading
        center
        eyebrow="Audience Focus"
        title="Designed for different people."
        sub="Whether you're finishing university course notes, closing an enterprise deal, or leading operations, DocuMind adapts to your narrative."
      />

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {personas.map((p) => (
          <div
            key={p.label}
            id={p.id}
            className="flex flex-col rounded-2xl border border-stone-200 bg-white p-7 shadow-paper transition-all hover:border-primary/40 hover:shadow-lift"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-primary">
              <p.icon className="h-6 w-6 stroke-[1.75]" />
            </div>

            <h3 className="mt-6 text-xl font-serif font-bold text-foreground">{p.label}</h3>
            <p className="mt-1 text-xs font-mono text-primary font-semibold">{p.tagline}</p>
            <p className="mt-3 text-sm text-foreground/70 leading-relaxed">{p.desc}</p>

            <ul className="mt-6 space-y-2 border-t border-stone-100 pt-4 text-xs text-stone-700 flex-1">
              {p.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="glass"
              className="mt-6 w-full text-xs"
              onClick={() => {
                toast(`Selected ${p.label}`, {
                  description: "Workspace configured for your workflow profile.",
                });
                document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore {p.label} Workflow
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------------------
// Section 4.J: Transparent Pricing & Plans
// ----------------------------------------------------
export function Pricing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const plans = [
    {
      name: "Free Plan",
      price: "0 ETB",
      sub: "Free Forever",
      cta: "Start Free Immediately",
      hero: false,
      desc: "Generous access for students, researchers, and creators with zero paywalls.",
      features: [
        "Exactly 50 free presentation themes across 10 categories",
        "Up to 20 slides per presentation deck",
        "Zero artificial watermarks on generated PPTX or DOCX",
        "Deterministic PDF, DOCX, and PPTX conversion",
        "Lossless PDF compression with visual control (up to 50 MB)",
        "Academic document formatting with cover page and headings",
        "No credit card required, instant access",
      ],
    },
    {
      name: "Pro Plan",
      price: "100 ETB",
      sub: "per month",
      cta: "Upgrade to Pro",
      hero: true,
      desc: "For power creators, teams, and high-stakes presentation authors.",
      features: [
        "All 100+ presentation themes (including 60 Pro-exclusive collections)",
        "Generate presentations with more than 20 slides (up to 50 slides)",
        "Higher monthly AI generation allowance",
        "Advanced typography and custom color palette overrides",
        "Priority document processing and queue throughput",
        "Dedicated customer support with 24-hour SLA",
        "Cancel anytime with one click",
      ],
    },
  ];

  return (
    <section
      id="pricing"
      className="border-t border-border bg-surface-2/40 py-24 transition-colors"
    >
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <Heading
          center
          eyebrow="Transparent Pricing"
          title="Simple, fair, and accessible to everyone."
          sub="Enjoy 50 presentation themes and essential document tools completely free of charge. Upgrade to Pro for 100 ETB / month whenever you need extended slide counts and exclusive themes."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-2xl border p-8 shadow-paper transition-all ${
                p.hero
                  ? "border-primary bg-card shadow-lift ring-1 ring-primary/20"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-foreground">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase border ${
                    p.hero
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-surface-2 text-foreground/80 border-border"
                  }`}
                >
                  {p.sub}
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-5xl font-bold text-foreground tracking-tight">
                  {p.price}
                </span>
                <span className="text-sm font-medium text-muted-foreground font-sans">
                  {p.name === "Free Plan" ? "/ forever" : "/ month"}
                </span>
              </div>

              <div className="my-7 h-px bg-border" />

              <ul className="flex-1 space-y-3 text-sm text-foreground/80">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-primary border border-primary/20 mt-0.5">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 w-full"
                variant={p.hero ? "hero" : "glass"}
                size="lg"
                onClick={() => {
                  if (p.hero) {
                    setUpgradeOpen(true);
                  } else {
                    document
                      .getElementById("presentation-maker")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                {p.cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode="signup" />
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </section>
  );
}

// ----------------------------------------------------
// Section 4.K: FAQ
// ----------------------------------------------------
const faqs: [string, string][] = [
  [
    "What is DocuMind?",
    "DocuMind is an all-in-one document workspace designed to help students, creators, and businesses convert, format, compress, extract, and design presentation decks from everyday documents.",
  ],
  [
    "Which file formats are supported?",
    "DocuMind is built around the core formats you use every day: PDF, Microsoft Word (DOCX), plain text (TXT), and PowerPoint presentations (PPTX).",
  ],
  [
    "Is DocuMind really 100% free?",
    "Yes. All 100+ presentation themes and document processing tools are free for every user. We do not have paid subscription tiers, Pro locks, or artificial export watermarks. A transparent fair-use limit of 50 MB per file ensures server health and speed for everyone.",
  ],
  [
    "Can I compress a PDF without damaging its content?",
    "Yes. DocuMind selectively downsamples embedded bitmap images while preserving vector paths, typography, and mathematical diagrams. Text remains fully sharp and selectable.",
  ],
  [
    "Can I create presentations from existing documents?",
    "Yes. You can upload an outline, article, or lecture notes, select a presentation theme from our 100+ gallery, and generate a structured deck tailored to your audience with real .pptx export.",
  ],
  [
    "Do I need AI to use the basic tools?",
    "No. Document conversion, file compression, typographic formatting, and text extraction rely on robust deterministic code. AI is an optional guide to help you choose themes or summarize outlines.",
  ],
  [
    "Are my documents private?",
    "Yes. In browser processing, documents never leave your device. When server conversion is active, files are kept only in volatile memory during transformation and purged immediately. We never train AI models on user documents.",
  ],
  [
    "Do I need to create an account to use DocuMind?",
    "No. You can freely convert, compress, extract, and generate presentations without creating an account. Sign-in is optional if you wish to sync your document history and bookmark preferred templates across devices.",
  ],
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24 lg:px-8">
      <Heading center eyebrow="Questions & Answers" title="Frequently Asked Questions" />
      <Accordion type="single" collapsible className="mt-10">
        {faqs.map(([q, a]) => (
          <AccordionItem key={q} value={q} className="border-stone-200">
            <AccordionTrigger className="text-left font-serif text-base font-bold text-foreground py-4 hover:no-underline hover:text-primary">
              {q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/75 leading-relaxed font-sans">
              {a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
