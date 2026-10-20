import { useState } from "react";
import { Logo } from "./Logo";
import { LegalModal } from "./LegalModal";

export function Footer() {
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalType, setLegalType] = useState<"privacy" | "terms">("privacy");

  const openLegal = (type: "privacy" | "terms") => {
    setLegalType(type);
    setLegalOpen(true);
  };

  return (
    <>
      <footer className="border-t border-stone-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand identity column */}
            <div className="lg:col-span-2 space-y-3">
              <Logo />
              <p className="font-serif italic text-base text-foreground/80 mt-2">
                Your Documents. Smarter.
              </p>
              <p className="max-w-sm text-xs text-muted-foreground leading-relaxed">
                The Intelligent Paper Studio. An all-in-one document workspace built for students,
                creators, and businesses to convert, compress, organize, format, and present with
                clarity.
              </p>
            </div>

            {/* Tools */}
            <div>
              <h4 className="font-serif font-bold text-sm text-foreground">Tools</h4>
              <ul className="mt-4 space-y-2.5 text-xs text-foreground/70">
                <li>
                  <a href="#tools" className="hover:text-primary transition-colors">
                    Convert Documents
                  </a>
                </li>
                <li>
                  <a href="#templates" className="hover:text-primary transition-colors">
                    Create Presentations
                  </a>
                </li>
                <li>
                  <a href="#compression" className="hover:text-primary transition-colors">
                    Compress Files
                  </a>
                </li>
                <li>
                  <a href="#tools" className="hover:text-primary transition-colors">
                    Extract Text & OCR
                  </a>
                </li>
                <li>
                  <a href="#tools" className="hover:text-primary transition-colors">
                    Improve Formatting
                  </a>
                </li>
              </ul>
            </div>

            {/* Templates & Workflows */}
            <div>
              <h4 className="font-serif font-bold text-sm text-foreground">Templates</h4>
              <ul className="mt-4 space-y-2.5 text-xs text-foreground/70">
                <li>
                  <a href="#templates" className="hover:text-primary transition-colors">
                    Business Presentations
                  </a>
                </li>
                <li>
                  <a href="#templates" className="hover:text-primary transition-colors">
                    Education & Lecture Themes
                  </a>
                </li>
                <li>
                  <a href="#templates" className="hover:text-primary transition-colors">
                    Research & Scientific Papers
                  </a>
                </li>
                <li>
                  <a href="#templates" className="hover:text-primary transition-colors">
                    Pitch Decks & Portfolios
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-primary transition-colors">
                    Pricing & Plans
                  </a>
                </li>
              </ul>
            </div>

            {/* About, Legal, Contact */}
            <div>
              <h4 className="font-serif font-bold text-sm text-foreground">About & Legal</h4>
              <ul className="mt-4 space-y-2.5 text-xs text-foreground/70">
                <li>
                  <a href="#how" className="hover:text-primary transition-colors">
                    About DocuMind
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openLegal("privacy")}
                    className="hover:text-primary transition-colors text-left"
                  >
                    Privacy Architecture
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openLegal("terms")}
                    className="hover:text-primary transition-colors text-left"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <a
                    href="mailto:hello@documind.example"
                    className="hover:text-primary transition-colors"
                  >
                    Contact Engineering
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-primary transition-colors">
                    Frequently Asked Questions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-stone-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
            <span>© 2026 DocuMind. All rights reserved.</span>
            <span className="font-mono text-[11px]">
              The Intelligent Paper Studio · Frontend Preview
            </span>
          </div>
        </div>
      </footer>

      <LegalModal open={legalOpen} onOpenChange={setLegalOpen} type={legalType} />
    </>
  );
}
