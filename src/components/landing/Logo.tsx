interface LogoMarkProps {
  className?: string;
}

export function LogoMark({ className = "h-8 w-8" }: LogoMarkProps) {
  return <img src="/logo.png" alt="DocuMind Logo Mark" className={`object-contain ${className}`} />;
}

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white p-1 shadow-xs group-hover:border-primary/40 group-hover:shadow-sm transition-all">
        <img src="/logo.png" alt="DocuMind Logo" className="h-full w-full object-contain" />
      </div>
      {showText && (
        <span className="font-sans text-xl font-bold tracking-tight text-foreground">
          Docu<span className="text-primary font-serif font-normal italic">Mind</span>
        </span>
      )}
    </span>
  );
}
