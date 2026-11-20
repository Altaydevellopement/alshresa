

import { supabase } from "@/integrations/supabase/client";

// Définition explicite des types dont nous avons besoin
interface AuthorizedEmail {
  id: string;
  email: string;
  email_lower: string | null;
  created_at: string;
  updated_at: string;
}

export const checkAuthorizedEmail = async (email: string): Promise<AuthorizedEmail | null> => {
  const { data: authorizedEmail, error: authEmailError } = await supabase
    .from("authorized_emails")
    .select("id, email, email_lower, created_at, updated_at")
    .eq("email", email.trim())
    .maybeSingle();

  if (authEmailError) throw authEmailError;
  return authorizedEmail as AuthorizedEmail | null;
};

export const sendPasswordResetEmail = async (email: string) => {
  // Redirige vers le domaine courant (localhost, preview Vercel ou production).
  // Ce domaine doit être autorisé dans Supabase > Authentication > URL Configuration.
  const redirectUrl = `${window.location.origin}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl
  });
  
  if (error) throw error;
  
  // Log pour debug
  console.log("Email de réinitialisation envoyé avec redirectTo:", redirectUrl);
};

