import { useSyncExternalStore } from "react";

// Proposition d'inscription sur liste d'attente, affichée par <WaitlistOfferDialog />
// (monté une seule fois dans l'application) dès qu'une réservation tombe sur un jour complet.

export interface WaitlistOfferItem {
  kind: "wednesday" | "holiday";
  /** id du mercredi (kind = wednesday) ou de la période (kind = holiday) */
  targetId: string;
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

export interface WaitlistOffer {
  childId: string;
  childName: string;
  items: WaitlistOfferItem[];
  /** true si d'autres dates ont pu être réservées dans la même demande */
  partial: boolean;
}

let current: WaitlistOffer | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const offerWaitlist = (offer: WaitlistOffer) => {
  if (offer.items.length === 0) return;
  current = offer;
  emit();
};

export const closeWaitlistOffer = () => {
  current = null;
  emit();
};

export const useWaitlistOffer = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
