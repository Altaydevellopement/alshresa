

import { supabase } from "@/integrations/supabase/client";

// Vérifie côté serveur si l'email est autorisé, sans exposer la liste des emails.
export const checkAuthorizedEmail = async (email: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("is_email_authorized", { p_email: email });
  if (error) throw error;
  return data === true;
};

export const sendPasswordResetEmail = async (email: string) => {
  // Redirige vers le domaine courant (localhost, preview Vercel ou production).
  // Ce domaine doit être autorisé dans Supabase > Authentication > URL Configuration.
  const redirectUrl = `${window.location.origin}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl
  });
  
  if (error) throw error;
};

