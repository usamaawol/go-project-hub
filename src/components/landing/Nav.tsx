import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

const links = [
  { href: "#product", label: "Product" },
  { href: "#tools", label: "Tools" },
  { href: "#templates", label: "Templates" },
  { href: "#how", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
];

export const startFree = () =>
  toast("Accounts are coming soon", { description: "This is a design preview — sign-up isn't live yet." });

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || open ? "border-border bg-background/80 backdrop-blur-xl" : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#top" aria-label="DocuMind home"><Logo /></a>
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" onClick={() => toast("Sign in is coming soon")}>Sign In</Button>
          <Button variant="hero" onClick={startFree}>Start for Free</Button>
        </div>
        <button
          className="rounded-md p-2 text-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-border px-5 pb-6 pt-2 md:hidden animate-in fade-in slide-in-from-top-2">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block border-b border-border/60 py-3 text-base text-foreground">
              {l.label}
            </a>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="glass" onClick={() => { setOpen(false); toast("Sign in is coming soon"); }}>Sign In</Button>
            <Button variant="hero" onClick={() => { setOpen(false); startFree(); }}>Start for Free</Button>
          </div>
        </div>
      )}
    </header>
  );
}
