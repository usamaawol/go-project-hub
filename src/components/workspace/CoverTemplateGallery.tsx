/**
 * DocuMind Academic Cover-Page Template Gallery
 * Interactive gallery allowing users to preview and select from 10 distinct
 * academic cover templates with real metadata and accent color customization.
 */

import React, { useState } from "react";
import {
  COVER_TEMPLATES,
  type CoverTemplateDefinition,
  type AssignmentMetadata,
  getDefaultAssignmentMetadata,
} from "@/lib/assignment-types";
import { AssignmentCoverRenderer } from "./AssignmentCoverRenderer";
import { Check, Sparkles, Palette, Eye, Layout, Search, Wand2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoverTemplateGalleryProps {
  metadata?: AssignmentMetadata | null;
  mode: "presentation" | "document";
  onSelectTemplate: (templateId: string, defaultAccent?: string) => void;
  onUpdateAccentColor?: (color: string) => void;
  onOpenCanvasEditor?: () => void;
}

const ACCENT_PALETTE = [
  { name: "Oxford Navy", hex: "#1E3A8A" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Deep Teal", hex: "#0F766E" },
  { name: "Harvard Crimson", hex: "#B91C1C" },
  { name: "Slate Charcoal", hex: "#334155" },
  { name: "Monochrome Black", hex: "#111827" },
  { name: "Amethyst Violet", hex: "#7C3AED" },
  { name: "Ocean Sky", hex: "#0284C7" },
  { name: "Forest Green", hex: "#15803D" },
];

export function CoverTemplateGallery({
  metadata,
  mode,
  onSelectTemplate,
  onUpdateAccentColor,
  onOpenCanvasEditor,
}: CoverTemplateGalleryProps) {
  const safeMeta = metadata || getDefaultAssignmentMetadata();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const selectedTemplateId = safeMeta?.coverTemplateId || "classic-university";
  const selectedTemplate =
    COVER_TEMPLATES.find((t) => t.id === selectedTemplateId) || COVER_TEMPLATES[0]!;

  const categories = [
    "All",
    "Academic",
    "Modern",
    "Formal",
    "Research",
    "Business",
    "Minimalist",
    "Geometric",
    "Creative",
  ];

  const filtered = COVER_TEMPLATES.filter((t) => {
    const matchesCategory =
      activeCategory === "All" ||
      t.category.toLowerCase() === activeCategory.toLowerCase() ||
      (activeCategory === "Minimalist" && t.category.toLowerCase() === "minimal");

    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      t.name.toLowerCase().includes(query) ||
      t.tagline.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="w-full space-y-4">
      {/* Gallery Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-1">
            <Layout className="h-3 w-3" />
            <span>
              {mode === "presentation" ? "Presentation Cover Slides (16:9)" : "Document Cover Pages (ISO A4)"}
            </span>
          </div>
          <h3 className="text-base font-serif font-bold text-foreground flex items-center gap-2">
            <span>75+ Modern Cover-Page Template Library</span>
            <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              {COVER_TEMPLATES.length} Styles
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Select an executive layout, customize it directly in the canvas design editor, or apply your credentials.
          </p>
        </div>

        {/* Right Action Bar: Accent Picker & Open Canvas Editor */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          {onOpenCanvasEditor && (
            <Button
              type="button"
              onClick={onOpenCanvasEditor}
              size="sm"
              variant="default"
              className="text-xs h-8 px-3 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Customize in Canvas Editor</span>
            </Button>
          )}

          {/* Accent Color Picker */}
          <div className="flex items-center gap-1.5 bg-surface-2/60 px-2.5 py-1 rounded-lg border border-border">
            <Palette className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
            <span className="text-[11px] text-muted-foreground font-medium">Accent:</span>
            <div className="flex items-center gap-1">
              {ACCENT_PALETTE.map((c) => {
                const isCurrent =
                  ((safeMeta?.accentColor || selectedTemplate?.defaultAccent || "#1E3A8A")).toLowerCase() ===
                  c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => onUpdateAccentColor?.(c.hex)}
                    className={`h-4.5 w-4.5 rounded-full border transition-all ${
                      isCurrent
                        ? "scale-120 ring-2 ring-primary ring-offset-1 border-white"
                        : "border-transparent opacity-80 hover:opacity-100 hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs flex-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Template Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {filtered.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;
          const previewMeta: AssignmentMetadata = {
            ...safeMeta,
            coverTemplateId: tpl.id,
            accentColor: safeMeta?.accentColor || tpl.defaultAccent,
          };

          return (
            <div
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl.id, tpl.defaultAccent)}
              className={`group relative flex flex-col rounded-xl border transition-all cursor-pointer overflow-hidden ${
                isSelected
                  ? "border-primary ring-2 ring-primary/40 bg-card shadow-md scale-[1.01]"
                  : "border-border bg-card hover:border-primary/50 hover:shadow-xs"
              }`}
            >
              {/* Visual Thumbnail Preview */}
              <div
                className={`relative w-full bg-slate-100 border-b border-border overflow-hidden ${
                  mode === "presentation" ? "aspect-video" : "aspect-[1/1.3]"
                }`}
              >
                <AssignmentCoverRenderer
                  metadata={previewMeta}
                  aspectRatio={mode === "presentation" ? "16:9" : "a4"}
                  isThumbnail={true}
                />

                {/* Selection Check Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Template Card Details */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      {tpl.name}
                    </h4>
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tpl.defaultAccent }}
                      title={`Default Accent: ${tpl.defaultAccent}`}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-muted-foreground uppercase">{tpl.category}</span>
                  <div className="flex items-center gap-1.5">
                    {isSelected && onOpenCanvasEditor && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCanvasEditor();
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20"
                        title="Edit design in Canvas Editor"
                      >
                        Edit
                      </button>
                    )}
                    <span
                      className={`font-semibold ${
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
