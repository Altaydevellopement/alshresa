
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { FullPageLoader, ErrorState } from "@/components/design";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";

export const AdminPage = () => {
  const { data: isAdmin, isLoading, isError, isChecking } = useAdminAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    // Mettre à jour l'état sans redirection
    if (!isChecking && !isLoading) {
      if (!isAdmin) {
        toast.error("Accès non autorisé. Vous devez être administrateur pour accéder à cette page.");
      } else {
        setShowAdmin(true);
      }
    }
  }, [isAdmin, isLoading, isChecking]);

  // Afficher un indicateur de chargement pendant la vérification
  if (isChecking || isLoading) {
    return <FullPageLoader label="Vérification des droits d'accès…" />;
  }

  // Afficher un message d'erreur si une erreur s'est produite
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorState title="Vérification des droits impossible" description="Une erreur est survenue lors de la vérification des droits d'accès." onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // Si l'utilisateur est admin, afficher la page d'administration
  if (showAdmin) {
    return <AdminLayout />;
  }

  // Sinon, afficher un message d'accès refusé
  return (
    <div className="min-h-screen flex items-center justify-center">
      <ErrorState
        title="Accès non autorisé"
        description="Vous devez être administrateur pour accéder à cette page."
        onRetry={() => { window.location.href = "/admin-login"; }}
        retryLabel="Se connecter en administrateur"
      />
    </div>
  );
};
