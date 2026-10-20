export type ThemeKind =
  | "academic" | "business" | "tech" | "pitch" | "research" | "education" | "creative" | "minimal";

/** Original slide compositions — each kind has its own layout, not a recolor. */
export function ThemeThumb({ kind, className = "" }: { kind: ThemeKind; className?: string }) {
  const base = `relative aspect-video w-full overflow-hidden rounded-md ${className}`;
  switch (kind) {
    case "academic":
      return (
        <div className={`${base} bg-paper`}>
          <div className="absolute inset-y-0 left-0 w-[6%] bg-ink" />
          <div className="absolute left-[12%] top-[16%] h-[3%] w-[22%] bg-primary/70" />
          <div className="absolute left-[12%] top-[26%] h-[9%] w-[60%] rounded-sm bg-ink" />
          <div className="absolute left-[12%] top-[40%] h-[5%] w-[44%] rounded-sm bg-ink/40" />
          <div className="absolute bottom-[14%] left-[12%] right-[10%] space-y-[3%]">
            {[90, 80, 86].map((w) => <div key={w} className="h-[3px] rounded bg-ink/20" style={{ width: `${w}%` }} />)}
          </div>
          <div className="absolute right-[8%] top-[14%] h-[22%] w-[13%] rounded-full border-2 border-ink/30" />
        </div>
      );
    case "business":
      return (
        <div className={`${base} bg-ink`}>
          <div className="absolute left-[7%] top-[12%] h-[7%] w-[40%] rounded-sm bg-paper" />
          <div className="absolute left-[7%] top-[24%] h-[4%] w-[28%] rounded-sm bg-paper/40" />
          <div className="absolute bottom-[14%] left-[7%] flex h-[48%] w-[44%] items-end gap-[6%]">
            {[40, 62, 50, 82, 96].map((h, i) => (
              <div key={i} className={`flex-1 rounded-t-sm ${i === 4 ? "bg-warning" : "bg-paper/30"}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="absolute right-[7%] top-[30%] grid w-[36%] grid-cols-2 gap-[8%]">
            {["bg-warning", "bg-paper/25", "bg-paper/25", "bg-paper/25"].map((c, i) => (
              <div key={i} className={`aspect-[4/3] rounded-sm ${c}`} />
            ))}
          </div>
        </div>
      );
    case "tech":
      return (
        <div className={`${base} bg-background`}>
          <div className="absolute inset-0 grid-lines opacity-80" />
          <div className="absolute -right-[10%] -top-[30%] h-[120%] w-[60%] rounded-full bg-primary/30 blur-2xl" />
          <svg viewBox="0 0 100 56" className="absolute inset-0 h-full w-full">
            {[[60, 18], [78, 30], [66, 42], [86, 14], [90, 44]].map(([x, y], i) => (
              <g key={i}>
                <line x1="72" y1="28" x2={x} y2={y} stroke="var(--cyan)" strokeWidth="0.4" opacity="0.7" />
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
    case "pitch":
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
    case "research":
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
                {[100, 90, 95, 70].map((w) => <div key={w} className="h-[2px] rounded bg-ink/20" style={{ width: `${w}%` }} />)}
              </div>
            ))}
          </div>
          <svg viewBox="0 0 100 30" className="absolute bottom-[8%] left-[6%] h-[34%] w-[88%]">
            <polyline points="0,26 15,20 30,22 45,12 60,14 75,6 100,4" fill="none" stroke="var(--violet)" strokeWidth="1.2" />
            <line x1="0" y1="29" x2="100" y2="29" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="0.5" />
          </svg>
        </div>
      );
    case "education":
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
    case "creative":
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
    case "minimal":
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
}
