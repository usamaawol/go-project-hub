import { useState, useEffect, useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Sparkles, ChevronRight, ChevronLeft, X, CheckCircle2, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TourStep {
  id: string;
  targetSelector: string;
  route?: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetSelector: '[data-tour="hero-badge"]',
    route: "/",
    title: "Welcome to DocuMind",
    content:
      "DocuMind is an intelligent paper studio that helps you generate presentations, format academic documents, convert formats, and compress files effortlessly.",
    placement: "bottom",
  },
  {
    id: "sidebar",
    targetSelector: '[data-tour="sidebar-nav"]',
    title: "Tool Navigation",
    content:
      "Use this sidebar to navigate between dedicated workspaces: Presentation Maker, Document Studio, Converter, Compressor, Extractor, and Templates.",
    placement: "right",
  },
  {
    id: "presentation-maker",
    targetSelector: '[data-tour="nav-presentation-maker"]',
    title: "Presentation Maker",
    content:
      "Supply text or upload a document to automatically analyze structure, receive theme recommendations, and generate genuine PowerPoint (.pptx) decks.",
    placement: "right",
  },
  {
    id: "document-studio",
    targetSelector: '[data-tour="nav-document-studio"]',
    title: "Document Studio",
    content:
      "A dedicated workspace for styling reports, essays, and manuscripts with academic cover pages, heading hierarchies, margins, running headers, and tables of contents.",
    placement: "right",
  },
  {
    id: "converter",
    targetSelector: '[data-tour="nav-converter"]',
    title: "File Converter",
    content:
      "Convert documents between PDF, DOCX, and TXT with deterministic layout reconstruction and real downloadable outputs.",
    placement: "right",
  },
  {
    id: "compressor",
    targetSelector: '[data-tour="nav-compressor"]',
    title: "PDF Compressor",
    content:
      "Reduce PDF file sizes with Light, Balanced, and Strong modes while preserving vector fonts and text sharpness. Real byte comparison with zero fake numbers.",
    placement: "right",
  },
  {
    id: "extractor",
    targetSelector: '[data-tour="nav-extractor"]',
    title: "Text Extractor",
    content:
      "Extract clean, readable text from documents and manuscripts with instant one-click copying and TXT export.",
    placement: "right",
  },
  {
    id: "templates",
    targetSelector: '[data-tour="nav-templates"]',
    title: "Presentation Themes",
    content:
      "Explore 110 professionally designed presentation themes. 50 themes are 100% free with no watermarks, and 60 Pro themes are available for 100 ETB / month.",
    placement: "right",
  },
  {
    id: "feedback",
    targetSelector: '[data-tour="feedback-btn"]',
    title: "Feedback & Bug Reports",
    content:
      "Have a suggestion or found an issue? Click here anytime to send feedback directly to our engineering team.",
    placement: "right",
  },
  {
    id: "theme-toggle",
    targetSelector: '[data-tour="theme-toggle"]',
    title: "Light & Dark Theme",
    content:
      "DocuMind defaults to warm paper ivory, but you can switch to midnight navy mode at any time with this toggle.",
    placement: "right",
  },
  {
    id: "finish",
    targetSelector: '[data-tour="quick-actions"]',
    route: "/",
    title: "You're All Set!",
    content:
      "Start creating presentations, improving document layouts, or compressing files. You can restart this tour anytime from the sidebar or your Account settings.",
    placement: "top",
  },
];

const TOUR_STORAGE_KEY = "documind_tour_completed";

