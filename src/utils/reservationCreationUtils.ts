
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { offerWaitlist, type WaitlistOfferItem } from "@/components/waitlist/waitlistOffer";

interface DateOption {
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

export interface ReservationResult {
  success: boolean;
  error?: string;
  noSpots?: {
    schoolClass: string;
    date: Date;
  };
  periodId?: string;
  periodName?: string;
  childData?: any;
  successfulReservations?: any[];
  reservationNumber?: string;
  /** des dates étaient complètes : la liste d'attente a été proposée */
  waitlistOffered?: boolean;
}

export const createHolidayReservations = async (
  selectedChild: string,
  selectedDates: DateOption[],
  holidayPeriods: any[] | null | undefined,
  submissionTimestamp: number
): Promise<ReservationResult> => {
  try {
    const { data: childData, error: childError } = await supabase
      .from("children")
      .select("first_name, last_name, school_class")
      .eq("id", selectedChild)
      .single();

    if (childError) throw childError;

    // Récupérer les informations de période pour l'email
    let periodName = "";
    let periodId = "";
    if (holidayPeriods && selectedDates.length > 0) {
      const firstDate = selectedDates[0].date;
      const period = holidayPeriods.find(period => {
        const startDate = new Date(period.start_date);
        const endDate = new Date(period.end_date);
        return firstDate >= startDate && firstDate <= endDate;
      });
      
      if (period) {
        periodId = period.id;
        periodName = `${format(new Date(period.start_date), "d MMMM yyyy", { locale: fr })} au ${format(new Date(period.end_date), "d MMMM yyyy", { locale: fr })}`;
        console.log(`🏷️ createHolidayReservations - Période identifiée: ${periodName}, ID: ${periodId} (timestamp: ${submissionTimestamp})`);
      }
    }

    // Un numéro commun à toutes les dates de cette demande
    const reservationNumber = `HOL-${Date.now().toString().substring(5)}`;

    const successfulReservations: { id: string; reservation_date: string }[] = [];
    const fullDates: WaitlistOfferItem[] = [];
    let failures = 0;

    // Chaque date est vérifiée ET réservée côté serveur en une seule opération :
    // impossible de dépasser la capacité, même si plusieurs familles réservent en même temps.
    for (const dateOption of selectedDates) {
      if (!(dateOption.date instanceof Date) || isNaN(dateOption.date.getTime())) {
        failures++;
        continue;
      }
      const dateStr = format(dateOption.date, "yyyy-MM-dd");
      const period = holidayPeriods?.find(
        (p) => dateStr >= p.start_date && dateStr <= p.end_date
      );
      if (!period) {
        failures++;
        continue;
      }

      const { data, error } = await supabase.rpc("book_holiday_day", {
        p_child_id: selectedChild,
        p_period_id: period.id,
        p_date: dateStr,
        p_without_meal: dateOption.withoutMeal,
        p_early_dropoff: dateOption.earlyDropoff,
        p_reservation_number: reservationNumber,
      });
      if (error) throw error;

      const result = data as unknown as { status: string; reservation_id?: string };
      if (result.status === "booked" && result.reservation_id) {
        successfulReservations.push({ id: result.reservation_id, reservation_date: dateStr });
      } else if (result.status === "full") {
        fullDates.push({
          kind: "holiday",
          targetId: period.id,
          date: dateOption.date,
          withoutMeal: dateOption.withoutMeal,
          earlyDropoff: dateOption.earlyDropoff,
        });
      } else if (result.status !== "already_booked") {
        failures++;
      }
    }

    // Jours complets : proposer la liste d'attente
    offerWaitlist({
      childId: selectedChild,
      childName: childData.first_name,
      items: fullDates,
      partial: successfulReservations.length > 0,
    });

    return {
      success: successfulReservations.length > 0,
      waitlistOffered: fullDates.length > 0,
      childData,
      periodId,
      periodName,
      successfulReservations,
      reservationNumber,
      error: failures > 0
        ? `${failures} date(s) n'ont pas pu être réservées.`
        : undefined,
    };
  } catch (error: any) {
    console.error(`❌ createHolidayReservations - Erreur générale: ${error.message} (timestamp: ${submissionTimestamp})`);
    return {
      success: false,
      error: error.message || "Une erreur est survenue lors de la création des réservations."
    };
  }
};
