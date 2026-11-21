import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tone = "coral" | "sage" | "peach" | "neutral";

const toneClasses: Record<Tone, string> = {
  coral: "bg-peach text-primary",
  sage: "bg-sage-soft text-sage-foreground",
  peach: "bg-peach-soft text-secondary-foreground",
  neutral: "bg-muted text-muted-foreground",
};

interface StatCardProps {
  label: string;
  value: number | string | null | undefined;
  /** Périmètre de l'indicateur, toujours affiché (ex. « mercredis à venir ») */
  scope: string;
  icon: LucideIcon;
  tone?: Tone;
  loading?: boolean;
  error?: boolean;
  href?: string;
}

/** Indicateur chiffré provenant de données réelles. Affiche « — » en cas d'erreur. */
export const StatCard = ({ label, value, scope, icon: Icon, tone = "coral", loading, error, href }: StatCardProps) => {
  const content = (
    <div className="flex items-start gap-4">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])} aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-8 w-16" />
        ) : (
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums text-foreground">
            {error || value === null || value === undefined ? "—" : value}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{error ? "Donnée indisponible" : scope}</p>
      </div>
    </div>
  );

  const className = "block rounded-xl border border-border/80 bg-card p-5 shadow-sm";
  return href ? (
    <Link to={href} className={cn(className, "transition-colors hover:border-primary/40 hover:bg-peach-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
};
