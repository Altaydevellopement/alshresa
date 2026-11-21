import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Logo texte de l'application (ne dépend d'aucune image). */
export const BrandMark = ({ to = "/", subtitle, className }: { to?: string; subtitle?: string; className?: string }) => (
  <Link to={to} className={cn("flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-coral shadow-sm" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M3 15c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.5 4-1" />
        <path d="M3 10c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.5 4-1" opacity=".7" />
      </svg>
    </span>
    <span className="leading-tight">
      <span className="block text-[15px] font-extrabold text-foreground">Espace des 2 Rives</span>
      <span className="block text-xs font-medium text-muted-foreground">{subtitle ?? "Réservations"}</span>
    </span>
  </Link>
);
