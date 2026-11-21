import { StatusBadge } from "@/components/design";
import type { Database } from "@/integrations/supabase/types";

export type WaitlistRow = Database["public"]["Functions"]["get_waitlist"]["Returns"][number];

/** Statut d'une inscription en liste d'attente (avec position si en attente). */
export const WaitlistStatus = ({ row }: { row: Pick<WaitlistRow, "status" | "position"> }) => {
  switch (row.status) {
    case "waiting":
      return <StatusBadge status="waiting" label={`En attente — position ${row.position ?? "?"}`} />;
    case "booked":
      return <StatusBadge status="booked" />;
    case "expired":
      return <StatusBadge status="expired" />;
    default:
      return <StatusBadge status="cancelled" label="Retirée" />;
  }
};
