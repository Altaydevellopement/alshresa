import { FileSpreadsheet, FileText, Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WednesdayReservationWithChild, HolidayReservationWithChild } from "@/types/reservations";
import { exportToPdf } from "../export/pdfExport";
import { exportToExcel } from "../export/excelExport";
import { prepareExportData } from "../export/utils";
import { ExcelFilterDialog } from "../export/ExcelFilterDialog";
import { cn } from "@/lib/utils";

// Mêmes valeurs que ReservationFilters (la logique de filtrage reste inchangée)
const CLASSES = ["PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6EME", "5EME", "4EME", "3EME"];
const GROUPS = [
  { value: "maternelle", label: "Maternelle" },
  { value: "primaire", label: "Primaire" },
  { value: "adolescent", label: "Adolescent" },
];

interface Period {
  id: string;
  name: string;
}

// Même tri que HolidayPeriodFilter : ETE-xx d'abord, dans l'ordre, puis alphabétique
const sortPeriods = (periods: Period[]) =>
  [...periods].sort((a, b) => {
    const aMatch = a.name?.match(/^(ETE)-(\d+)$/);
    const bMatch = b.name?.match(/^(ETE)-(\d+)$/);
    if (aMatch && bMatch) return parseInt(aMatch[2]) - parseInt(bMatch[2]);
    if (aMatch) return -1;
    if (bMatch) return 1;
    return a.name.localeCompare(b.name);
  });

const control = "h-8 rounded-md text-[13px]";

interface CompactFilterBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  selectedClass: string;
  setSelectedClass: (v: string) => void;
  selectedGroup: string;
  setSelectedGroup: (v: string) => void;
  /** Filtre des périodes (vacances uniquement) */
  period?: { selected: string; onChange: (v: string) => void; options: Period[] };
}

/** Barre horizontale compacte des filtres. */
export const CompactFilterBar = ({
  searchQuery, setSearchQuery, startDate, setStartDate, endDate, setEndDate,
  selectedClass, setSelectedClass, selectedGroup, setSelectedGroup, period,
}: CompactFilterBarProps) => {
  const hasFilters =
    !!searchQuery || !!startDate || !!endDate || selectedClass !== "all" || selectedGroup !== "all" ||
    (period ? period.selected !== "all" : false);

  const reset = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedClass("all");
    setSelectedGroup("all");
    period?.onChange("all");
  };

  return (
    <div className="rounded-md border border-border/80 bg-card p-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-44">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Rechercher par nom"
            placeholder="Rechercher…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(control, "pl-8")}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="f-start" className="text-xs text-muted-foreground">Du</label>
          <Input id="f-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(control, "w-[136px] px-2")} />
          <label htmlFor="f-end" className="text-xs text-muted-foreground">au</label>
          <Input id="f-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={cn(control, "w-[136px] px-2")} />
        </div>

        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger aria-label="Classe" className={cn(control, "w-[136px] px-2.5", selectedClass !== "all" && "border-primary/50 bg-peach-soft")}>
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes classes</SelectItem>
            {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger aria-label="Groupe" className={cn(control, "w-[136px] px-2.5", selectedGroup !== "all" && "border-primary/50 bg-peach-soft")}>
            <SelectValue placeholder="Groupe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous groupes</SelectItem>
            {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {period && (
          <Select value={period.selected} onValueChange={period.onChange}>
            <SelectTrigger aria-label="Période" className={cn(control, "w-[148px] px-2.5", period.selected !== "all" && "border-primary/50 bg-peach-soft")}>
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes périodes</SelectItem>
              {sortPeriods(period.options).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <Button variant="ghost" onClick={reset} className="h-8 rounded-md px-2 text-xs text-muted-foreground">
            <X className="!size-3.5" aria-hidden="true" />
            Réinitialiser
          </Button>
        )}
      </div>

    </div>
  );
};

interface CompactExportButtonsProps {
  wednesdayReservations: WednesdayReservationWithChild[] | null;
  holidayReservations: HolidayReservationWithChild[] | null;
  startDate: string;
  endDate: string;
  selectedGroup: string;
}

/** Exports PDF / Excel / Excel filtré (mêmes fonctions que ExportButtons), format compact. */
export const CompactExportButtons = ({
  wednesdayReservations, holidayReservations, startDate, endDate, selectedGroup,
}: CompactExportButtonsProps) => {
  const exportData = prepareExportData(wednesdayReservations, holidayReservations);
  const btn = "h-7 rounded-[5px] px-2 text-xs";
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" onClick={() => exportToPdf(exportData, startDate, endDate, selectedGroup)} className={btn}>
        <FileText className="!size-3.5" aria-hidden="true" />
        PDF
      </Button>
      <Button variant="outline" onClick={() => exportToExcel(exportData)} className={btn}>
        <FileSpreadsheet className="!size-3.5" aria-hidden="true" />
        Excel
      </Button>
      <ExcelFilterDialog
        exportData={exportData}
        trigger={
          <Button variant="outline" className={btn}>
            <Filter className="!size-3.5" aria-hidden="true" />
            Excel filtré
          </Button>
        }
      />
    </div>
  );
};
