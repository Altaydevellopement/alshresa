import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FamilyReservation {
  id: string;
  kind: "wednesday" | "holiday";
  date: string; // yyyy-MM-dd
  status: string;
  reservationNumber: string;
  withoutMeal: boolean;
  earlyDropoff: boolean;
  childId: string;
  childName: string;
  childClass: string;
  periodName?: string | null;
}

/**
 * Réservations (mercredis + vacances) des enfants de la famille connectée.
 * La sécurité est assurée par les règles RLS : seules les réservations de la
 * famille sont renvoyées.
 */
export const useFamilyReservations = () =>
  useQuery({
    queryKey: ["family-reservations"],
    queryFn: async (): Promise<FamilyReservation[]> => {
      const [wed, hol] = await Promise.all([
        supabase
          .from("wednesday_reservations")
          .select(
            "id, status, reservation_number, without_meal, early_dropoff, child_id, children(first_name, last_name, school_class), available_wednesdays!wednesday_reservations_wednesday_id_fkey(date)",
          ),
        supabase
          .from("holiday_reservations")
          .select(
            "id, status, reservation_number, reservation_date, without_meal, early_dropoff, child_id, children(first_name, last_name, school_class), available_holiday_periods(name)",
          ),
      ]);
      if (wed.error) throw wed.error;
      if (hol.error) throw hol.error;

      const rows: FamilyReservation[] = [
        ...(wed.data ?? []).map((r) => ({
          id: r.id,
          kind: "wednesday" as const,
          date: r.available_wednesdays?.date ?? "",
          status: r.status ?? "confirmed",
          reservationNumber: r.reservation_number,
          withoutMeal: !!r.without_meal,
          earlyDropoff: !!r.early_dropoff,
          childId: r.child_id,
          childName: `${r.children?.first_name ?? ""} ${r.children?.last_name ?? ""}`.trim(),
          childClass: r.children?.school_class ?? "",
        })),
        ...(hol.data ?? []).map((r) => ({
          id: r.id,
          kind: "holiday" as const,
          date: r.reservation_date,
          status: r.status ?? "confirmed",
          reservationNumber: r.reservation_number,
          withoutMeal: !!r.without_meal,
          earlyDropoff: !!r.early_dropoff,
          childId: r.child_id,
          childName: `${r.children?.first_name ?? ""} ${r.children?.last_name ?? ""}`.trim(),
          childClass: r.children?.school_class ?? "",
          periodName: r.available_holiday_periods?.name ?? null,
        })),
      ];
      return rows.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));
    },
  });

/** Enfants de la famille connectée. */
export const useFamilyChildren = () =>
  useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("profile_id", auth.user.id)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

/** Périodes de réservation à venir (vacances) et mercredis ouverts. */
export const useUpcomingPeriods = () =>
  useQuery({
    queryKey: ["upcoming-periods"],
    queryFn: async () => {
      const today = todayKey();
      const [periods, wednesdays] = await Promise.all([
        supabase
          .from("available_holiday_periods")
          .select("id, name, start_date, end_date")
          .gte("end_date", today)
          .order("start_date")
          .limit(6),
        supabase.from("available_wednesdays").select("id, date").gte("date", today).order("date"),
      ]);
      if (periods.error) throw periods.error;
      if (wednesdays.error) throw wednesdays.error;
      return {
        periods: periods.data ?? [],
        nextWednesday: wednesdays.data?.[0]?.date ?? null,
        wednesdayCount: wednesdays.data?.length ?? 0,
      };
    },
  });

/** "2026-11-25" → Date locale (évite le décalage UTC de new Date("yyyy-MM-dd")). */
export const parseDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
