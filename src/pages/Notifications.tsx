import { useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const { notifications, unreadCount, isLoading, markRead } = useNotifications(true);

  useEffect(() => {
    if (unreadCount > 0) markRead(undefined);
  }, [unreadCount, markRead]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Chargement…</p>
            ) : notifications.length === 0 ? (
              <p className="text-muted-foreground">Aucune notification.</p>
            ) : (
              <ul className="divide-y">
                {notifications.map((n) => (
                  <li key={n.id} className={cn("py-4", !n.read_at && "font-medium")}>
                    <p>{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>{format(new Date(n.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}</span>
                      {n.link && <Link to={n.link} className="text-primary underline">Voir</Link>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
