export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="dm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--cyan)" />
        </linearGradient>
      </defs>
      <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="url(#dm-g)" opacity="0.18" stroke="url(#dm-g)" strokeWidth="1.5" />
      <path d="M19 3v7h7" fill="none" stroke="url(#dm-g)" strokeWidth="1.5" />
      <path d="M15 13l1.6 3.9L20.5 18.5l-3.9 1.6L15 24l-1.6-3.9-3.9-1.6 3.9-1.6Z" fill="url(#dm-g)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">
        Docu<span className="text-cyan">Mind</span>
      </span>
    </span>
  );
}
