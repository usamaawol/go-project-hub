import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { DocumentFormattingWorkflow } from "@/components/workspace/DocumentFormattingWorkflow";

export const Route = createFileRoute("/document-studio")({
  head: () => ({
    meta: [
      { title: "Document Studio — Academic & Report Formatting | DocuMind" },
      {
        name: "description",
        content:
          "Style manuscripts, essays, and technical reports with academic cover pages, heading hierarchies, margins, running headers, and table of contents.",
      },
    ],
  }),
  component: DocumentStudioPage,
});

function DocumentStudioPage() {
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
                <BookOpen className="h-3.5 w-3.5" />
                <span>Editorial & Academic Styling</span>
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Document Studio
              </h1>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                Format written documents with professional cover pages, precise heading hierarchies,
                standardized margins, running headers, and clean page numbers. Completely separate
                from PowerPoint slide decks.
              </p>
            </div>
          </div>

          {/* Document Formatting Studio */}
          <DocumentFormattingWorkflow />
        </main>

        <Footer />
      </div>
    </div>
  );
}
