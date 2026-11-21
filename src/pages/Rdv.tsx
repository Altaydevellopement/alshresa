import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/design";
import { LoadingState } from "@/components/rdv/LoadingState";
import { UserRdv } from "@/components/rdv/UserRdv";
import { RdvCalendar } from "@/components/rdv/RdvCalendar";
import { AvailableSlots } from "@/components/rdv/AvailableSlots";
import { ConfirmRdvDialog } from "@/components/rdv/ConfirmRdvDialog";
import { ReservationCompleteDialog } from "@/components/rdv/ReservationCompleteDialog";
import { useRdv } from "@/hooks/useRdv";
import { useAccessControl } from "@/hooks/useAccessControl";
export default function RdvPage() {
  const {
    rdvAccess,
    loading: accessLoading
  } = useAccessControl();
  const {
    loading,
    userRdv,
    rdvList,
    selectedDate,
    setSelectedDate,
    availableSlots,
    selectedRdv,
    selectedMotifs,
    showConfirmDialog,
    setShowConfirmDialog,
    reservationComplete,
    setReservationComplete,
    summerRange,
    handleMotifChange,
    handleReservation,
    handleSelectSlot,
    handleCompleteDialogClose
  } = useRdv();
  if (accessLoading || loading) {
    return <LoadingState />;
  }
  if (!rdvAccess) {
    return <div className="space-y-6">
        <PageHeader icon={CalendarDays} title="Rendez-vous d'inscription" />
        <Card>
          <EmptyState icon={CalendarDays} title="Prise de rendez-vous pas encore ouverte" description="La prise de rendez-vous pour les inscriptions de l'année 2026-2027 n'est pas encore ouverte. Vous serez informé dès que le service sera accessible." />
        </Card>
      </div>;
  }
  if (userRdv) {
    return <UserRdv userRdv={userRdv} />;
  }
  return <>
      <div className="space-y-6">
        <PageHeader
          icon={CalendarDays}
          title="Rendez-vous d'inscription année scolaire 2025-2026"
          description="Une inscription avant chaque début d'année scolaire est obligatoire. Sélectionnez une date pour voir les créneaux disponibles."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <RdvCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} rdvList={rdvList} summerRange={summerRange} />

          <AvailableSlots selectedDate={selectedDate} availableSlots={availableSlots} onSelectSlot={handleSelectSlot} />
        </div>

        <ConfirmRdvDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog} selectedRdv={selectedRdv} selectedMotifs={selectedMotifs} handleMotifChange={handleMotifChange} handleReservation={handleReservation} isLoading={loading} />

        <ReservationCompleteDialog open={reservationComplete} onOpenChange={setReservationComplete} selectedRdv={selectedRdv} selectedMotifs={selectedMotifs} onClose={handleCompleteDialogClose} />
      </div>
    </>;
}