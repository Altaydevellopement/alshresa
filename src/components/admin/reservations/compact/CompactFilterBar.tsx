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

const control = "h-9 rounded-md text-[13px] bg-card";
const label = "mb-1 block text-xs font-medium text-muted-foreground";

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
  wednesdayReservations: WednesdayReservationWithChild[] | null;
  holidayReservations: HolidayReservationWithChild[] | null;
  /** Réinitialise aussi la période (vacances) */
  resetPeriod?: () => void;
  periodActive?: boolean;
}

/** Carte de filtres : recherche, dates, classe, groupe, puis exports à droite. */
export const CompactFilterBar = ({
  searchQuery, setSearchQuery, startDate, setStartDate, endDate, setEndDate,
  selectedClass, setSelectedClass, selectedGroup, setSelectedGroup,
  wednesdayReservations, holidayReservations, resetPeriod, periodActive,
}: CompactFilterBarProps) => {
  const exportData = prepareExportData(wednesdayReservations, holidayReservations);
  const hasFilters =
    !!searchQuery || !!startDate || !!endDate || selectedClass !== "all" || selectedGroup !== "all" || !!periodActive;

  const reset = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedClass("all");
    setSelectedGroup("all");
    resetPeriod?.();
  };

  const exportBtn = "h-9 rounded-md px-3 text-[13px] font-semibold";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-xs xl:flex-row xl:items-end">
      <div className="flex flex-1 flex-wrap items-end gap-2.5">
        <div className="w-full sm:w-auto sm:min-w-[180px] sm:flex-1 xl:max-w-[240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Rechercher un nom"
              placeholder="Rechercher un nom…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(control, "pl-9")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="f-start" className={label}>Du</label>
          <Input id="f-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(control, "w-[140px] px-2")} />
        </div>
        <div>
          <label htmlFor="f-end" className={label}>Au</label>
          <Input id="f-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={cn(control, "w-[140px] px-2")} />
        </div>

        <div>
          <label htmlFor="f-class" className={label}>Classe</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger id="f-class" className={cn(control, "w-[112px] px-3", selectedClass !== "all" && "border-primary/50 bg-peach-soft")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="f-group" className={label}>Groupe</label>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger id="f-group" className={cn(control, "w-[120px] px-3", selectedGroup !== "all" && "border-primary/50 bg-peach-soft")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" onClick={reset} className="h-9 rounded-md px-2 text-xs text-muted-foreground">
            <X className="!size-3.5" aria-hidden="true" />
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-border/70 pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
        <Button variant="outline" onClick={() => exportToPdf(exportData, startDate, endDate, selectedGroup)} className={exportBtn}>
          <FileText className="!size-4" aria-hidden="true" />
          PDF
        </Button>
        <Button variant="outline" onClick={() => exportToExcel(exportData)} className={exportBtn}>
          <FileSpreadsheet className="!size-4 text-success" aria-hidden="true" />
          Excel
        </Button>
        <ExcelFilterDialog
          exportData={exportData}
          trigger={
            <Button variant="outline" className={exportBtn}>
              <Filter className="!size-4" aria-hidden="true" />
              Excel filtré
            </Button>
          }
        />
      </div>
    </div>
  );
};
