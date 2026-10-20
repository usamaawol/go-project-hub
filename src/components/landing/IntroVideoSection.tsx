import { useState } from "react";
import { Play, Sparkles, Shield, Layers, Eye, CheckCircle2 } from "lucide-react";

export interface IntroVideoSectionProps {
  videoUrl?: string;
  className?: string;
}

/**
 * Extracts a standard 11-character YouTube video ID from various URL formats
 * (e.g. youtu.be/ID, youtube.com/watch?v=ID, youtube-nocookie.com/embed/ID, or direct ID).
 */
export function extractYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // If already an 11-char ID like -ya6HxljoVw
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const regExp =
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
    const match = trimmed.match(regExp);
    return match && match[1] ? match[1] : null;
  } catch {
    return null;
  }
}

export function IntroVideoSection({
  videoUrl = "https://youtu.be/-ya6HxljoVw",
  className = "",
}: IntroVideoSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = extractYouTubeId(videoUrl);

  // If URL is invalid or unconfigured, don't show a broken player
  if (!videoId) {
    return null;
  }

  // Privacy-enhanced domain youtube-nocookie.com with clean parameter configuration
  // Autoplay only starts if the user explicitly clicked the interactive preview poster
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1${
    isPlaying ? "&autoplay=1" : ""
  }`;

  return (
    <section
      id="meet-documind"
      aria-label="Meet DocuMind Video Introduction"
      className={`relative mx-auto max-w-7xl px-5 lg:px-8 py-8 sm:py-12 ${className}`}
    >
      {/* Ambient background glow in signature DocuMind cobalt & lavender */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 max-w-4xl h-72 sm:h-96 rounded-full bg-linear-to-tr from-primary/15 via-lavender/15 to-transparent blur-3xl opacity-70 dark:opacity-50" />

      {/* Header & Description */}
      <div className="relative text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary shadow-xs">
          <Play className="h-3 w-3 fill-current" />
          <span>Meet DocuMind</span>
        </div>

        <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-foreground">
          See How DocuMind <span className="italic text-primary">Works</span>
        </h2>

        <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed">
          Discover how to create presentations, improve documents, preview your work, and download
          when you're ready.
        </p>
      </div>

      {/* Responsive 16:9 Video Frame */}
      <div className="relative mx-auto max-w-5xl">
        <div className="relative rounded-2xl sm:rounded-3xl border border-primary/25 bg-card/85 p-2 sm:p-3.5 shadow-2xl backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-primary/5">
          {/* Inner 16:9 Aspect Ratio Frame */}
          <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black/90 shadow-inner">
            {/* Embedded Iframe using youtube-nocookie.com */}
            <iframe
              src={embedUrl}
              title="See How DocuMind Works — Product Overview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>

        {/* Value Highlights Under Video */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto text-xs">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/60 px-4 py-2.5 text-foreground/80 shadow-xs backdrop-blur-xs">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium">AI & Vector Slide Synthesis</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/60 px-4 py-2.5 text-foreground/80 shadow-xs backdrop-blur-xs">
            <Eye className="h-4 w-4 text-lavender shrink-0" />
            <span className="font-medium">Interactive 16:9 Live Preview</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/60 px-4 py-2.5 text-foreground/80 shadow-xs backdrop-blur-xs">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">10-Minute Ephemeral Privacy</span>
          </div>
        </div>
      </div>
    </section>
  );
}
