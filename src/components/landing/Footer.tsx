import { toast } from "sonner";
import { Logo } from "./Logo";

const soon = (what: string) => () => toast(`${what} page coming soon`);

export function Footer() {
  const cols = [
    { h: "Product", l: [["Overview", "#product"], ["Templates", "#templates"], ["How It Works", "#how"], ["Pricing", "#pricing"]] },
    { h: "Tools", l: [["Convert", "#tools"], ["Presentations", "#tools"], ["Compress", "#tools"], ["OCR", "#tools"]] },
  ];
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">Your Documents. Smarter.</p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h4 className="text-sm font-semibold">{c.h}</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {c.l.map(([t, h]) => <li key={t}><a href={h} className="hover:text-foreground">{t}</a></li>)}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><button onClick={soon("Privacy")} className="hover:text-foreground">Privacy</button></li>
            <li><button onClick={soon("Terms")} className="hover:text-foreground">Terms</button></li>
            <li><a href="mailto:hello@documind.example" className="hover:text-foreground">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">© 2026 DocuMind. Design preview.</div>
    </footer>
  );
}
