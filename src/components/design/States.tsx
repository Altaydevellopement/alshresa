import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

/** Écran « aucune donnée » homogène. */
export const EmptyState = ({ icon: Icon = Inbox, title, description, action, className, compact }: EmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-6 px-4" : "py-12 px-6", className)}>
    <span className={cn("flex items-center justify-center rounded-2xl bg-peach-soft text-primary", compact ? "h-10 w-10 mb-3" : "h-14 w-14 mb-4")} aria-hidden="true">
      <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
    </span>
    <p className="font-bold text-foreground">{title}</p>
    {description && <div className="mt-1 max-w-md text-sm text-muted-foreground">{description}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Message d'erreur lisible avec action « Réessayer ». */
export const ErrorState = ({
  title = "Impossible de charger ces informations",
  description = "Vérifiez votre connexion puis réessayez. Si le problème persiste, contactez le secrétariat.",
  onRetry,
  retryLabel = "Réessayer",
  className,
}: ErrorStateProps) => (
  <div role="alert" className={cn("flex flex-col items-center text-center py-10 px-6", className)}>
    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive-soft text-destructive" aria-hidden="true">
      <AlertTriangle className="h-6 w-6" />
    </span>
    <p className="font-bold">{title}</p>
    <div className="mt-1 max-w-md text-sm text-muted-foreground">{description}</div>
    {onRetry && (
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        {retryLabel}
      </Button>
    )}
  </div>
);

/** Squelette de chargement générique (liste ou bloc). */
export const LoadingState = ({ rows = 3, label = "Chargement…", className }: { rows?: number; label?: string; className?: string }) => (
  <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
    <span className="sr-only">{label}</span>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-14 w-full rounded-xl" />
    ))}
  </div>
);

/** Chargement plein écran (vérification de session, droits…). */
export const FullPageLoader = ({ label = "Chargement…" }: { label?: string }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-muted-foreground" aria-busy="true" aria-live="polite">
    <span className="h-10 w-10 rounded-full border-4 border-peach border-t-primary animate-spin" aria-hidden="true" />
    <p className="text-sm">{label}</p>
  </div>
);
