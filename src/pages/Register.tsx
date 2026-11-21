
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { registerUser } from "@/services/authService";
import type { RegisterFormData } from "@/schemas/registerSchema";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExistingUserError, setIsExistingUserError] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { session } = await registerUser(values);
      if (session) {
        // Compte actif tout de suite : direction le tableau de bord
        toast.success("Compte créé, bienvenue !");
        navigate("/dashboard", { replace: true });
        return;
      }
      // La confirmation d'email est encore activée dans Supabase
      setNeedsEmailConfirmation(true);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrorMessage(error.message || "Une erreur est survenue lors de l'inscription");
      
      // Check if this is an existing user error
      setIsExistingUserError(error.message.includes("Il existe déjà un compte avec cette adresse email"));
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessDialog(false);
    navigate("/login");
  };

  const handleLoginRedirect = () => {
    setShowErrorDialog(false);
    navigate("/login");
  };

  return (
    <>
      <AuthLayout
        title="Inscription"
        description="Créez votre compte pour accéder à l'Espace des 2 rives"
        subDescription="Merci de remplir tous les champs du formulaire."
      >
        <RegisterForm onSubmit={handleSubmit} isLoading={isLoading} />
      </AuthLayout>

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isExistingUserError ? "Compte existant" : "Erreur d'inscription"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            {isExistingUserError ? (
              <>
                <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleLoginRedirect}>
                  Se connecter
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowErrorDialog(false)}>
                D'accord
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inscription réussie !</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {needsEmailConfirmation
                ? "Votre compte a été créé. Cliquez sur le lien reçu par email pour l'activer, puis connectez-vous."
                : "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter pour réserver les vacances pour vos enfants."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleSuccessConfirm}>
              Aller à la page de connexion
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Register;
