export type ThemeKind =
  "academic" | "business" | "tech" | "pitch" | "research" | "education" | "creative" | "minimal";

export type SlideType = 0 | 1 | 2 | 3;

export const SLIDE_LABELS: Record<SlideType, string> & readonly string[] = [
  "Cover / Title",
  "Structure & Agenda",
  "Data & Analysis",
  "Summary & Takeaways",
];

interface ThemeThumbProps {
  kind: ThemeKind;
  slideIndex?: SlideType;
  slide?: SlideType;
  className?: string;
}

/** Original slide compositions — each kind has its own layout, not a recolor. */
export function ThemeThumb({ kind, slideIndex = 0, slide, className = "" }: ThemeThumbProps) {
  const activeSlide = slide !== undefined ? slide : slideIndex;
  const base = `relative aspect-video w-full overflow-hidden rounded-md select-none ${className}`;

  switch (kind) {
    case "academic":
      return renderAcademic(base, activeSlide);
    case "business":
      return renderBusiness(base, activeSlide);
    case "tech":
      return renderTech(base, activeSlide);
    case "pitch":
      return renderPitch(base, activeSlide);
    case "research":
      return renderResearch(base, activeSlide);
    case "education":
      return renderEducation(base, activeSlide);
    case "creative":
      return renderCreative(base, activeSlide);
    case "minimal":
      return renderMinimal(base, activeSlide);
  }
}

