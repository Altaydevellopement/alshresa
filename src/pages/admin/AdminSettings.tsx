import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/design";
import { WaitlistSettingsCard } from "@/components/admin/settings/WaitlistSettingsCard";

const AdminSettings = () => (
  <div className="space-y-6">
    <PageHeader
      icon={SlidersHorizontal}
      eyebrow="Administration"
      title="Paramètres"
      description="Réglages généraux de la plateforme de réservation."
    />
    <WaitlistSettingsCard />
  </div>
);

export default AdminSettings;
