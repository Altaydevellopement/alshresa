
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface WednesdayOptionsProps {
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
  onOptionChange: (date: Date, option: 'withoutMeal' | 'earlyDropoff', value: boolean) => void;
}

export const WednesdayOptions = ({ 
  date, 
  withoutMeal, 
  earlyDropoff, 
  onOptionChange 
}: WednesdayOptionsProps) => {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-surface-muted px-3 py-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`without-meal-${date}`}
          checked={withoutMeal}
          onCheckedChange={(checked) =>
            onOptionChange(date, 'withoutMeal', checked as boolean)
          }
          
        />
        <Label 
          htmlFor={`without-meal-${date}`}
          className="text-sm text-foreground"
        >
          Sans repas
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`early-dropoff-${date}`}
          checked={earlyDropoff}
          onCheckedChange={(checked) =>
            onOptionChange(date, 'earlyDropoff', checked as boolean)
          }
          
        />
        <Label 
          htmlFor={`early-dropoff-${date}`}
          className="text-sm text-foreground"
        >
          Accueil avant 8h30
        </Label>
      </div>
    </div>
  );
};
