
import { supabase } from "@/integrations/supabase/client";
import type { RegisterFormData } from "@/schemas/registerSchema";

// Vérifie côté serveur si l'email est autorisé, sans jamais lire la liste des emails.
const checkAuthorizedEmail = async (email: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("is_email_authorized", { p_email: email });
  if (error) throw error;
  return data === true;
};

export const registerUser = async (formData: RegisterFormData) => {
  const isAuthorized = await checkAuthorizedEmail(formData.email);
  
  if (!isAuthorized) {
    throw new Error(
      "Vous n'êtes pas encore inscrit à l'espace des Deux Rives, merci de nous contacter au 02 32 68 32 10 afin de prendre rendez-vous."
    );
  }

  try {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          automaticPayment: formData.automaticPayment,
          acceptedCgu: formData.acceptedCgu,
        },
      },
    });

    if (signUpError) {
      // Check if error is related to existing user
      if (signUpError.message.includes("User already registered")) {
        throw new Error("Il existe déjà un compte avec cette adresse email. Merci de cliquer sur le lien ci-dessous pour vous connecter.");
      }
      throw signUpError;
    }
    
    if (!authData.user) throw new Error("No user data returned");

    return authData.user;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};
