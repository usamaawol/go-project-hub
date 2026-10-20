import { useState } from "react";
import { Check, Sparkles, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type StyleTheme = "modern" | "academic" | "minimal" | "creative";

interface ThemeMeta {
  id: StyleTheme;
  title: string;
  badge: string;
  font: string;
  desc: string;
}

const styles: ThemeMeta[] = [
  {
    id: "modern",
    title: "Modern Professional",
    badge: "Business Standard",
    font: "Newsreader + Manrope",
    desc: "Balanced 1.5 line height, navy hierarchy, executive metric callout cards, and clean section rules.",
  },
  {
    id: "academic",
    title: "Academic",
    badge: "Scholarly Archival",
    font: "Newsreader Serif",
    desc: "Formal numbered sections (1.0, 1.1), proportional margins, Latinate footnote citations, and muted contrast.",
  },
  {
    id: "minimal",
    title: "Minimal",
    badge: "Swiss Typographic",
    font: "Inter / Sans-Serif",
    desc: "Disciplined whitespace, unadorned structural grids, high legibility, and single-thought focus.",
  },
  {
    id: "creative",
    title: "Creative",
    badge: "Editorial Studio",
    font: "Newsreader Italic + Grotesk",
    desc: "Asymmetric pull quotes, soft lavender accent ribbons, expressive editorial margins, and magazine aesthetic.",
  },
];

export function DocumentShowcase() {
  const [activeStyle, setActiveStyle] = useState<StyleTheme>("modern");
  const [viewMode, setViewMode] = useState<"after" | "before">("after");

  const currentTheme = styles.find((s) => s.id === activeStyle) || styles[0]!;

  return (
    <section className="border-y border-stone-200/80 bg-stone-50/50 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Transformation Engine</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
            From rough content to polished work.
          </h2>
          <p className="mt-4 text-base text-foreground/70 leading-relaxed">
            Upload unformatted notes, raw drafts, or messy exports. DocuMind standardizes fonts,
            balances margins, and applies publication-grade layout rules in seconds.
          </p>
        </div>

        {/* Style Selector Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {styles.map((s) => {
              const isSelected = activeStyle === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveStyle(s.id);
                    setViewMode("after");
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-white shadow-xs"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  {s.title}
                </button>
              );
            })}
          </div>

          {/* Before/After Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => setViewMode("before")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                viewMode === "before"
                  ? "bg-stone-100 text-stone-900 font-bold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Rough Draft (Before)
            </button>
            <button
              onClick={() => setViewMode("after")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                viewMode === "after"
                  ? "bg-primary text-white font-bold shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              DocuMind Polished (After)
            </button>
          </div>
        </div>

        {/* Interactive Comparison Preview Stage */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.9fr] items-start">
          {/* Main Document Paper Sheet */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-10 shadow-paper relative min-h-[460px]">
            {viewMode === "before" ? (
              /* Before: messy unformatted document */
              <div className="font-serif text-stone-700 space-y-4 opacity-80">
                <div className="border-b border-dashed border-stone-300 pb-3">
                  <span className="font-mono text-[10px] text-red-600 font-semibold uppercase">
                    [Raw Draft File: notes_final_v1.txt]
                  </span>
                  <p className="text-xl font-bold mt-1 text-stone-900 tracking-tight">
                    annual summary meeting notes (draft)
                  </p>
                  <p className="text-[11px] text-stone-500 italic mt-0.5">
                    Written by alex / unorganized headings / no margin hierarchy
                  </p>
                </div>

                <div className="space-y-3 text-xs leading-normal">
                  <p className="font-bold text-stone-800">
                    Background context and issues we talked about:
                  </p>
                  <p className="text-stone-600">
                    We saw 28% expansion in European pilots last quarter, but our internal
                    documentation is scattered across 4 different drives. Team members spend 3 hours
                    per week re-formatting PDFs and fixing PowerPoint alignments manually...
                  </p>
                  <p className="font-bold text-stone-800 pt-2">Metrics mentioned in meeting:</p>
                  <p className="text-stone-500 font-mono text-[11px]">
                    - ARR: $18.4M (up 42% yoy) | Churn: 1.2% | Target Q4: $22M
                  </p>
                  <p className="text-stone-600">
                    Action items: clean up slide decks before the investor review next Friday. Make
                    sure the branding colors don&apos;t look tacky.
                  </p>
                </div>
              </div>
            ) : (
              /* After: Polished report styled to the active theme */
              <div className="space-y-6 animate-in fade-in duration-300">
                {activeStyle === "modern" && (
                  <div className="space-y-5">
                    <div className="border-b border-stone-200 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
                          Executive Synthesis // 2026
                        </span>
                        <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] text-primary font-semibold border border-blue-200">
                          Modern Professional
                        </span>
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-foreground mt-2">
                        Annual Performance Synthesis & Strategic Initiatives
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prepared by Executive Operations · Published October 2026
                      </p>
                    </div>

                    <p className="text-sm text-foreground/80 leading-relaxed font-sans">
                      European pilot expansion accelerated by{" "}
                      <span className="font-semibold text-primary">28%</span> quarter-over-quarter.
                      Workflow consolidation initiatives mitigated cross-functional document
                      latency, recapturing estimated productive engineering bandwidth.
                    </p>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                          ARR Growth
                        </span>
                        <span className="text-xl font-bold font-serif text-foreground mt-0.5 block">
                          $18.4M
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">+42% YoY</span>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                          Net Retention
                        </span>
                        <span className="text-xl font-bold font-serif text-foreground mt-0.5 block">
                          138%
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">Tier 1</span>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                          Gross Churn
                        </span>
                        <span className="text-xl font-bold font-serif text-foreground mt-0.5 block">
                          1.2%
                        </span>
                        <span className="text-[10px] text-primary font-semibold">Benchmark</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeStyle === "academic" && (
                  <div className="space-y-5 font-serif">
                    <div className="border-b border-stone-300 pb-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 uppercase">
                        <span>Journal of Systems & Society</span>
                        <span>Vol. 14, No. 3</span>
                      </div>
                      <h3 className="text-2xl font-bold text-stone-900 mt-2 tracking-tight">
                        Workflow Consolidation in Distributed Organizational Environments
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 italic">
                        A. Smith, D. R. Vance, and E. Laurent — Institute of Data & Documentation
                      </p>
                    </div>

                    <div className="text-xs leading-relaxed text-stone-800 space-y-3 font-serif">
                      <p className="font-bold text-[11px] uppercase tracking-wider text-stone-900">
                        1.0 Introduction and Empirical Baseline
                      </p>
                      <p>
                        Organizational friction arising from inconsistent document geometry
                        constitutes a non-trivial impediment to researcher velocity. In our sample
                        cohort (n = 450), standardized typographic rules reduced document parsing
                        errors by 38.2%.
                      </p>
                    </div>

                    <div className="border-t border-stone-200 pt-3 text-[10px] text-stone-500 font-mono flex justify-between">
                      <span>Footnote: DOI 10.1038/s41586-026-0819</span>
                      <span>p. 42–59</span>
                    </div>
                  </div>
                )}

                {activeStyle === "minimal" && (
                  <div className="space-y-6 font-sans">
                    <div className="space-y-1">
                      <span className="font-mono text-xs text-stone-400">
                        01 // Executive Brief
                      </span>
                      <h3 className="text-2xl font-bold text-stone-950 tracking-tight">
                        Strategic Priorities
                      </h3>
                    </div>

                    <div className="border-l-2 border-stone-950 pl-4 py-1">
                      <p className="text-sm font-medium text-stone-800 leading-relaxed">
                        “Eliminating manual formatting overhead returned 3 hours per week to every
                        knowledge worker.”
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
                      <p>
                        Swiss grid alignment. Uncluttered layout hierarchy. Pure white space gives
                        every metric and finding room to breathe.
                      </p>
                    </div>
                  </div>
                )}

                {activeStyle === "creative" && (
                  <div className="space-y-5">
                    <div className="border-l-4 border-lavender pl-4">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-lavender font-bold">
                        Editorial Perspective
                      </span>
                      <h3 className="text-2xl font-serif italic text-foreground mt-1">
                        The Art of Clarity
                      </h3>
                    </div>

                    <p className="text-xs font-sans text-stone-700 leading-relaxed">
                      Expressive typographic scale with generous margins and soft lavender highlight
                      accents. Designed for studio briefs, lookbooks, and pitch narratives.
                    </p>

                    <div className="rounded-xl border border-lavender/30 bg-purple-50/50 p-4 font-serif italic text-sm text-purple-950">
                      “A well-formatted document conveys credibility before the first sentence is
                      even read.”
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Style Blueprint & Details */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-paper">
              <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] font-semibold uppercase text-stone-700 border border-stone-200">
                {currentTheme.badge}
              </span>

              <h4 className="font-serif text-xl font-bold text-foreground mt-4">
                {currentTheme.title}
              </h4>
              <p className="text-xs text-foreground/70 leading-relaxed mt-2">{currentTheme.desc}</p>

              <div className="mt-5 space-y-2.5 text-xs text-stone-700 border-t border-stone-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">Typography</span>
                  <span className="font-semibold text-foreground">{currentTheme.font}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">Grid Alignment</span>
                  <span className="font-semibold text-foreground">Harmonic Scale</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">Table Standards</span>
                  <span className="font-semibold text-emerald-700">Auto-balanced</span>
                </div>
              </div>

              <Button
                variant="hero"
                className="w-full mt-6"
                onClick={() => {
                  toast.success(`Theme Applied: ${currentTheme.title}`, {
                    description:
                      "Your document will be formatted according to this layout template.",
                  });
                  document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Apply This Style to Your Document <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed px-1">
              * Design demonstration preview. The actual transformation will be powered by the
              formatting engine upon document processing rollout.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
