
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, FullPageLoader } from "@/components/design";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      setIsChecking(false);
    }
  }, [loading]);

  // Afficher un indicateur de chargement pendant la vérification
  if (isChecking || loading) {
    return <FullPageLoader label="Vérification de votre session…" />;
  }

  // Rediriger vers la page de connexion seulement pour les routes admin
  if (!isAuthenticated) {
    // Pour les routes admin, rediriger vers /admin-login
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin-login" state={{ from: location }} replace />;
    }
    // Pour toutes les autres routes protégées, afficher un message ou un bouton de redirection
    // sans faire de redirection automatique
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-md">
          <EmptyState
            icon={Lock}
            title="Accès restreint"
            description="Vous devez être connecté pour accéder à cette page."
            action={
              <Button asChild size="lg">
                <Link to="/login">Se connecter</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Si l'utilisateur est authentifié, permettre l'accès
  return <>{children}</>;
}
