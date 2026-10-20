import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Download,
  Eye,
  Search,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowRight,
  Lock,
  Palette,
  FileDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UpgradeModal } from "@/components/workspace/UpgradeModal";
import { ThemeThumb, type SlideType, SLIDE_LABELS } from "@/components/landing/ThemeThumb";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateItem,
  type TemplateCategory,
} from "@/data/templates";
import { downloadTemplatePptx } from "@/lib/pptx-export";

const INITIAL_VISIBLE_COUNT = 16;
const PAGE_SIZE = 16;

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Presentation Themes Catalog — 110 Verified Templates | DocuMind" },
      {
        name: "description",
        content:
          "Browse 110 professionally designed presentation themes. 50 completely free themes with vector PPTX export, plus 60 Pro themes for premium decks.",
      },
    ],
  }),
  component: TemplatesCatalogPage,
});

function TemplatesCatalogPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Filters & Search
  const [selectedTier, setSelectedTier] = useState<"all" | "free" | "pro">("all");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Preview & Modal State
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<SlideType>(0);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [proThemeTarget, setProThemeTarget] = useState<TemplateItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: TEMPLATES.length };
    for (const t of TEMPLATES) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      // Tier filter
      if (selectedTier === "free" && t.tier !== "free") return false;
      if (selectedTier === "pro" && t.tier !== "pro") return false;

      // Category filter
      if (
        selectedCategory !== "All" &&
        t.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      // Search query filter
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
  }, [selectedTier, selectedCategory, searchQuery]);

  const visibleTemplates = useMemo(() => {
    return filteredTemplates.slice(0, visibleCount);
  }, [filteredTemplates, visibleCount]);

  const hasMore = visibleCount < filteredTemplates.length;

  const handleDownload = async (template: TemplateItem) => {
    if (template.tier === "pro") {
      setProThemeTarget(template);
      setUpgradeModalOpen(true);
      return;
    }

    try {
      setDownloadingId(template.id);
      toast.info("Generating PowerPoint Deck...", {
        description: `Exporting vector .pptx for "${template.name}".`,
      });
      const filename = await downloadTemplatePptx(template);
      toast.success("Download Complete!", {
        description: `Saved "${filename}" to your computer.`,
      });
    } catch (err) {
      console.error("PPTX Generation Error:", err);
      toast.error("Download Failed", {
        description: "Could not export PowerPoint file. Please try again.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUseInMaker = (template: TemplateItem) => {
    if (template.tier === "pro") {
      setProThemeTarget(template);
      setUpgradeModalOpen(true);
      return;
    }

    toast.success(`Theme Selected: ${template.name}`, {
      description: "Opening Presentation Maker with this theme preset.",
    });
    navigate({ to: "/presentation-maker" });
  };

  const openPreview = (template: TemplateItem) => {
    setPreviewTemplate(template);
    setPreviewSlideIdx(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        } flex flex-col justify-between`}
      >
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
          {/* Header section */}
          <div className="border-b border-border pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Curated Presentation Gallery — 110 Themes</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground">
                  Presentation Templates
                </h1>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                  Explore 110 professionally structured presentation designs. Enjoy 50 completely
                  free themes with vector PowerPoint (.pptx) download and zero watermarks, plus 60
                  Pro themes for high-stakes enterprise decks.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button variant="hero" asChild>
                  <Link to="/presentation-maker">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Open Presentation Maker
                  </Link>
                </Button>
              </div>
            </div>

            {/* Filter Bar: Tier Buttons + Search Input */}
            <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Tier selector tabs */}
              <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier("all");
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                    selectedTier === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  All Themes (110)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier("free");
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                    selectedTier === "free"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Free Only (50)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier("pro");
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                    selectedTier === "pro"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  Pro Exclusive (60)
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  placeholder="Search templates, fonts, keywords..."
                  className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs transition-colors"
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

            {/* Category Filter Pills */}
            <div
              role="tablist"
              aria-label="Presentation template categories"
              className="mt-4 flex flex-wrap gap-2"
            >
              {TEMPLATE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count = categoryCounts[cat] ?? 0;
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setVisibleCount(INITIAL_VISIBLE_COUNT);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-surface-2"
                    }`}
                  >
                    <span>{cat}</span>
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
          </div>

          {/* Results Summary Bar */}
          <div className="mt-6 mb-6 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div>
              Showing{" "}
              <span className="font-semibold text-foreground">{visibleTemplates.length}</span> of{" "}
              <span className="font-semibold text-foreground">{filteredTemplates.length}</span>{" "}
              matching themes
              {selectedTier !== "all" && ` (${selectedTier.toUpperCase()} tier)`}
              {searchQuery && ` for "${searchQuery}"`}
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                <Check className="h-3.5 w-3.5" /> 50 Free Forever
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-sans font-medium">
                <Sparkles className="h-3.5 w-3.5" /> 60 Pro Decks
              </span>
            </div>
          </div>

          {/* Template Cards Grid */}
          {visibleTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <Palette className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 font-serif text-lg font-bold text-foreground">
                No matching templates found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                No templates matched your query "{searchQuery}". Try selecting another category or
                clearing the search term.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setSelectedTier("all");
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleTemplates.map((template) => {
                const isPro = template.tier === "pro";
                const isDownloading = downloadingId === template.id;

                return (
                  <div
                    key={template.id}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-paper hover:shadow-card hover:border-primary/40 transition-all"
                  >
                    <div>
                      {/* Thumbnail Container */}
                      <div
                        onClick={() => openPreview(template)}
                        className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-border/80 cursor-pointer group-hover:scale-[1.02] transition-transform duration-200"
                      >
                        <ThemeThumb kind={template.kind} slide={0} />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          {isPro ? (
                            <span className="rounded-full bg-amber-500/90 backdrop-blur-xs px-2 py-0.5 font-mono text-[10px] font-bold text-black uppercase shadow-xs">
                              Pro
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-600/90 backdrop-blur-xs px-2 py-0.5 font-mono text-[10px] font-bold text-white uppercase shadow-xs">
                              Free
                            </span>
                          )}
                          <span className="rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 font-mono text-[10px] text-white/90">
                            {template.category}
                          </span>
                        </div>

                        {/* Hover Overlay with Preview hint */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-black shadow-lg inline-flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" /> Preview Slides
                          </span>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="mt-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {template.name}
                          </h3>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {template.slidesCount} slides
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {template.description}
                        </p>

                        {/* Metadata row */}
                        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2.5">
                          <span className="truncate max-w-[150px]">
                            <span className="font-medium text-foreground">Best:</span>{" "}
                            {template.bestFor}
                          </span>

                          {/* Color Palette Dots */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: template.colors.primary }}
                              title="Primary color"
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: template.colors.accent }}
                              title="Accent color"
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: template.colors.bg }}
                              title="Background tone"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="glass"
                        className="h-8 text-xs flex-1"
                        onClick={() => openPreview(template)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                      </Button>

                      {isPro ? (
                        <Button
                          size="sm"
                          variant="hero"
                          className="h-8 text-xs flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => {
                            setProThemeTarget(template);
                            setUpgradeModalOpen(true);
                          }}
                        >
                          <Lock className="h-3.5 w-3.5 mr-1" /> Pro Theme
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="hero"
                          className="h-8 text-xs flex-1"
                          disabled={isDownloading}
                          onClick={() => handleDownload(template)}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Deck...
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5 mr-1" /> PPTX
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Pagination */}
          {hasMore && (
            <div className="mt-12 text-center">
              <Button
                variant="glass"
                size="lg"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-8 shadow-xs"
              >
                Load Next {PAGE_SIZE} Templates ({filteredTemplates.length - visibleCount}{" "}
                remaining)
              </Button>
            </div>
          )}

          {/* Bottom Upgrade / Free Ethos Banner */}
          <div className="mt-16 rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-card to-primary/5 p-8 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-6 shadow-xs">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                Transparent Document Ethos
              </span>
              <h3 className="mt-1 font-serif text-2xl font-bold text-foreground">
                50 Free Themes Forever. 100 ETB / month for All 110.
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Every free theme comes with vector PowerPoint export, standard widescreen 16:9
                formatting, and no watermarks. Upgrade anytime to unlock all Pro decks, extended
                slide limits, and priority AI generation.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 shrink-0 flex items-center gap-3">
              <Button
                variant="hero"
                onClick={() => {
                  setProThemeTarget(null);
                  setUpgradeModalOpen(true);
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Upgrade to Pro
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Slide Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl border-border bg-card p-6 sm:p-8 shadow-lift max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    previewTemplate.tier === "pro"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {previewTemplate.tier === "pro" ? "Pro Exclusive Deck" : "100% Free Theme"}
                </span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                  {previewTemplate.category}
                </span>
              </div>

              <DialogTitle className="mt-2 font-serif text-2xl font-bold text-foreground">
                {previewTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {previewTemplate.description}
              </DialogDescription>
            </DialogHeader>

            {/* Slide Preview Canvas */}
            <div className="mt-4 aspect-16/10 w-full overflow-hidden rounded-xl border border-border bg-surface-2 shadow-inner">
              <ThemeThumb kind={previewTemplate.kind} slide={previewSlideIdx} />
            </div>

            {/* Slide Layout Switcher Tabs */}
            <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border pb-4">
              {SLIDE_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPreviewSlideIdx(idx as SlideType)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    previewSlideIdx === idx
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Template Specs & Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="rounded-xl border border-border bg-surface-2/40 p-3">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block font-semibold">
                  Best Suited For
                </span>
                <p className="mt-1 font-medium text-foreground">{previewTemplate.bestFor}</p>
              </div>

              <div className="rounded-xl border border-border bg-surface-2/40 p-3">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block font-semibold">
                  Recommended Fonts
                </span>
                <p className="mt-1 font-medium text-foreground">{previewTemplate.fonts}</p>
              </div>

              <div className="rounded-xl border border-border bg-surface-2/40 p-3">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block font-semibold">
                  Color Harmony
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: previewTemplate.colors.primary }}
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: previewTemplate.colors.accent }}
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: previewTemplate.colors.bg }}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground ml-1">
                    {previewTemplate.colors.primary}
                  </span>
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setPreviewTemplate(null)}
                className="w-full sm:w-auto text-xs"
              >
                Close Preview
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => handleDownload(previewTemplate)}
                  className="flex-1 sm:flex-none text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Download PPTX
                </Button>

                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => handleUseInMaker(previewTemplate)}
                  className="flex-1 sm:flex-none text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Use in Presentation Maker
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Upgrade Modal for Pro themes */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        proThemeName={proThemeTarget?.name}
        onSelectFreeAlternative={() => {
          setUpgradeModalOpen(false);
          setSelectedTier("free");
          toast.info("Showing 50 Free Themes", {
            description: "All free themes can be previewed, edited, and downloaded at zero cost.",
          });
        }}
      />
    </div>
  );
}
