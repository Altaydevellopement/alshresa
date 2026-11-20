
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Les identifiants Supabase viennent des variables d'environnement
// (fichier .env en local, "Environment Variables" dans Vercel).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Configuration Supabase manquante : définissez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (voir .env.example)."
  );
}

// Clé de stockage du token d'authentification Supabase (dérivée de l'identifiant du projet)
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
    detectSessionInUrl: true,
    storageKey: STORAGE_KEY,
    flowType: 'implicit'
  }
});

// Fonction utilitaire pour vérifier l'état de la session
export const checkSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[supabase] Erreur lors de la vérification de la session:", error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error("[supabase] Exception lors de la vérification de la session:", err);
    return null;
  }
};