function renderAcademic(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute inset-y-0 left-0 w-[6%] bg-ink" />
        <div className="absolute left-[12%] top-[14%] h-[4%] w-[26%] bg-primary/70 rounded-xs" />
        <div className="absolute left-[12%] top-[24%] h-[10%] w-[64%] rounded-sm bg-ink" />
        <div className="absolute left-[12%] top-[38%] h-[5%] w-[44%] rounded-sm bg-ink/40" />
        <div className="absolute bottom-[14%] left-[12%] right-[10%] space-y-[3%]">
          {[90, 80, 86].map((w) => (
            <div key={w} className="h-[3px] rounded bg-ink/20" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="absolute right-[8%] top-[14%] flex h-[26%] w-[16%] items-center justify-center rounded-full border-2 border-ink/30 text-[7px] font-serif font-bold text-ink/40">
          EST.
        </div>
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute inset-y-0 left-0 w-[6%] bg-ink" />
        <div className="absolute left-[12%] top-[12%] flex items-center justify-between right-[8%] border-b border-ink/20 pb-1">
          <div className="h-[6px] w-[35%] rounded-xs bg-ink" />
          <span className="font-mono text-[7px] text-ink/50">Lecture Outline</span>
        </div>
        <div className="absolute left-[12%] right-[8%] top-[30%] space-y-[6%]">
          {[
            { num: "01", w: 75 },
            { num: "02", w: 85 },
            { num: "03", w: 60 },
          ].map((item) => (
            <div key={item.num} className="flex items-center gap-[4%]">
              <span className="font-mono text-[8px] font-bold text-primary">{item.num}</span>
              <div className="h-[4px] rounded bg-ink/70" style={{ width: `${item.w}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute inset-y-0 left-0 w-[6%] bg-ink" />
        <div className="absolute left-[12%] top-[12%] h-[6px] w-[40%] rounded-xs bg-ink" />
        <div className="absolute left-[12%] top-[26%] grid grid-cols-2 gap-[6%] right-[8%] bottom-[12%]">
          <div className="rounded border border-ink/20 p-[4%] space-y-[4%]">
            <div className="h-[4px] w-[60%] rounded bg-primary" />
            <div className="space-y-[3%]">
              {[90, 80, 85].map((w) => (
                <div key={w} className="h-[2px] rounded bg-ink/30" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded bg-ink/5 border border-dashed border-ink/20 p-[4%]">
            <div className="h-[40%] w-[60%] rounded bg-primary/20 flex items-center justify-center text-[7px] font-serif text-ink">
              Diagram
            </div>
            <div className="mt-1 h-[2px] w-[70%] rounded bg-ink/20" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-paper`}>
      <div className="absolute inset-y-0 left-0 w-[6%] bg-ink" />
      <div className="absolute left-[12%] top-[12%] h-[6px] w-[35%] rounded-xs bg-ink" />
      <div className="absolute left-[12%] right-[8%] top-[28%] rounded-sm bg-primary/10 p-[4%] border-l-2 border-primary">
        <div className="h-[5px] w-[80%] rounded bg-ink" />
        <div className="mt-1 h-[3px] w-[65%] rounded bg-ink/50" />
      </div>
      <div className="absolute left-[12%] right-[8%] bottom-[14%] border-t border-ink/15 pt-1 flex justify-between text-[6px] text-ink/40 font-mono">
        <span>Citations: Smith et al. (2025)</span>
        <span>p. 142-159</span>
      </div>
    </div>
  );
}

function renderBusiness(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-ink`}>
        <div className="absolute left-[7%] top-[12%] h-[7%] w-[40%] rounded-sm bg-paper" />
        <div className="absolute left-[7%] top-[24%] h-[4%] w-[28%] rounded-sm bg-paper/40" />
        <div className="absolute bottom-[14%] left-[7%] flex h-[48%] w-[44%] items-end gap-[6%]">
          {[40, 62, 50, 82, 96].map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-sm ${i === 4 ? "bg-warning" : "bg-paper/30"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="absolute right-[7%] top-[30%] grid w-[36%] grid-cols-2 gap-[8%]">
          {["bg-warning", "bg-paper/25", "bg-paper/25", "bg-paper/25"].map((c, i) => (
            <div key={i} className={`aspect-[4/3] rounded-sm ${c}`} />
          ))}
        </div>
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-ink`}>
        <div className="absolute left-[7%] top-[10%] h-[6%] w-[35%] rounded-sm bg-paper" />
        <div className="absolute left-[7%] right-[7%] top-[26%] grid grid-cols-3 gap-[4%]">
          {[
            { val: "+42%", lbl: "YoY ARR" },
            { val: "$18.4M", lbl: "Revenue" },
            { val: "138%", lbl: "NDR" },
          ].map((k) => (
            <div
              key={k.lbl}
              className="rounded border border-paper/15 bg-paper/5 p-[6%] text-center"
            >
              <span className="font-mono text-[9px] font-bold text-warning">{k.val}</span>
              <div className="mt-1 text-[6px] text-paper/60 uppercase">{k.lbl}</div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-[14%] left-[7%] right-[7%] space-y-1">
          <div className="h-[2px] w-[90%] rounded bg-paper/20" />
          <div className="h-[2px] w-[75%] rounded bg-paper/15" />
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-ink`}>
        <div className="absolute left-[7%] top-[10%] flex justify-between right-[7%] items-center">
          <div className="h-[6%] w-[30%] rounded-sm bg-paper" />
          <span className="font-mono text-[6px] text-warning">Q1-Q4 Actuals</span>
        </div>
        <div className="absolute bottom-[14%] left-[7%] right-[7%] h-[60%] flex items-end justify-between gap-[5%] border-b border-paper/20 pb-1">
          {[30, 48, 65, 88, 70, 95].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className={`w-full rounded-t-xs ${i >= 4 ? "bg-warning" : "bg-paper/40"}`}
                style={{ height: `${h}%` }}
              />
              <span className="text-[5px] font-mono text-paper/40">M{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-ink`}>
      <div className="absolute left-[7%] top-[10%] h-[6%] w-[38%] rounded-sm bg-paper" />
      <div className="absolute left-[7%] right-[7%] top-[24%] grid grid-cols-2 gap-[5%]">
        <div className="rounded border border-warning/30 bg-warning/5 p-[5%] space-y-1">
          <span className="text-[7px] font-bold text-warning uppercase">Key Decision</span>
          <div className="h-[3px] w-[90%] rounded bg-paper/80" />
          <div className="h-[2px] w-[70%] rounded bg-paper/40" />
        </div>
        <div className="rounded border border-paper/10 bg-paper/5 p-[5%] space-y-1">
          <span className="text-[7px] font-bold text-paper/80 uppercase">Next Steps</span>
          <div className="h-[3px] w-[85%] rounded bg-paper/60" />
          <div className="h-[2px] w-[60%] rounded bg-paper/30" />
        </div>
      </div>
      <div className="absolute bottom-[10%] right-[7%] text-[6px] font-mono text-paper/30">
        Board Approval Required
      </div>
    </div>
  );
}

function renderTech(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-background`}>
        <div className="absolute inset-0 grid-lines opacity-80" />
        <div className="absolute -right-[10%] -top-[30%] h-[120%] w-[60%] rounded-full bg-primary/30 blur-2xl" />
        <svg viewBox="0 0 100 56" className="absolute inset-0 h-full w-full">
          {[
            [60, 18],
            [78, 30],
            [66, 42],
            [86, 14],
            [90, 44],
          ].map(([x, y], i) => (
            <g key={i}>
              <line
                x1="72"
                y1="28"
                x2={x}
                y2={y}
                stroke="var(--cyan)"
                strokeWidth="0.4"
                opacity="0.7"
              />
              <circle cx={x} cy={y} r="1.6" fill="var(--cyan)" />
            </g>
          ))}
          <circle cx="72" cy="28" r="3" fill="var(--primary)" />
        </svg>
        <div className="absolute left-[7%] top-[30%] h-[4%] w-[16%] rounded-sm bg-cyan" />
        <div className="absolute left-[7%] top-[40%] h-[10%] w-[42%] rounded-sm bg-foreground" />
        <div className="absolute left-[7%] top-[55%] h-[4%] w-[30%] rounded-sm bg-muted-foreground/60" />
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-background`}>
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="absolute left-[7%] top-[10%] h-[5%] w-[30%] rounded-sm bg-cyan" />
        <div className="absolute left-[7%] right-[7%] top-[24%] bottom-[12%] flex items-center justify-between gap-[3%]">
          {["Ingest API", "Worker Pool", "Vector DB"].map((node, i) => (
            <div key={node} className="flex-1 flex flex-col items-center">
              <div className="w-full rounded border border-cyan/40 bg-surface/80 p-[8%] text-center shadow-glow">
                <span className="font-mono text-[7px] text-cyan">{node}</span>
                <div className="mt-1 h-[2px] w-[50%] mx-auto rounded bg-primary/50" />
              </div>
              {i < 2 && <div className="mt-1 font-mono text-[8px] text-muted-foreground">→</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-background`}>
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="absolute left-[7%] top-[10%] flex justify-between right-[7%]">
          <div className="h-[5%] w-[36%] rounded-sm bg-cyan" />
          <span className="font-mono text-[6px] text-success">p99 Latency: 14ms</span>
        </div>
        <div className="absolute left-[7%] right-[7%] top-[26%] space-y-[4%]">
          {[
            { label: "DocuMind Engine", pct: 92, col: "bg-cyan" },
            { label: "Legacy Parser", pct: 40, col: "bg-muted-foreground/40" },
            { label: "Standard Cloud OCR", pct: 60, col: "bg-muted-foreground/50" },
          ].map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-[6px] font-mono text-muted-foreground mb-0.5">
                <span>{b.label}</span>
                <span>{b.pct}%</span>
              </div>
              <div className="h-[4px] w-full rounded bg-surface overflow-hidden">
                <div className={`h-full ${b.col}`} style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-background`}>
      <div className="absolute left-[7%] top-[10%] h-[5%] w-[30%] rounded-sm bg-cyan" />
      <div className="absolute left-[7%] right-[7%] top-[24%] bottom-[12%] rounded border border-border bg-black/60 p-[4%] font-mono text-[6px] text-cyan/90 overflow-hidden space-y-1">
        <p className="text-muted-foreground">// API Initialization</p>
        <p className="text-primary font-bold">const doc = await documind.process(&#123;</p>
        <p className="pl-2">mode: &quot;high_precision&quot;,</p>
        <p className="pl-2">preserveLayout: true</p>
        <p className="text-primary font-bold">&#125;);</p>
      </div>
    </div>
  );
}

function renderPitch(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-brand`}>
        <div className="absolute left-[8%] top-[18%] font-display text-[clamp(10px,2.4vw,22px)] font-bold leading-none text-primary-foreground">
          $4.2M
        </div>
        <div className="absolute left-[8%] top-[46%] h-[5%] w-[34%] rounded-sm bg-primary-foreground/70" />
        <div className="absolute left-[8%] top-[56%] h-[4%] w-[24%] rounded-sm bg-primary-foreground/40" />
        <div className="absolute bottom-0 right-[6%] h-[78%] w-[38%] rounded-t-lg bg-ink/80 p-[3%]">
          <div className="h-[18%] w-[60%] rounded-sm bg-cyan/70" />
          <div className="mt-[10%] h-[40%] rounded-sm bg-paper/10" />
        </div>
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-brand text-primary-foreground`}>
        <div className="absolute left-[8%] top-[12%] h-[6%] w-[36%] rounded-sm bg-primary-foreground" />
        <div className="absolute left-[8%] right-[8%] top-[28%] grid grid-cols-2 gap-[6%]">
          <div className="rounded-lg bg-black/30 p-[6%] backdrop-blur-sm">
            <span className="text-[12px] font-bold font-display">$84B</span>
            <p className="text-[6px] uppercase tracking-wider text-cyan">TAM Market</p>
          </div>
          <div className="rounded-lg bg-black/30 p-[6%] backdrop-blur-sm">
            <span className="text-[12px] font-bold font-display">10x</span>
            <p className="text-[6px] uppercase tracking-wider text-cyan">Productivity Lift</p>
          </div>
        </div>
        <div className="absolute bottom-[10%] left-[8%] right-[8%] text-[6px] text-primary-foreground/70">
          Targeting 45M knowledge workers worldwide.
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-brand text-primary-foreground`}>
        <div className="absolute left-[8%] top-[12%] h-[6%] w-[30%] rounded-sm bg-primary-foreground" />
        <div className="absolute left-[8%] right-[8%] bottom-[14%] h-[60%] flex items-end justify-between border-b border-white/20 pb-1">
          <svg viewBox="0 0 100 40" className="w-full h-full">
            <path d="M0,35 Q30,30 50,20 T100,5" fill="none" stroke="white" strokeWidth="2" />
            <circle cx="100" cy="5" r="3" fill="var(--cyan)" />
          </svg>
        </div>
        <div className="absolute left-[8%] top-[24%] text-[7px] font-bold text-cyan">
          MRR Growth: 32% Month-over-Month
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-brand text-primary-foreground`}>
      <div className="absolute left-[8%] top-[12%] h-[6%] w-[30%] rounded-sm bg-primary-foreground" />
      <div className="absolute left-[8%] right-[8%] top-[26%] grid grid-cols-3 gap-[3%] text-center">
        {[
          { pct: "50%", lbl: "Product & AI" },
          { pct: "30%", lbl: "GTM Growth" },
          { pct: "20%", lbl: "Ops & Legal" },
        ].map((item) => (
          <div key={item.lbl} className="rounded bg-black/30 p-[5%]">
            <span className="text-[10px] font-display font-bold">{item.pct}</span>
            <p className="text-[5px] uppercase mt-0.5 text-primary-foreground/80">{item.lbl}</p>
          </div>
        ))}
      </div>
      <div className="absolute bottom-[10%] left-[8%] text-[6px] text-cyan font-bold">
        Round: $1.8M Seed • Seeking Lead Investor
      </div>
    </div>
  );
}

function renderResearch(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute left-[6%] right-[6%] top-[10%] flex items-center justify-between">
          <div className="h-[6px] w-[40%] rounded bg-ink" />
          <div className="h-[4px] w-[12%] rounded bg-ink/30" />
        </div>
        <div className="absolute left-[6%] top-[26%] grid w-[88%] grid-cols-3 gap-[3%]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-[6px]">
              <div className="h-[3px] w-[60%] rounded bg-violet" />
              {[100, 90, 95, 70].map((w) => (
                <div key={w} className="h-[2px] rounded bg-ink/20" style={{ width: `${w}%` }} />
              ))}
            </div>
          ))}
        </div>
        <svg viewBox="0 0 100 30" className="absolute bottom-[8%] left-[6%] h-[34%] w-[88%]">
          <polyline
            points="0,26 15,20 30,22 45,12 60,14 75,6 100,4"
            fill="none"
            stroke="var(--violet)"
            strokeWidth="1.2"
          />
          <line
            x1="0"
            y1="29"
            x2="100"
            y2="29"
            stroke="var(--ink)"
            strokeOpacity="0.3"
            strokeWidth="0.5"
          />
        </svg>
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute left-[6%] top-[10%] h-[6px] w-[35%] rounded bg-ink" />
        <div className="absolute left-[6%] right-[6%] top-[24%] grid grid-cols-2 gap-[5%]">
          <div className="space-y-1 border border-ink/20 p-[4%] rounded">
            <span className="font-mono text-[6px] font-bold text-violet">Cohort A (n=450)</span>
            <div className="h-[3px] w-[80%] rounded bg-ink/50" />
            <div className="h-[2px] w-[95%] rounded bg-ink/25" />
          </div>
          <div className="space-y-1 border border-ink/20 p-[4%] rounded">
            <span className="font-mono text-[6px] font-bold text-violet">Cohort B (Control)</span>
            <div className="h-[3px] w-[75%] rounded bg-ink/50" />
            <div className="h-[2px] w-[90%] rounded bg-ink/25" />
          </div>
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute left-[6%] top-[10%] flex justify-between right-[6%]">
          <div className="h-[6px] w-[38%] rounded bg-ink" />
          <span className="font-mono text-[6px] text-violet">p &lt; 0.001</span>
        </div>
        <div className="absolute left-[6%] right-[6%] bottom-[12%] h-[60%] border-l border-b border-ink/30 p-1 flex items-end justify-around">
          {[25, 45, 60, 85].map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="w-5 bg-violet/80 rounded-t-xs" style={{ height: `${h}%` }} />
              <span className="text-[5px] font-mono text-ink/50">T{i}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-paper`}>
      <div className="absolute left-[6%] top-[10%] h-[6px] w-[30%] rounded bg-ink" />
      <div className="absolute left-[6%] right-[6%] top-[24%] space-y-1 text-[6px] text-ink/70">
        <div className="rounded bg-violet/10 p-[3%] border-l border-violet">
          <strong>Key Finding:</strong> Significant variance reduction observed under model
          transformation.
        </div>
        <p className="font-mono text-[5px] text-ink/40 pt-1">DOI: 10.1038/s41586-026-0819</p>
      </div>
    </div>
  );
}

function renderEducation(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-success/90`}>
        <div className="absolute -bottom-[20%] -left-[8%] h-[70%] w-[40%] rounded-full bg-warning" />
        <div className="absolute right-[6%] top-[12%] h-[76%] w-[52%] rounded-xl bg-paper p-[4%]">
          <div className="h-[12%] w-[50%] rounded bg-ink" />
          <div className="mt-[8%] space-y-[6%]">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-[6%]">
                <div className="aspect-square w-[12%] rounded-full bg-success" />
                <div className="h-[4px] flex-1 rounded bg-ink/25" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute left-[7%] top-[16%] h-[8%] w-[28%] rounded-sm bg-ink" />
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute left-[7%] top-[12%] h-[7px] w-[40%] rounded bg-success" />
        <div className="absolute left-[7%] right-[7%] top-[28%] grid grid-cols-3 gap-[4%]">
          {["1. Learn", "2. Practice", "3. Master"].map((step) => (
            <div
              key={step}
              className="rounded-lg bg-success/15 p-[6%] text-center border border-success/30"
            >
              <span className="text-[7px] font-bold text-ink">{step}</span>
              <div className="mt-1 h-[2px] w-[80%] mx-auto rounded bg-ink/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute left-[7%] top-[12%] h-[7px] w-[35%] rounded bg-success" />
        <div className="absolute left-[7%] right-[7%] top-[26%] flex items-center justify-around">
          <div className="w-[30%] aspect-square rounded-full border-4 border-success flex items-center justify-center font-display text-[10px] font-bold text-ink">
            85%
          </div>
          <div className="w-[50%] space-y-1">
            <span className="text-[7px] font-bold text-ink">Comprehension Goal</span>
            <div className="h-[3px] w-[90%] rounded bg-ink/30" />
            <div className="h-[3px] w-[70%] rounded bg-ink/20" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-paper`}>
      <div className="absolute left-[7%] top-[12%] h-[7px] w-[30%] rounded bg-success" />
      <div className="absolute left-[7%] right-[7%] top-[28%] space-y-2">
        <div className="rounded border border-success/40 bg-success/10 p-[3%] text-[7px] text-ink">
          💡 <strong>Review Check:</strong> Summarize the core mechanism in 2 sentences.
        </div>
      </div>
    </div>
  );
}

function renderCreative(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-ink`}>
        <div className="absolute left-0 top-0 h-full w-[46%] bg-violet" />
        <div className="absolute left-[30%] top-[18%] aspect-square w-[34%] rounded-full bg-warning mix-blend-screen" />
        <div className="absolute bottom-[14%] left-[6%] font-display text-[clamp(9px,2vw,18px)] font-bold italic text-paper">
          Folio
        </div>
        <div className="absolute right-[6%] top-[20%] grid w-[30%] grid-cols-2 gap-[6%]">
          <div className="col-span-2 aspect-[2/1] rounded-sm bg-paper/80" />
          <div className="aspect-square rounded-sm bg-cyan/70" />
          <div className="aspect-square rounded-sm bg-paper/30" />
        </div>
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-ink`}>
        <div className="absolute left-[6%] top-[10%] font-display text-[11px] font-bold text-paper">
          Visual Identity
        </div>
        <div className="absolute left-[6%] right-[6%] top-[26%] grid grid-cols-3 gap-[3%]">
          <div className="aspect-[3/4] rounded bg-violet" />
          <div className="aspect-[3/4] rounded bg-warning" />
          <div className="aspect-[3/4] rounded bg-cyan" />
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-ink`}>
        <div className="absolute left-[6%] top-[10%] font-display text-[11px] font-bold text-paper">
          Design System
        </div>
        <div className="absolute left-[6%] right-[6%] top-[26%] grid grid-cols-2 gap-[5%]">
          <div className="rounded border border-paper/20 p-[4%] space-y-1">
            <span className="font-mono text-[6px] text-cyan">Typography</span>
            <div className="h-[6px] w-[70%] rounded bg-paper" />
            <div className="h-[3px] w-[50%] rounded bg-paper/40" />
          </div>
          <div className="rounded border border-paper/20 p-[4%] space-y-1">
            <span className="font-mono text-[6px] text-violet">Palette</span>
            <div className="flex gap-1">
              <div className="h-4 w-4 rounded-full bg-violet" />
              <div className="h-4 w-4 rounded-full bg-warning" />
              <div className="h-4 w-4 rounded-full bg-cyan" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-ink`}>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-paper">
        <p className="font-display text-[14px] font-bold italic">Thank You</p>
        <p className="font-mono text-[6px] text-paper/60 mt-1">studio@documind.example</p>
      </div>
    </div>
  );
}

function renderMinimal(base: string, slide: SlideType) {
  if (slide === 0) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="mx-auto h-[7px] w-24 max-w-[60cqw] rounded bg-ink" />
          <div className="mx-auto mt-2 h-[3px] w-12 rounded bg-ink/30" />
        </div>
        <div className="absolute bottom-[10%] left-[8%] h-px w-[84%] bg-ink/15" />
        <div className="absolute bottom-[14%] right-[8%] h-[3px] w-[8%] rounded bg-ink/40" />
      </div>
    );
  }
  if (slide === 1) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute left-[8%] top-[14%] h-[5px] w-[20%] rounded bg-ink" />
        <div className="absolute left-[8%] right-[8%] top-[34%] space-y-[4%]">
          <div className="h-[4px] w-[70%] rounded bg-ink" />
          <div className="h-[3px] w-[85%] rounded bg-ink/40" />
          <div className="h-[3px] w-[60%] rounded bg-ink/30" />
        </div>
        <div className="absolute bottom-[12%] left-[8%] font-mono text-[5px] text-ink/30">
          01 / Focus
        </div>
      </div>
    );
  }
  if (slide === 2) {
    return (
      <div className={`${base} bg-paper`}>
        <div className="absolute left-[8%] top-[14%] h-[5px] w-[25%] rounded bg-ink" />
        <div className="absolute left-[8%] right-[8%] top-[30%] grid grid-cols-3 gap-[4%] text-center">
          {[
            { n: "01", t: "Simplicity" },
            { n: "02", t: "Precision" },
            { n: "03", t: "Restraint" },
          ].map((item) => (
            <div key={item.n} className="border-t border-ink/20 pt-1">
              <span className="font-mono text-[7px] text-ink/40">{item.n}</span>
              <p className="text-[6px] font-bold text-ink mt-0.5">{item.t}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-paper`}>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="h-[4px] w-32 rounded bg-ink" />
        <div className="mt-2 h-[2px] w-16 mx-auto rounded bg-ink/30" />
      </div>
      <div className="absolute bottom-[10%] right-[8%] font-mono text-[5px] text-ink/30">
        End of Presentation
      </div>
    </div>
  );
}
