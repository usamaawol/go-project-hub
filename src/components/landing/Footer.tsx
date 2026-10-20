import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
      <footer className="border-t border-border bg-card/50 dark:bg-card/40 backdrop-blur-xs text-foreground">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand identity column */}
            <div className="lg:col-span-2 space-y-3">
              <Logo />
              <p className="font-serif italic text-base text-foreground/90 mt-2">
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
              <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                <li>
                  <Link to="/converter" className="hover:text-primary transition-colors">
                    Convert Documents
                  </Link>
                </li>
                <li>
                  <Link to="/presentation-maker" className="hover:text-primary transition-colors">
                    Create Presentations
                  </Link>
                </li>
                <li>
                  <Link to="/pdf-compressor" className="hover:text-primary transition-colors">
                    Compress Files
                  </Link>
                </li>
                <li>
                  <Link to="/text-extractor" className="hover:text-primary transition-colors">
                    Extract Text & OCR
                  </Link>
                </li>
                <li>
                  <Link to="/document-studio" className="hover:text-primary transition-colors">
                    Improve Formatting
                  </Link>
                </li>
              </ul>
            </div>

            {/* Templates & Workflows */}
            <div>
              <h4 className="font-serif font-bold text-sm text-foreground">Templates</h4>
              <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                <li>
                  <Link to="/templates" className="hover:text-primary transition-colors">
                    Business Presentations
                  </Link>
                </li>
                <li>
                  <Link to="/templates" className="hover:text-primary transition-colors">
                    Education & Lecture Themes
                  </Link>
                </li>
                <li>
                  <Link to="/templates" className="hover:text-primary transition-colors">
                    Research & Scientific Papers
                  </Link>
                </li>
                <li>
                  <Link to="/templates" className="hover:text-primary transition-colors">
                    Pitch Decks & Portfolios
                  </Link>
                </li>
                <li>
                  <Link to="/templates" className="hover:text-primary transition-colors">
                    Pricing & Free Access
                  </Link>
                </li>
              </ul>
            </div>

            {/* About, Legal, Contact */}
            <div>
              <h4 className="font-serif font-bold text-sm text-foreground">About & Legal</h4>
              <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                <li>
                  <Link to="/about" className="hover:text-primary transition-colors">
                    About DocuMind
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openLegal("privacy")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Privacy Architecture
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openLegal("terms")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-primary transition-colors">
                    Contact Engineering
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="hover:text-primary transition-colors">
                    Frequently Asked Questions
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
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