export function ProductTour() {
  const [active, setActive] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Listen for custom start tour event
  useEffect(() => {
    const handleStart = () => {
      setCurrentStepIdx(0);
      setActive(true);
    };
    window.addEventListener("documind-start-tour", handleStart);
    return () => window.removeEventListener("documind-start-tour", handleStart);
  }, []);

  // Check for first-time visitor auto-start after a brief delay
  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed && currentPath === "/") {
        const timer = setTimeout(() => {
          setActive(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [currentPath]);

  const step = TOUR_STEPS[currentStepIdx] || TOUR_STEPS[0]!;

  // Locate and scroll target into view
  const updateTargetPosition = useCallback(() => {
    if (!active) return;
    const targetEl = document.querySelector(step.targetSelector);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      setTimeout(() => {
        setTargetRect(targetEl.getBoundingClientRect());
      }, 300);
    } else {
      // Fallback center position
      setTargetRect(null);
    }
  }, [active, step]);

  useEffect(() => {
    if (!active) return;

    // Check if route switch needed
    if (step.route && step.route !== currentPath) {
      void navigate({ to: step.route });
      setTimeout(updateTargetPosition, 400);
    } else {
      updateTargetPosition();
    }

    const handleResize = () => updateTargetPosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [active, currentStepIdx, step, currentPath, navigate, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, currentStepIdx]);

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setActive(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Semi-transparent Backdrop Mask */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300"
      />

      {/* Target Spotlight Highlight Ring */}
      {targetRect && (
        <div
          className="absolute rounded-xl pointer-events-none ring-4 ring-primary ring-offset-2 ring-offset-background shadow-2xl transition-all duration-300 animate-pulse"
          style={{
            top: `${Math.max(8, targetRect.top - 6)}px`,
            left: `${Math.max(8, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Guided Tooltip Popover Card */}
      <div
        className="absolute z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card p-5 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
        style={getPopoverPosition(targetRect, step.placement)}
      >
        <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Compass className="h-3.5 w-3.5" />
            </span>
            <span className="font-mono text-[11px] font-bold text-primary uppercase tracking-wider">
              Step {currentStepIdx + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            onClick={handleClose}
            aria-label="Skip Tour"
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="font-serif text-base font-bold text-foreground">{step.title}</h3>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{step.content}</p>

        {/* Navigation Buttons */}
        <div className="mt-5 flex items-center justify-between pt-3 border-t border-border">
          <button
            onClick={handleClose}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-1.5">
            {currentStepIdx > 0 && (
              <Button
                variant="glass"
                size="sm"
                onClick={handlePrev}
                className="h-7 text-xs px-2.5 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            <Button
              variant="hero"
              size="sm"
              onClick={handleNext}
              className="h-7 text-xs px-3.5 gap-1"
            >
              {currentStepIdx === TOUR_STEPS.length - 1 ? (
                <>
                  Get Started <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                </>
              ) : (
                <>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculates responsive popover position based on target element bounding box
 */
function getPopoverPosition(
  rect: DOMRect | null,
  placement: TourStep["placement"] = "bottom",
): React.CSSProperties {
  if (!rect || typeof window === "undefined") {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const popoverWidth = Math.min(384, window.innerWidth - 32);
  const popoverHeight = 220;

  if (placement === "right" && rect.right + popoverWidth + 20 < window.innerWidth) {
    return {
      top: `${Math.max(16, Math.min(window.innerHeight - popoverHeight - 16, rect.top))}px`,
      left: `${rect.right + 16}px`,
    };
  }

  if (placement === "left" && rect.left - popoverWidth - 20 > 0) {
    return {
      top: `${Math.max(16, Math.min(window.innerHeight - popoverHeight - 16, rect.top))}px`,
      left: `${rect.left - popoverWidth - 16}px`,
    };
  }

  if (placement === "top" && rect.top - popoverHeight - 20 > 0) {
    return {
      top: `${rect.top - popoverHeight - 16}px`,
      left: `${Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, rect.left))}px`,
    };
  }

  // Default to bottom or fallback
  const topPos = rect.bottom + 16;
  if (topPos + popoverHeight < window.innerHeight) {
    return {
      top: `${topPos}px`,
      left: `${Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, rect.left))}px`,
    };
  }

  // Fallback centered
  return {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };
}

/**
 * Utility function to restart product tour from any component
 */
export function restartProductTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("documind-start-tour"));
  }
}
