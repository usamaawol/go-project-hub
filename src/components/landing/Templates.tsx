import { useState, useMemo } from "react";
import {
  ArrowRight,
  Eye,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Palette,
  Layers,
  FileDown,
  Loader2,
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
import { ThemeThumb, type SlideType, SLIDE_LABELS } from "./ThemeThumb";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateItem,
  type TemplateCategory,
} from "@/data/templates";
import { downloadTemplatePptx } from "@/lib/pptx-export";

const INITIAL_VISIBLE_COUNT = 12;

export function Templates() {
  const [selectedCat, setSelectedCat] = useState<TemplateCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [activeTemplate, setActiveTemplate] = useState<TemplateItem | null>(null);
  const [activeSlide, setActiveSlide] = useState<SlideType>(0);
  const [downloading, setDownloading] = useState(false);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: TEMPLATES.length };
    for (const t of TEMPLATES) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  // Filter templates based on category and search query
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const matchesCat =
        selectedCat === "All" || t.category.toLowerCase() === selectedCat.toLowerCase();
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.bestFor.toLowerCase().includes(q) ||
        t.fonts.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [selectedCat, searchQuery]);

  const visibleTemplates = useMemo(() => {
    return filteredTemplates.slice(0, visibleCount);
  }, [filteredTemplates, visibleCount]);

  const hasMore = visibleCount < filteredTemplates.length;

  const openPreview = (t: TemplateItem) => {
    setActiveTemplate(t);
    setActiveSlide(0);
  };

  const handleUseTheme = (themeName: string) => {
    toast.success(`Theme Applied: ${themeName}`, {
      description: "Ready to structure and format your presentation in the workspace.",
    });
    setActiveTemplate(null);
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDownloadPptx = async (template: TemplateItem) => {
    try {
      setDownloading(true);
      toast.info("Generating PowerPoint Deck...", {
        description: `Creating vector .pptx slides for "${template.name}".`,
      });
      const filename = await downloadTemplatePptx(template);
      toast.success("Download Complete!", {
        description: `Saved "${filename}" to your downloads folder.`,
      });
    } catch (err) {
      console.error("PPTX Generation Error:", err);
      toast.error("Generation Failed", {
        description: "Could not export PowerPoint file. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section id="templates" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>100% Free Catalog — 110 Verified Templates</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
            Your next great presentation starts here.
          </h2>
          <p className="mt-3 text-base text-foreground/75 leading-relaxed">
            Every single design in our catalog is free to preview, customize, and export to real
            .pptx PowerPoint format with zero paywalls, subscriptions, or watermarks.
          </p>
        </div>

        {/* Live Search Bar */}
        <div className="w-full md:w-72">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
              placeholder="Search 100+ templates..."
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        role="tablist"
        aria-label="Presentation template categories"
        className="mt-8 flex flex-wrap gap-2"
      >
        {TEMPLATE_CATEGORIES.map((c) => {
          const isSelected = selectedCat === c;
          const count = categoryCounts[c] ?? 0;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setSelectedCat(c);
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-surface-2"
              }`}
            >
              <span>{c}</span>
              <span
                className={`text-[10px] rounded-full px-1.5 py-0.2 ${
                  isSelected ? "bg-white/20 text-white" : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results Header Count */}
      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground font-mono">
        <p>
          Showing <span className="font-semibold text-foreground">{visibleTemplates.length}</span>{" "}
          of <span className="font-semibold text-foreground">{filteredTemplates.length}</span> free
          templates
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-medium text-xs">
          <Check className="h-3.5 w-3.5" /> All Free Forever
        </span>
      </div>

      {/* Gallery Cards Grid */}
      {visibleTemplates.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-serif text-lg font-bold text-foreground">
            No matching templates found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query or select another category filter.
          </p>
          <Button
            variant="glass"
            size="sm"
            className="mt-4 text-xs"
            onClick={() => {
              setSelectedCat("All");
              setSearchQuery("");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleTemplates.map((t) => (
            <div
              key={t.id}
              className="group flex flex-col rounded-2xl border border-border bg-card p-3 shadow-paper transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
            >
              {/* Slide Thumbnail with preview trigger */}
              <div
                onClick={() => openPreview(t)}
                className="relative overflow-hidden rounded-xl border border-border bg-surface-2 cursor-pointer aspect-video"
              >
                <ThemeThumb
                  template={t}
                  kind={t.kind}
                  slideIndex={0}
                  className="transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-stone-900/40 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-card text-foreground px-3.5 py-1.5 text-xs font-semibold shadow-md border border-border">
                    <Eye className="h-3.5 w-3.5" /> Preview Deck
                  </span>
                </span>
                <span className="absolute top-2.5 left-2.5 rounded bg-card/90 px-2 py-0.5 font-mono text-[9px] font-semibold text-foreground/90 shadow-xs border border-border">
                  {t.slidesCount} slides
                </span>
                <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-mono text-[9px] font-bold">
                  FREE
                </span>
              </div>

              {/* Card Content & Action Bar */}
              <div className="p-2 pt-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-serif font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {t.name}
                    </h4>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase font-medium shrink-0">
                      {t.category}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-foreground/70 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                {/* Footer details & Action Buttons */}
                <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span className="truncate">{t.fonts}</span>
                    <div className="flex items-center gap-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: t.colors.primary }}
                        title="Primary Color"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: t.colors.accent }}
                        title="Accent Color"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openPreview(t)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        title="Download PowerPoint File"
                        onClick={() => handleDownloadPptx(t)}
                      >
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="glass"
                        className="text-xs h-7 px-3 text-primary border-primary/20 hover:bg-primary/10"
                        onClick={() => handleUseTheme(t.name)}
                      >
                        Use Theme
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Pagination */}
      {hasMore && (
        <div className="mt-12 text-center">
          <Button
            variant="glass"
            size="lg"
            className="px-8 font-semibold text-xs"
            onClick={() => setVisibleCount((prev) => prev + 12)}
          >
            Load More Templates ({filteredTemplates.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {/* Interactive Modal for Multi-Slide Inspection */}
      <Dialog open={!!activeTemplate} onOpenChange={(o) => !o && setActiveTemplate(null)}>
        <DialogContent className="max-w-4xl border-border bg-card p-6 sm:p-8 shadow-lift">
          {activeTemplate && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="font-serif text-2xl font-bold text-foreground">
                        {activeTemplate.name}
                      </DialogTitle>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary font-semibold border border-primary/20">
                        {activeTemplate.category}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                        100% Free
                      </span>
                    </div>
                    <DialogDescription className="mt-1 text-xs text-foreground/70">
                      {activeTemplate.description}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="glass"
                      size="sm"
                      disabled={downloading}
                      onClick={() => handleDownloadPptx(activeTemplate)}
                      className="text-xs"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Building .PPTX...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" /> Download .PPTX
                        </>
                      )}
                    </Button>
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={() => handleUseTheme(activeTemplate.name)}
                      className="text-xs"
                    >
                      <Sparkles className="h-4 w-4" /> Use This Theme
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Big Slide Stage */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-surface-2 p-2 shadow-inner">
                <ThemeThumb
                  template={activeTemplate}
                  kind={activeTemplate.kind}
                  slideIndex={activeSlide}
                  className="rounded-lg max-h-[380px] w-full"
                />

                <button
                  aria-label="Previous slide"
                  onClick={() => setActiveSlide((p) => ((p - 1 + 4) % 4) as SlideType)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md border border-border hover:bg-card transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  aria-label="Next slide"
                  onClick={() => setActiveSlide((p) => ((p + 1) % 4) as SlideType)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md border border-border hover:bg-card transition-all"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-4 left-4 rounded-md bg-card/90 px-3 py-1 font-mono text-xs text-foreground shadow-xs border border-border">
                  Slide {activeSlide + 1} of 4: {SLIDE_LABELS[activeSlide]}
                </div>
              </div>

              {/* 4 Distinct Slide Thumbnails */}
              <div className="grid grid-cols-4 gap-3">
                {([0, 1, 2, 3] as SlideType[]).map((idx) => {
                  const isCurrent = activeSlide === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      className={`rounded-lg border text-left p-1.5 transition-all ${
                        isCurrent
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border bg-card hover:border-primary/40 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <ThemeThumb
                        template={activeTemplate}
                        kind={activeTemplate.kind}
                        slideIndex={idx}
                        className="rounded-xs"
                      />
                      <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground font-medium">
                        {idx + 1}. {SLIDE_LABELS[idx]}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Theme Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-surface-2 p-3.5 text-xs">
                <div>
                  <span className="font-mono text-muted-foreground uppercase text-[10px] block font-semibold">
                    Typography Pairing
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block font-sans">
                    {activeTemplate.fonts}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-muted-foreground uppercase text-[10px] block font-semibold">
                    Target Presentation Use
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block font-sans">
                    {activeTemplate.bestFor}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-muted-foreground uppercase text-[10px] block font-semibold">
                    Export Format
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block font-mono">
                    16:9 PowerPoint (.pptx) · 100% Free
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
