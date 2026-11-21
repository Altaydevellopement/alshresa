import { LoadingState as DesignLoadingState, PageHeader } from "@/components/design";
import { CalendarDays } from "lucide-react";

export const LoadingState = () => (
  <div className="space-y-6">
    <PageHeader icon={CalendarDays} title="Rendez-vous d'inscription" />
    <DesignLoadingState rows={3} label="Chargement des créneaux…" />
  </div>
);
