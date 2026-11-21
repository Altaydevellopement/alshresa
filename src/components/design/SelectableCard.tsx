import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SelectableCardProps {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Carte cliquable à choix unique (enfant, période…). Bouton à bascule (aria-pressed), utilisable au clavier. */
export const SelectableCard = ({ selected, onSelect, title, subtitle, icon, disabled, className }: SelectableCardProps) => (
  <button
    type="button"
    aria-pressed={selected}
    disabled={disabled}
    onClick={onSelect}
    className={cn(
      "group relative flex w-full items-center gap-3 rounded-xl border-2 bg-card p-4 text-left transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      selected ? "border-primary bg-peach-soft" : "border-border hover:border-primary/40 hover:bg-peach-soft/50",
      disabled && "cursor-not-allowed opacity-50",
      className,
    )}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    <span className="min-w-0 flex-1">
      <span className="block font-bold text-foreground truncate">{title}</span>
      {subtitle && <span className="block text-sm text-muted-foreground">{subtitle}</span>}
    </span>
    <CheckCircle2
      className={cn("h-5 w-5 shrink-0 transition-opacity", selected ? "text-primary opacity-100" : "opacity-0")}
      aria-hidden="true"
    />
  </button>
);

/** Pastille d'initiales colorée (avatar enfant / parent). */
export const InitialsAvatar = ({ name, className }: { name: string; className?: string }) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground", className)} aria-hidden="true">
      {initials || "?"}
    </span>
  );
};
