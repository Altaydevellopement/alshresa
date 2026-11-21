import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Petit libellé au-dessus du titre (ex. « Réserver ») */
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

/** En-tête standard des pages : titre, description et actions. */
export const PageHeader = ({ title, description, icon: Icon, eyebrow, actions, className }: PageHeaderProps) => (
  <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
    <div className="flex items-start gap-4 min-w-0">
      {Icon && (
        <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peach text-primary" aria-hidden="true">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{title}</h1>
        {description && <div className="text-sm md:text-base text-muted-foreground max-w-2xl">{description}</div>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
  </header>
);
