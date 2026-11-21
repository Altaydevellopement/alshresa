import { CheckCircle2, Clock, XCircle, Ban, CalendarX, Hourglass } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";

export type StatusKind =
  | "confirmed"
  | "cancelled"
  | "waiting"
  | "booked"
  | "expired"
  | "full"
  | "closed"
  | "pending";

const CONFIG: Record<StatusKind, { label: string; variant: BadgeProps["variant"]; icon: typeof CheckCircle2 }> = {
  confirmed: { label: "Confirmée", variant: "success", icon: CheckCircle2 },
  booked: { label: "Place obtenue", variant: "success", icon: CheckCircle2 },
  cancelled: { label: "Annulée", variant: "neutral", icon: XCircle },
  waiting: { label: "En attente", variant: "warning", icon: Clock },
  pending: { label: "En cours", variant: "info", icon: Hourglass },
  expired: { label: "Expirée", variant: "neutral", icon: CalendarX },
  full: { label: "Complet", variant: "destructive", icon: Ban },
  closed: { label: "Fermé", variant: "neutral", icon: Ban },
};

/** Badge de statut unique pour réservations, listes d'attente et journées. */
export const StatusBadge = ({ status, label }: { status: StatusKind; label?: string }) => {
  const { label: defaultLabel, variant, icon: Icon } = CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {label ?? defaultLabel}
    </Badge>
  );
};

export const reservationStatus = (status: string | null | undefined): StatusKind =>
  status === "cancelled" ? "cancelled" : "confirmed";
