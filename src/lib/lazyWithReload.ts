import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "e2r-chunk-reload";

/**
 * Comme React.lazy, mais si le fichier de la page n'existe plus (nouvelle
 * version publiée pendant que l'onglet était ouvert), on recharge la page une
 * fois pour récupérer la version à jour au lieu d'afficher une erreur.
 */
export const lazyWithReload = <T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      const module = await factory();
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* stockage indisponible */ }
      return module;
    } catch (error) {
      let alreadyReloaded = false;
      try { alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "1"; } catch { /* stockage indisponible */ }
      if (!alreadyReloaded) {
        try { sessionStorage.setItem(RELOAD_KEY, "1"); } catch { /* stockage indisponible */ }
        window.location.reload();
        // La page se recharge : on attend sans rien afficher d'autre
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
