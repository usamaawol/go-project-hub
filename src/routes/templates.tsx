import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Download,
  Eye,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Palette,
  Loader2,
  Bookmark,
  Monitor,
  FileText,
  Globe,
  Layout,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { getBookmarkedTemplateIds, toggleBookmarkTemplate } from "@/lib/workspace-history";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeThumb, type SlideType, SLIDE_LABELS } from "@/components/landing/ThemeThumb";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateItem,
  type TemplateCategory,
  type TemplateContentType,
  getTemplateContentType,
  getTemplateBadge,
  getTemplateAuthor,
  getTemplateAspectRatio,
  templateToPresentationOutline,
  templateToDocumentContent,
} from "@/data/templates";
import { downloadTemplatePptx } from "@/lib/pptx-export";

const INITIAL_VISIBLE_COUNT = 16;
const PAGE_SIZE = 16;

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Gamma-Style Presentation & Document Templates | DocuMind" },
      {
        name: "description",
        content:
          "Browse 110 Gamma-style templates for presentations, webpages, and documents. 100% free with vector PPTX export, 1-click AI generation, and curated layouts.",
      },
    ],
  }),
  component: TemplatesCatalogPage,
});

function TemplatesCatalogPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Filters & Search
  const [selectedFormat, setSelectedFormat] = useState<"all" | TemplateContentType>("all");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Preview State
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<SlideType>(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => getBookmarkedTemplateIds());

  // Keyboard navigation for preview modal
  useEffect(() => {
    if (!previewTemplate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setPreviewSlideIdx((prev) => ((prev + 1) % SLIDE_LABELS.length) as SlideType);
      } else if (e.key === "ArrowLeft") {
        setPreviewSlideIdx((prev) =>
          ((prev - 1 + SLIDE_LABELS.length) % SLIDE_LABELS.length) as SlideType
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewTemplate]);

  const handleToggleBookmark = (template: TemplateItem) => {
    const isNowBookmarked = toggleBookmarkTemplate(template.id);
    setBookmarkedIds(getBookmarkedTemplateIds());
    if (isNowBookmarked) {
      toast.success(`Bookmarked "${template.name}"`, {
        description: "Saved to your Account & Workspace bookmarks.",
      });
    } else {
      toast.info(`Removed "${template.name}" from bookmarks.`);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: TEMPLATES.length };
    for (const t of TEMPLATES) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  // Format counts
  const formatCounts = useMemo(() => {
    let presentations = 0;
    let documents = 0;
    let webpages = 0;
    for (const t of TEMPLATES) {
      const type = getTemplateContentType(t);
      if (type === "presentation") presentations++;
      else if (type === "document") documents++;
      else if (type === "webpage") webpages++;
    }
    return { presentations, documents, webpages };
  }, []);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      // Format filter
      if (selectedFormat !== "all") {
        const type = getTemplateContentType(t);
        if (type !== selectedFormat) return false;
      }

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
  }, [selectedFormat, selectedCategory, searchQuery]);

  const visibleTemplates = useMemo(() => {
    return filteredTemplates.slice(0, visibleCount);
  }, [filteredTemplates, visibleCount]);

  const hasMore = visibleCount < filteredTemplates.length;

  const handleDownload = async (template: TemplateItem) => {
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

  // Gamma-style 1-click template usage
  const handleUseTemplate = (template: TemplateItem) => {
    const type = getTemplateContentType(template);

    if (typeof window !== "undefined" && window.sessionStorage) {
      if (type === "document") {
        const docContent = templateToDocumentContent(template);
        window.sessionStorage.setItem("documind_template_doc_title", template.name);
        window.sessionStorage.setItem("documind_template_doc_content", docContent);
        toast.success(`Loaded Template: ${template.name}`, {
          description: "Opening Document Studio with full outline & A4 layout preset.",
        });
        navigate({ to: "/document-studio" });
        return;
      }

      // Presentation or Webpage
      const outline = templateToPresentationOutline(template);
      window.sessionStorage.setItem("documind_selected_theme_id", template.id);
      window.sessionStorage.setItem("documind_template_title", template.name);
      window.sessionStorage.setItem("documind_template_content", outline);
      window.sessionStorage.setItem("documind_template_slides_count", String(template.slidesCount || 10));

      toast.success(`Loaded Template: ${template.name}`, {
        description: `Opening Presentation Maker with ${template.slidesCount || 10} slides outline.`,
      });
      navigate({ to: "/presentation-maker" });
    }
  };

  const openPreview = (template: TemplateItem) => {
    setPreviewTemplate(template);
    setPreviewSlideIdx(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        } flex flex-col justify-between pb-24 lg:pb-0`}
      >
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
          {/* Gamma-Style Hero Header */}
          <div className="border-b border-border pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gamma-Style AI Template Ecosystem — 110 Verified Layouts</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground">
                  Templates for presentations, webpages and docs
                </h1>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                  Jumpstart your ideas with our curated collection of cards, decks, and documents.
                  Enjoy all 110 templates completely free of charge with vector PowerPoint (.pptx)
                  download, zero watermarks, and instant 1-click AI generation workflows.
                </p>
              </div>

              {/* Action shortcuts */}
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="glass" asChild className="text-xs">
                  <Link to="/document-studio">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Document Studio
                  </Link>
                </Button>
                <Button variant="hero" asChild className="text-xs">
                  <Link to="/presentation-maker">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Presentation Maker
                  </Link>
                </Button>
              </div>
            </div>

            {/* Gamma-Style Content-Type Format Selector Tabs */}
            <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="inline-flex flex-wrap items-center rounded-2xl border border-border bg-card p-1.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFormat("all");
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                    selectedFormat === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  <Layout className="h-3.5 w-3.5" />
                  <span>All Formats</span>
                  <span className="rounded-full bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {TEMPLATES.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFormat("presentation");
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                    selectedFormat === "presentation"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Presentations</span>
                  <span className="rounded-full bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {formatCounts.presentations}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFormat("document");
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                    selectedFormat === "document"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Documents</span>
                  <span className="rounded-full bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {formatCounts.documents}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFormat("webpage");
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                    selectedFormat === "webpage"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Webpages</span>
                  <span className="rounded-full bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {formatCounts.webpages}
                  </span>
                </button>
              </div>

              {/* Search input with Gamma styling */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  placeholder="Search cards, decks, tags, fonts..."
                  className="w-full rounded-2xl border border-border bg-card py-2 pl-10 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar: Category Filter Pills */}
            <div className="mt-4 flex flex-wrap gap-2 items-center">
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
              matching layouts
              {selectedFormat !== "all" && ` • [${selectedFormat.toUpperCase()}]`}
              {searchQuery && ` for "${searchQuery}"`}
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                <Check className="h-3.5 w-3.5" /> 110 Free Themes Forever
              </span>
              <span className="inline-flex items-center gap-1 text-primary font-sans font-medium">
                <Sparkles className="h-3.5 w-3.5" /> Vector PPTX Export Included
              </span>
            </div>
          </div>

          {/* Gamma Bento Card Grid */}
          {visibleTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <Palette className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 font-serif text-lg font-bold text-foreground">
                No matching templates found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                No templates matched your query "{searchQuery}". Try selecting another category or
                clearing the format filter.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setSelectedFormat("all");
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleTemplates.map((template) => {
                const isDownloading = downloadingId === template.id;
                const contentType = getTemplateContentType(template);
                const badge = getTemplateBadge(template);
                const author = getTemplateAuthor(template);
                const aspectRatio = getTemplateAspectRatio(template);

                return (
                  <div
                    key={template.id}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-paper hover:shadow-card hover:border-primary/40 transition-all"
                  >
                    <div>
                      {/* Gamma-style Thumbnail Preview Frame */}
                      <div
                        onClick={() => openPreview(template)}
                        className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-border/80 cursor-pointer group-hover:scale-[1.02] transition-transform duration-200 bg-surface-2"
                      >
                        <ThemeThumb kind={template.kind} slide={0} />

                        {/* Top Left Badges: Format & Aspect Ratio */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase shadow-xs backdrop-blur-xs flex items-center gap-1 ${
                              contentType === "document"
                                ? "bg-blue-600/90 text-white"
                                : contentType === "webpage"
                                ? "bg-purple-600/90 text-white"
                                : "bg-zinc-900/90 text-white"
                            }`}
                          >
                            {contentType === "document" && <FileText className="h-2.5 w-2.5" />}
                            {contentType === "webpage" && <Globe className="h-2.5 w-2.5" />}
                            {contentType === "presentation" && <Monitor className="h-2.5 w-2.5" />}
                            {aspectRatio}
                          </span>

                          <span className="rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 font-mono text-[10px] text-white/90">
                            {badge}
                          </span>
                        </div>

                        {/* Top Right Badge: 100% Free */}
                        <div className="absolute top-2.5 right-2.5">
                          <span className="rounded-full bg-emerald-600/95 backdrop-blur-xs px-2 py-0.5 font-mono text-[10px] font-bold text-white uppercase shadow-xs">
                            Free
                          </span>
                        </div>

                        {/* Hover Overlay with Preview hint */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="rounded-xl bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-black shadow-lg inline-flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" /> Preview Cards
                          </span>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="mt-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {template.name}
                          </h3>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground bg-surface-2 px-1.5 py-0.5 rounded-sm">
                            {template.slidesCount} {contentType === "document" ? "pages" : "cards"}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {template.description}
                        </p>

                        {/* Author & Best for */}
                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="truncate max-w-[140px] font-medium text-foreground/80">
                            By {author}
                          </span>

                          {/* Color Palette Dots */}
                          <div className="flex items-center gap-1 shrink-0" title="Theme Color Harmony">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: template.colors.primary }}
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: template.colors.accent }}
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: template.colors.bg }}
                            />
                          </div>
                        </div>

                        {/* Best For tag line */}
                        <div className="mt-1.5 text-[10px] text-muted-foreground truncate border-t border-border/50 pt-2">
                          <span className="font-semibold text-foreground/70">Best for:</span> {template.bestFor}
                        </div>
                      </div>
                    </div>

                    {/* Gamma-Style Action Bar: 1-Click "Use Template", Preview & Download */}
                    <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(template)}
                        title={
                          bookmarkedIds.includes(template.id)
                            ? "Remove bookmark"
                            : "Bookmark template"
                        }
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                          bookmarkedIds.includes(template.id)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-2"
                        }`}
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${
                            bookmarkedIds.includes(template.id) ? "fill-current" : ""
                          }`}
                        />
                      </button>

                      <Button
                        size="sm"
                        variant="glass"
                        className="h-8 text-xs px-2.5"
                        onClick={() => openPreview(template)}
                        title="Interactive Card Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      {/* Primary Gamma Action: Use this template (100% Free) */}
                      <Button
                        size="sm"
                        variant="hero"
                        className="h-8 text-xs flex-1 rounded-xl shadow-xs font-semibold"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" /> Use Template
                      </Button>

                      {/* Secondary Quick Vector Export */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        disabled={isDownloading}
                        onClick={() => handleDownload(template)}
                        title="Download Vector PPTX"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
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
                className="px-8 shadow-xs rounded-2xl"
              >
                Load Next {PAGE_SIZE} Templates ({filteredTemplates.length - visibleCount}{" "}
                remaining)
              </Button>
            </div>
          )}

          {/* Bottom Banner: 100% Free Ethos */}
          <div className="mt-16 rounded-3xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-primary/10 p-8 sm:p-10 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-8 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-0.5 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-2">
                100% Free Access Policy
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                110 Free Themes Forever. Vector PPTX Export Included.
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Every theme comes with vector PowerPoint export, standard widescreen 16:9 and
                A4 document formatting, and no watermarks. 100% free access for all creators,
                educators, and professionals.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 shrink-0 flex items-center gap-3">
              <Button
                variant="hero"
                size="lg"
                className="rounded-2xl"
                asChild
              >
                <Link to="/presentation-maker">
                  <Sparkles className="h-4 w-4 mr-2" /> Start Creating Free
                </Link>
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Gamma-Style Interactive Card Viewer Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl border-border bg-card p-6 sm:p-8 shadow-lift max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                  100% Free Template
                </span>

                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                  {getTemplateContentType(previewTemplate) === "document" && <FileText className="h-3 w-3" />}
                  {getTemplateContentType(previewTemplate) === "webpage" && <Globe className="h-3 w-3" />}
                  {getTemplateContentType(previewTemplate) === "presentation" && <Monitor className="h-3 w-3" />}
                  {getTemplateAspectRatio(previewTemplate)}
                </span>

                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                  {previewTemplate.category}
                </span>

                <span className="text-xs text-muted-foreground ml-auto">
                  By {getTemplateAuthor(previewTemplate)}
                </span>
              </div>

              <DialogTitle className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
                {previewTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {previewTemplate.description}
              </DialogDescription>
            </DialogHeader>

            {/* Interactive Card Canvas with Gamma Stepper Controls */}
            <div className="mt-4 relative">
              <div className="aspect-16/10 w-full overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-inner">
                <ThemeThumb kind={previewTemplate.kind} slide={previewSlideIdx} />
              </div>

              {/* Stepper Navigation Overlay (< and > buttons) */}
              <button
                type="button"
                onClick={() =>
                  setPreviewSlideIdx((prev) =>
                    ((prev - 1 + SLIDE_LABELS.length) % SLIDE_LABELS.length) as SlideType
                  )
                }
                title="Previous Card (Left Arrow)"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 transition-colors shadow-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setPreviewSlideIdx((prev) => ((prev + 1) % SLIDE_LABELS.length) as SlideType)
                }
                title="Next Card (Right Arrow)"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 transition-colors shadow-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Floating card index pill */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-mono font-semibold text-white backdrop-blur-xs shadow-md">
                Card {previewSlideIdx + 1} of {SLIDE_LABELS.length}: {SLIDE_LABELS[previewSlideIdx]}
              </div>
            </div>

            {/* Slide Layout Switcher Filmstrip / Tabs */}
            <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-4">
              {SLIDE_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPreviewSlideIdx(idx as SlideType)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    previewSlideIdx === idx
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3"
                  }`}
                >
                  <span className="font-mono mr-1.5 opacity-70">#{idx + 1}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Template Specs & Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="rounded-2xl border border-border bg-surface-2/40 p-3.5">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block font-semibold">
                  Best Suited For
                </span>
                <p className="mt-1 font-medium text-foreground">{previewTemplate.bestFor}</p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-2/40 p-3.5">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block font-semibold">
                  Recommended Fonts
                </span>
                <p className="mt-1 font-medium text-foreground">{previewTemplate.fonts}</p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-2/40 p-3.5">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block font-semibold">
                  Color Harmony Tokens
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: previewTemplate.colors.primary }}
                    title="Primary"
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: previewTemplate.colors.accent }}
                    title="Accent"
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: previewTemplate.colors.bg }}
                    title="Background"
                  />
                  <span className="font-mono text-[11px] text-muted-foreground ml-1">
                    {previewTemplate.colors.primary}
                  </span>
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions: Use Template or Download */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setPreviewTemplate(null)}
                className="w-full sm:w-auto text-xs rounded-xl"
              >
                Close Preview
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => handleDownload(previewTemplate)}
                  className="flex-1 sm:flex-none text-xs rounded-xl"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Download PPTX
                </Button>

                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => {
                    handleUseTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="flex-1 sm:flex-none text-xs rounded-xl font-semibold"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Use This Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
