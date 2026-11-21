import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { cn } from "@/lib/utils";

export const NotificationBell = () => {
  const { notifications, unreadCount, markRead } = useNotifications(true);
  const latest = notifications.slice(0, 5);

  return (
    <Popover onOpenChange={(open) => !open && unreadCount > 0 && markRead(undefined)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[11px] leading-[18px] text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="px-4 py-3 border-b font-medium">Notifications</div>
        {latest.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">Aucune notification</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y">
            {latest.map((n) => (
              <li key={n.id} className={cn("px-4 py-3 text-sm", !n.read_at && "bg-info-soft/60")}>
                <p className="font-medium">{n.title}</p>
                <p className="text-muted-foreground mt-0.5 line-clamp-3">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link to="/notifications" className="block px-4 py-2 text-sm text-center text-primary border-t hover:bg-muted">
          Voir toutes les notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
};
