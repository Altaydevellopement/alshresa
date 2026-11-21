
import { Button } from "@/components/ui/button";
import { ChildrenList } from "@/components/profile/ChildrenList";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileData, Child } from "@/types/profile";
import { Card } from "@/components/ui/card";
import { UserCircle } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/design";

const Profile = () => {
  // Pas de redirection automatique ici

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
        
      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error("Profile not found");
      }

      return {
        ...data,
        email: user.email,
      } as ProfileData;
    },
  });

  const { data: children = [], isLoading: childrenLoading, error: childrenError } = useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("profile_id", user.id);
        
      if (error) {
        throw error;
      }
      return data as Child[];
    },
    enabled: !!profile, // Only fetch children if profile exists
  });

  const header = (
    <PageHeader icon={UserCircle} title="Mon compte" description="Vos informations personnelles et vos préférences." />
  );

  if (profileError || childrenError) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <ErrorState
            description="Une erreur est survenue lors du chargement des données. Veuillez réessayer."
            onRetry={() => window.location.reload()}
          />
        </Card>
      </div>
    );
  }

  if (profileLoading || childrenLoading) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState rows={3} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <EmptyState
            icon={UserCircle}
            title="Profil introuvable"
            description="Veuillez vous reconnecter."
            action={
              <Button asChild>
                <Link to="/login">Se connecter</Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}
      <ProfileSection profile={profile} />
      <ChildrenList children={children} />
    </div>
  );
};

export default Profile;
