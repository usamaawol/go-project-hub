import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Layers, ArrowLeft } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { PresentationWorkflow } from "@/components/workspace/PresentationWorkflow";

export const Route = createFileRoute("/presentation-maker")({
  head: () => ({
    meta: [
      { title: "Presentation Maker — DocuMind" },
      {
        name: "description",
        content:
          "Convert text and documents into polished presentation decks with intelligent theme recommendations and vector PPTX export.",
      },
    ],
  }),
  component: PresentationMakerPage,
});

function PresentationMakerPage() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        } flex flex-col justify-between pb-24 lg:pb-0`}
      >
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
          {/* Dedicated Page Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI-Assisted Presentation Generator</span>
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Presentation Maker
              </h1>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                Supply your outline, notes, or uploaded document. Our engine analyzes the key
                takeaways, suggests curated presentation themes, and generates an editable
                PowerPoint deck.
              </p>
            </div>
          </div>

          {/* 6-Step Guided Workflow */}
          <PresentationWorkflow />
        </main>

        <Footer />
      </div>
    </div>
  );
}
