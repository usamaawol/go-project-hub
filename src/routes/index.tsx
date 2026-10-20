import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Upload } from "@/components/landing/Upload";
import { Tools } from "@/components/landing/Tools";
import { Templates } from "@/components/landing/Templates";
import { HowItWorks, Compression, Assistant, Pricing, Faq } from "@/components/landing/Sections";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DocuMind — Your Documents. Smarter." },
      { name: "description", content: "Convert, redesign, organize and compress PDF, DOCX, TXT and PPTX files in one intelligent workspace." },
      { property: "og:title", content: "DocuMind — Your Documents. Smarter." },
      { property: "og:description", content: "Convert files, create beautiful presentations, refine documents and reduce file sizes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div id="top">
      <Nav />
      <main>
        <Hero />
        <Upload />
        <Tools />
        <Templates />
        <HowItWorks />
        <Compression />
        <Assistant />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
