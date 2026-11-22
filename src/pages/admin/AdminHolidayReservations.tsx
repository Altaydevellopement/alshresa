
import { useAdminAuth } from "@/components/admin/reservations/hooks/useAdminAuth";
import { useAdminReservations } from "@/components/admin/reservations/hooks/useAdminReservations";
import { AdminHolidayReservationsContent } from "@/components/admin/reservations/AdminHolidayReservationsContent";
import { Button } from "@/components/ui/button";
import { CalendarDays, CalendarPlus, ChevronRight, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const AdminHolidayReservations = () => {
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
        <h1 className="text-2xl md:text-3xl font-extrabold">Gestion des réservations - Vacances</h1>
        <div className="text-destructive">
          Erreur lors du chargement des réservations: {queryError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Fil d'Ariane" className="text-[13px]">
        <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          <li><Link to="/admin" className="hover:text-foreground">Administration</Link></li>
          <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
          <li className="text-primary">Réservations</li>
          <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
          <li aria-current="page" className="font-semibold text-foreground">Vacances</li>
        </ol>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-1 hidden h-9 w-9 shrink-0 text-primary sm:block" strokeWidth={1.6} aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-extrabold leading-tight md:text-[28px]">Gestion des réservations – Vacances</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground md:text-sm">Consultez, filtrez, modifiez ou supprimez les réservations des vacances scolaires.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/reservations/new-holiday')} className="h-9 rounded-md border-primary/40 bg-peach-soft px-3.5 text-[13px] font-semibold text-primary hover:bg-peach hover:text-primary">
            <CalendarPlus className="!size-4" aria-hidden="true" />
            Réserver des vacances
          </Button>
          <Button onClick={() => navigate('/admin/reservations/new-teen-holiday')} className="h-9 rounded-md bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover">
            <Users className="!size-4" aria-hidden="true" />
            Réserver Club Ado
          </Button>
        </div>
      </div>
      <AdminHolidayReservationsContent
        holidayReservations={data?.holidayReservations || null}
        isLoading={isLoading}
        refetchReservations={refetchReservations}
      />
    </div>
  );
};

export default AdminHolidayReservations;
