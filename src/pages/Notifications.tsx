import { useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingState, PageHeader } from "@/components/design";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const { notifications, unreadCount, isLoading, markRead } = useNotifications(true);

  // Ouvrir la page marque les notifications comme lues
  useEffect(() => {
    if (unreadCount > 0) markRead(undefined);
  }, [unreadCount, markRead]);

  return (
    <div className="space-y-6">
      <PageHeader icon={Bell} title="Notifications" description="Les messages du centre : places obtenues en liste d'attente, informations importantes." />
      <Card>
        <CardContent className="pt-5 md:pt-6">
          {isLoading ? (
            <LoadingState rows={3} />
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="Aucune notification" description="Vous serez prévenu(e) ici si une place se libère pour votre enfant." />
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn("rounded-xl border p-4", !n.read_at ? "border-peach bg-peach-soft" : "border-border bg-card")}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", !n.read_at ? "bg-primary" : "bg-border")} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {!n.read_at && <span className="sr-only">Non lue : </span>}
                        {n.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{format(new Date(n.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
                        {n.link && (
                          <Link to={n.link} className="inline-flex items-center font-semibold text-primary hover:underline">
                            Voir <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
