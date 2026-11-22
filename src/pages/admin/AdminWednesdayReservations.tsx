
import { useAdminAuth } from "@/components/admin/reservations/hooks/useAdminAuth";
import { useAdminReservations } from "@/components/admin/reservations/hooks/useAdminReservations";
import { AdminWednesdayReservationsContent } from "@/components/admin/reservations/AdminWednesdayReservationsContent";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminWednesdayReservations = () => {
  const navigate = useNavigate();
  const { data: isAdmin } = useAdminAuth();
  const { 
    data, 
    refetch: refetchReservations, 
    isLoading, 
    error: queryError 
  } = useAdminReservations(isAdmin);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">Accès non autorisé</h1>
        <div>Vous devez être administrateur pour accéder à cette page.</div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-extrabold">Gestion des réservations - Mercredis</h1>
        <div className="text-destructive">
          Erreur lors du chargement des réservations: {queryError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold leading-tight">Réservations — Mercredis</h1>
          <p className="text-[13px] text-muted-foreground">Gestion des réservations des mercredis</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => navigate('/admin/reservations/new')} className="h-8 rounded-md px-3 text-xs">
            <CalendarPlus className="!size-3.5" aria-hidden="true" />
            Réserver des mercredis
          </Button>
        </div>
      </div>
      <AdminWednesdayReservationsContent
        wednesdayReservations={data?.wednesdayReservations || null}
        isLoading={isLoading}
        refetchReservations={refetchReservations}
      />
    </div>
  );
};

export default AdminWednesdayReservations;
