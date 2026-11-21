
import { Calendar, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface EmptyHolidayStateProps {
  message: string;
  subtitle: string;
  icon?: "calendar" | "info" | "error";
  className?: string;
  children?: ReactNode;
}

export const EmptyHolidayState = ({ 
  message, 
  subtitle, 
  icon = "calendar",
  className,
  children
}: EmptyHolidayStateProps) => {
  return (
    <div className={cn("p-8 border rounded-lg bg-info-soft shadow-sm", className)}>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="p-3 bg-info-soft rounded-full">
          {icon === "calendar" ? (
            <Calendar className="h-8 w-8 text-primary" />
          ) : icon === "error" ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
          ) : (
            <Info className="h-8 w-8 text-primary" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {message}
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
};
