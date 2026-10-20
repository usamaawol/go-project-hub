import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, BookOpen, Layers } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Hero } from "@/components/landing/Hero";
import { PresentationWorkflow } from "@/components/workspace/PresentationWorkflow";
import { DocumentFormattingWorkflow } from "@/components/workspace/DocumentFormattingWorkflow";
import { Upload } from "@/components/landing/Upload";
import { Tools } from "@/components/landing/Tools";
import { DocumentShowcase } from "@/components/landing/DocumentShowcase";
import { Templates } from "@/components/landing/Templates";
import {
  Compression,
  IntelligentGuidance,
  HowItWorks,
  DesignedForPeople,
  Pricing,
  Faq,
} from "@/components/landing/Sections";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DocuMind — Your Documents. Smarter." },
      {
        name: "description",
        content:
          "Turn your text and documents into polished presentations, improve document formatting, and make everyday file tasks simpler.",
      },
      { property: "og:title", content: "DocuMind — Your Documents. Smarter." },
      {
        property: "og:description",
        content:
          "Your ideas deserve better documents. 50 free presentation themes, academic formatting, and lossless compression.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<"presentation" | "document">("presentation");

  const handleSelectPresentation = () => {
    setActiveWorkflow("presentation");
    document.getElementById("workspace-creator")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectDocument = () => {
    setActiveWorkflow("document");
    document.getElementById("workspace-creator")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      id="top"
      className="min-h-screen bg-background text-foreground selection:bg-blue-100 selection:text-primary flex flex-col"
    >
      {/* Modern Left Sidebar Navigation */}
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onSelectAction={(action) => {
          if (action === "presentation") handleSelectPresentation();
          if (action === "document") handleSelectDocument();
        }}
      />

      {/* Main Content Area Padded for Sidebar */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <main>
          {/* Hero Section */}
          <Hero
            onCreatePresentation={handleSelectPresentation}
            onImproveDocument={handleSelectDocument}
          />

          {/* Unified Primary Creation Workspace Anchor */}
          <section
            id="workspace-creator"
            className="border-y border-border bg-surface-2/30 py-12 lg:py-16 transition-colors"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* Workspace Mode Switcher Tabs */}
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                    Interactive Document Studio
                  </span>
                  <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-foreground">
                    Choose What You Want to Create
                  </h2>
                </div>

                <div className="flex rounded-xl border border-border bg-card p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveWorkflow("presentation")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                      activeWorkflow === "presentation"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Create a Presentation
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkflow("document")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                      activeWorkflow === "document"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Improve a Document
                  </button>
                </div>
              </div>

              {/* Render Selected Workflow */}
              <div id="presentation-maker">
                {activeWorkflow === "presentation" ? (
                  <PresentationWorkflow
                    onSwitchToFormatting={() => setActiveWorkflow("document")}
                  />
                ) : (
                  <div id="document-studio">
                    <DocumentFormattingWorkflow
                      onSwitchToPresentation={() => setActiveWorkflow("presentation")}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Multi-Format File Converter & Processing Pipeline */}
          <div id="workspace">
            <Upload />
          </div>

          {/* Core Tools Section */}
          <div id="tools">
            <Tools />
          </div>

          {/* Document Showcase */}
          <DocumentShowcase />

          {/* Templates Catalog (50 Free / 60 Pro Presentation Themes) */}
          <div id="templates">
            <Templates />
          </div>

          {/* Lossless Compression Engine */}
          <div id="compression">
            <Compression />
          </div>

          {/* Intelligent AI Guidance */}
          <IntelligentGuidance />

          {/* How It Works */}
          <div id="how">
            <HowItWorks />
          </div>

          {/* Audiences: Students & Business */}
          <div id="students">
            <div id="business">
              <DesignedForPeople />
            </div>
          </div>

          {/* Pricing: 0 ETB Free / 100 ETB Pro */}
          <div id="pricing">
            <Pricing />
          </div>

          {/* Frequently Asked Questions */}
          <Faq />
        </main>

        <Footer />
      </div>
    </div>
  );
}
