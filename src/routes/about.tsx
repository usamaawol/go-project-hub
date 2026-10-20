import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Heart,
  Globe,
  Cpu,
  Shield,
  Layers,
  ArrowRight,
  FileText,
  Users,
  Award,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About DocuMind — The Intelligent Paper Studio" },
      {
        name: "description",
        content:
          "Learn about DocuMind's mission to make document tools, academic formatting, and 50 presentation themes completely accessible to everyone.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div className={`flex-1 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <main className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-20">
          {/* Header Badge & Title */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Our Mission & Ethos</span>
            </div>

            <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-foreground tracking-tight">
              Your ideas deserve{" "}
              <span className="italic font-normal text-primary">better documents.</span>
            </h1>

            <p className="mt-6 text-lg text-foreground/75 leading-relaxed">
              DocuMind was created to dismantle the barrier between messy thoughts and polished,
              publication-grade outputs. We believe that professional design and document tooling
              should not be gated behind expensive subscriptions.
            </p>
          </div>

          {/* Core Values Grid */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <Heart className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                50 Free Themes Forever
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Fifty distinct, professionally crafted presentation themes across 10 categories are
                100% free with zero watermarks. Students, educators, and early-stage entrepreneurs
                can build pitch decks and lecture slides freely.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-4">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                Deterministic Code Processing
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                File conversions, PDF compression, and template layouts run via rigorous code
                pipelines rather than opaque generative hallucinations. When you upload a file, it
                is parsed with precision and purged immediately.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                Academic & Editorial Standard
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Written documents need real typographic structure: cover pages, numbered section
                hierarchies, running headers, and margin specifications. We separate document
                styling from presentation decks to maintain editorial purity.
              </p>
            </div>
          </div>

          {/* The Story & Why We Built This */}
          <section className="mt-16 rounded-3xl border border-border bg-surface-2/40 p-8 sm:p-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Why We Built DocuMind
            </h2>
            <div className="mt-6 space-y-4 text-sm text-foreground/80 leading-relaxed font-sans">
              <p>
                Every day, millions of university students, researchers, independent creators, and
                small businesses face the same frustrating friction: spending 70% of their time
                fiddling with inconsistent margins, broken PowerPoint slide layouts, bloated PDF
                files that exceed upload size caps, and incompatible file types.
              </p>
              <p>
                Most existing software falls into two extremes: complex enterprise suites that cost
                hundreds of dollars a year, or ad-ridden online converters that add ugly watermarks
                and violate user privacy.
              </p>
              <p>
                DocuMind offers a calm, thoughtful alternative:{" "}
                <strong>The Intelligent Paper Studio</strong>. A bright, editorial workspace where
                you can upload text or files, let intelligence understand your core ideas, recommend
                curated themes, and produce clean vector presentations or styled manuscripts in
                seconds.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/">
                <Button variant="hero" className="gap-2">
                  Explore Your Workspace <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="glass">Get in Touch with Our Team</Button>
              </Link>
            </div>
          </section>

          {/* Pricing Transparency Banner */}
          <div className="mt-16 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-primary">
                  Transparent Pricing
                </span>
                <h3 className="mt-1 font-serif text-2xl font-bold text-foreground">
                  Free Access & Pro Upgrade at 100 ETB / month
                </h3>
                <p className="mt-2 text-xs text-muted-foreground max-w-xl leading-relaxed">
                  Every user enjoys 50 completely free presentation themes, decks up to 20 slides,
                  lossless PDF compression, and full document tools. Need all 100+ themes, 50-slide
                  decks, and priority rendering? Pro is only 100 ETB per month.
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="font-serif text-3xl font-bold text-foreground">0 ETB</span>
                <span className="text-xs text-muted-foreground"> / free forever</span>
                <div className="mt-2">
                  <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-[11px] font-semibold text-foreground border border-border">
                    Pro: 100 ETB / mo
                  </span>
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
