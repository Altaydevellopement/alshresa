
import { useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "@/components/design";
import { CompactFilterBar } from "./compact/CompactFilterBar";
import { CompactReservationTable } from "./compact/CompactReservationTable";
import { EditReservationDialog } from "./EditReservationDialog";
import { DeleteReservationDialog } from "./DeleteReservationDialog";
import { useState } from "react";
import { useReservationActions } from "./ReservationActions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WednesdayReservationWithChild } from "@/types/reservations";
import { useFilteredWednesdayReservations } from "./hooks/useFilteredWednesdayReservations";

interface AdminWednesdayReservationsContentProps {
  wednesdayReservations: WednesdayReservationWithChild[] | null;
  isLoading: boolean;
  refetchReservations: () => Promise<unknown>;
}

export const AdminWednesdayReservationsContent = ({
  wednesdayReservations,
  isLoading,
  refetchReservations,
}: AdminWednesdayReservationsContentProps) => {
  const {
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedClass,
    setSelectedClass,
    selectedGroup,
    setSelectedGroup,
    filteredWednesdayReservations,
    wednesdayPagination
  } = useFilteredWednesdayReservations(wednesdayReservations);

  const {
    reservationToDelete,
    setReservationToDelete,
    editingReservation,
    setEditingReservation,
    isSubmitting,
    handleDelete,
    handleUpdate
  } = useReservationActions({ refetchReservations });

  const [editingWithoutMeal, setEditingWithoutMeal] = useState(false);
  const [editingEarlyDropoff, setEditingEarlyDropoff] = useState(false);
  const [selectedReservations, setSelectedReservations] = useState<string[]>([]);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  const closeEditDialog = () => {
    setEditingReservation(null);
    setEditingWithoutMeal(false);
    setEditingEarlyDropoff(false);
  };

  const handleEditClick = (reservation: WednesdayReservationWithChild) => {
    setEditingReservation(reservation);
    setEditingWithoutMeal(reservation.without_meal);
    setEditingEarlyDropoff(reservation.early_dropoff);
  };

  const handleDeleteClick = (data: { id: string, type: 'wednesday' | 'holiday' }) => {
    setReservationToDelete(data);
  };

  const handleUpdate_ = async () => {
    if (!editingReservation) return;

    const updatedReservation = {
      ...editingReservation,
      without_meal: editingWithoutMeal,
      early_dropoff: editingEarlyDropoff,
    };

    setEditingReservation(updatedReservation);
    await handleUpdate();
    closeEditDialog();
  };

  // Selection handling
  const handleSelectionChange = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedReservations(prev => [...prev, id]);
    } else {
      setSelectedReservations(prev => prev.filter(item => item !== id));
    }
  };

  const handleSelectAll = () => {
    if (!filteredWednesdayReservations) return;
    
    if (selectedReservations.length === filteredWednesdayReservations.length) {
      setSelectedReservations([]);
    } else {
      const allIds = filteredWednesdayReservations.map(res => res.id);
      setSelectedReservations(allIds);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedReservations.length === 0 || isSubmitting) return;
    
    setIsDeletingMultiple(true);
    
    try {
      if (!filteredWednesdayReservations) return;
      
      const selectedIdsInCurrentTab = filteredWednesdayReservations
        .filter(res => selectedReservations.includes(res.id))
        .map(res => res.id);
      
      if (selectedIdsInCurrentTab.length === 0) {
        toast.info("Aucune réservation sélectionnée");
        setIsDeletingMultiple(false);
        return;
      }
      
      const { error } = await supabase
        .from('wednesday_reservations')
        .delete()
        .in('id', selectedIdsInCurrentTab);
      
      if (error) throw error;
      
      await refetchReservations();
      setSelectedReservations(prev => prev.filter(id => !selectedIdsInCurrentTab.includes(id)));
      toast.success(`${selectedIdsInCurrentTab.length} réservation(s) supprimée(s) avec succès`);
    } catch (error) {
      console.error("Erreur lors de la suppression multiple:", error);
      toast.error("Une erreur est survenue lors de la suppression des réservations");
    } finally {
      setIsDeletingMultiple(false);
    }
  };


  if (isLoading) {
    return <LoadingState rows={6} label="Chargement des réservations…" />;
  }

  return (
    <div className="space-y-4">
      <CompactFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        wednesdayReservations={filteredWednesdayReservations}
        holidayReservations={null}
      />

      <CompactReservationTable
        filtered={filteredWednesdayReservations}
        pagination={wednesdayPagination}
        selectedReservations={selectedReservations}
        onSelectionChange={handleSelectionChange}
        onSelectAll={handleSelectAll}
        onDeleteSelected={handleDeleteSelected}
        isDeletingMultiple={isDeletingMultiple}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      <DeleteReservationDialog
        isOpen={!!reservationToDelete}
        onClose={() => setReservationToDelete(null)}
        onConfirm={handleDelete}
      />

      <EditReservationDialog
        reservation={editingReservation}
        isOpen={!!editingReservation}
        onClose={closeEditDialog}
        onUpdate={handleUpdate_}
        isSubmitting={isSubmitting}
        withoutMeal={editingWithoutMeal}
        earlyDropoff={editingEarlyDropoff}
        onWithoutMealChange={setEditingWithoutMeal}
        onEarlyDropoffChange={setEditingEarlyDropoff}
      />
    </div>
  );
};
