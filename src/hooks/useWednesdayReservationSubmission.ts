
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { offerWaitlist, type WaitlistOfferItem } from "@/components/waitlist/waitlistOffer";

interface DateOption {
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

export const useWednesdayReservationSubmission = (
  selectedChild: string,
  selectedDates: DateOption[],
  isDateAlreadyReserved: (date: Date) => boolean,
  refetchReservations: () => Promise<any>,
  resetForm: () => void
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excludedFullDates, setExcludedFullDates] = useState<Date[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const handleSubmit = async () => {
    if (!selectedChild) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un enfant.",
        variant: "destructive",
      });
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une date.",
        variant: "destructive",
      });
      return;
    }

    const alreadyReservedDates = selectedDates.filter(dateOption => 
      isDateAlreadyReserved(dateOption.date)
    );

    if (alreadyReservedDates.length > 0) {
      const datesList = alreadyReservedDates
        .map(d => format(d.date, "d MMMM yyyy", { locale: fr }))
        .join(", ");
      
      toast({
        title: "Dates déjà réservées",
        description: `Les dates suivantes sont déjà réservées pour cet enfant : ${datesList}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    setProgressMessage("Initialisation...");

    try {
      // Étape 1: Récupérer les informations de l'enfant
      setProgress(20);
      setProgressMessage("Récupération des informations de l'enfant...");
      
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("first_name, last_name, school_class")
        .eq("id", selectedChild)
        .single();

      if (childError) throw childError;

      // Étape 2 : réserver chaque mercredi. La vérification des places et la création
      // se font côté serveur en une seule opération (pas de surréservation possible).
      setProgress(40);
      setProgressMessage("Réservation des mercredis...");

      const availableDates: DateOption[] = [];
      const fullDates: Date[] = [];
      const waitlistItems: WaitlistOfferItem[] = [];
      const otherErrors: string[] = [];

      for (let i = 0; i < selectedDates.length; i++) {
        const dateOption = selectedDates[i];
        const dateLabel = format(dateOption.date, "dd/MM/yyyy");
        setProgress(40 + (i / selectedDates.length) * 40);
        setProgressMessage(`Réservation ${i + 1}/${selectedDates.length}...`);

        const { data: wednesday, error: wednesdayError } = await supabase
          .from("available_wednesdays")
          .select("id")
          .eq("date", format(dateOption.date, "yyyy-MM-dd"))
          .maybeSingle();

        if (wednesdayError) throw wednesdayError;
        if (!wednesday) throw new Error(`Mercredi non trouvé pour la date ${dateLabel}`);

        const { data, error } = await supabase.rpc("book_wednesday", {
          p_child_id: selectedChild,
          p_wednesday_id: wednesday.id,
          p_without_meal: dateOption.withoutMeal,
          p_early_dropoff: dateOption.earlyDropoff,
        });
        if (error) throw error;

        const result = data as unknown as { status: string; reason?: string };
        switch (result.status) {
          case "booked":
            availableDates.push(dateOption);
            break;
          case "full":
            fullDates.push(dateOption.date);
            waitlistItems.push({
              kind: "wednesday",
              targetId: wednesday.id,
              date: dateOption.date,
              withoutMeal: dateOption.withoutMeal,
              earlyDropoff: dateOption.earlyDropoff,
            });
            break;
          case "already_booked":
            break;
          case "closed":
            otherErrors.push(`${dateLabel} : centre fermé`);
            break;
          default:
            otherErrors.push(`${dateLabel} : ${result.reason ?? "réservation impossible"}`);
        }
      }

      setExcludedFullDates(fullDates);

      if (otherErrors.length > 0) {
        toast({
          title: "Certaines dates n'ont pas pu être réservées",
          description: otherErrors.join(" • "),
          variant: "destructive",
        });
      }

      // Mercredis complets : proposer la liste d'attente
      offerWaitlist({
        childId: selectedChild,
        childName: childData.first_name,
        items: waitlistItems,
        partial: availableDates.length > 0,
      });

      if (availableDates.length === 0) {
        setProgress(0);
        setProgressMessage("");
        await refetchReservations();
        return;
      }

      // Étape 4: Envoyer l'email de confirmation
      setProgress(80);
      setProgressMessage("Envoi de l'email de confirmation...");
      
      const childFullName = `${childData.first_name} ${childData.last_name}`;
      const formattedDates = availableDates.map(d => format(d.date, "EEEE d MMMM yyyy", { locale: fr }));
      
      const requestId = `wednesday-${childFullName}-${Date.now()}`;
      
      await supabase.functions.invoke('send-reservation-email', {
        body: {
          childName: childFullName,
          dates: formattedDates,
          reservationType: 'wednesday',
          withoutMeal: availableDates.map(d => d.withoutMeal),
          earlyDropoff: availableDates.map(d => d.earlyDropoff),
          requestId
        }
      });

      // Étape 5: Actualiser les données
      setProgress(90);
      setProgressMessage("Actualisation des données...");
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["available_wednesdays"] }),
        queryClient.invalidateQueries({ queryKey: ["wednesday_reservations"] }),
        refetchReservations()
      ]);

      setProgress(100);
      setProgressMessage("Réservation terminée avec succès !");

      resetForm();
      
      // Afficher le dialogue de succès après un petit délai
      setTimeout(() => {
        setShowSuccessDialog(true);
        setProgress(0);
        setProgressMessage("");
      }, 500);

    } catch (error: any) {
      console.error("Erreur lors de la création des réservations:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la création des réservations.",
        variant: "destructive",
      });
      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { 
    handleSubmit, 
    showSuccessDialog, 
    setShowSuccessDialog,
    isSubmitting,
    excludedFullDates,
    progress,
    progressMessage
  };
};
