import { useMemo, useState, type ReactNode } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { format } from "date-fns";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Check, CheckSquare, ChevronLeft, ChevronRight, Minus, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WednesdayReservationWithChild, HolidayReservationWithChild } from "@/types/reservations";
import { cn } from "@/lib/utils";

type Reservation = WednesdayReservationWithChild | HolidayReservationWithChild;

interface Pagination<T> {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  setItemsPerPage: (items: number) => void;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

interface CompactReservationTableProps<T extends Reservation> {
  /** Toutes les réservations filtrées */
  filtered: T[] | null;
  pagination: Pagination<T>;
  selectedReservations: string[];
  onSelectionChange: (id: string, isSelected: boolean) => void;
  /** Bascule existante : sélectionne / désélectionne toutes les réservations filtrées */
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  isDeletingMultiple: boolean;
  onEdit: (reservation: T) => void;
  onDelete: (data: { id: string; type: "wednesday" | "holiday" }) => void;
  /** Filtre complémentaire affiché dans la barre (ex. période des vacances) */
  extraFilter?: ReactNode;
}

type SortKey = "name" | "date";

const dateKey = (r: Reservation) => ("wednesday_id" in r ? r.available_wednesdays?.date : r.reservation_date) ?? "";
const nameKey = (r: Reservation) => `${r.children.last_name} ${r.children.first_name}`;

/** Case à cocher (gère l'état intermédiaire). */
const TableCheckbox = ({
  checked, onCheckedChange, label,
}: { checked: boolean | "indeterminate"; onCheckedChange: (v: boolean) => void; label: string }) => (
  <CheckboxPrimitive.Root
    checked={checked}
    onCheckedChange={(v) => onCheckedChange(v === true)}
    aria-label={label}
    className={cn(
      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-input bg-card transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
    )}
  >
    <CheckboxPrimitive.Indicator>
      {checked === "indeterminate" ? <Minus className="h-3 w-3" strokeWidth={3} /> : <Check className="h-3 w-3" strokeWidth={3} />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);

/** Bouton d'action encadré (30 px) avec infobulle accessible. */
const RowAction = ({
  label, onClick, children, tone = "default",
}: { label: string; onClick: () => void; children: ReactNode; tone?: "default" | "danger" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          "inline-flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border bg-card transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          tone === "danger"
            ? "border-destructive/40 text-destructive hover:bg-destructive-soft"
            : "border-border text-foreground hover:border-primary/40 hover:bg-peach-soft",
        )}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="px-2 py-1 text-xs">{label}</TooltipContent>
  </Tooltip>
);

const OptionTag = ({ children, tone }: { children: ReactNode; tone: "coral" | "neutral" }) => (
  <span
    className={cn(
      "inline-flex h-6 items-center whitespace-nowrap rounded-[5px] px-2 text-xs font-medium",
      tone === "coral" ? "bg-peach text-secondary-foreground" : "bg-peach-soft text-foreground",
    )}
  >
    {children}
  </span>
);

const SortHeader = ({
  label, active, dir, onClick,
}: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-sm font-semibold hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    aria-label={`Trier par ${label.toLowerCase()}${active ? (dir === "asc" ? ", ordre croissant" : ", ordre décroissant") : ""}`}
  >
    {label}
    {active ? (
      dir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
    ) : (
      <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
    )}
  </button>
);

/** Tableau de gestion des réservations (admin) : barre de sélection, tri, actions, pagination. */
export const CompactReservationTable = <T extends Reservation>({
  filtered, pagination, selectedReservations, onSelectionChange, onSelectAll,
  onDeleteSelected, isDeletingMultiple, onEdit, onDelete, extraFilter,
}: CompactReservationTableProps<T>) => {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  // Le tri s'applique à toute la liste filtrée, puis on découpe la page courante
  const rows = useMemo(() => {
    if (!sort || !filtered) return pagination.paginatedData;
    const sorted = [...filtered].sort((a, b) => {
      const va = sort.key === "name" ? nameKey(a) : dateKey(a);
      const vb = sort.key === "name" ? nameKey(b) : dateKey(b);
      const cmp = va.localeCompare(vb, "fr", { sensitivity: "base" });
      return sort.dir === "asc" ? cmp : -cmp;
    });
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    return sorted.slice(start, start + pagination.itemsPerPage);
  }, [sort, filtered, pagination.paginatedData, pagination.currentPage, pagination.itemsPerPage]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));

  const filteredIds = (filtered ?? []).map((r) => r.id);
  const selectedInFilter = filteredIds.filter((id) => selectedReservations.includes(id)).length;
  const allSelected = filteredIds.length > 0 && selectedInFilter === filteredIds.length;
  const headerState: boolean | "indeterminate" = allSelected ? true : selectedInFilter > 0 ? "indeterminate" : false;
  const total = pagination.totalItems;

  return (
    <div className="space-y-3">
      {/* Barre : compteur, filtre complémentaire, sélection */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 items-center rounded-lg bg-peach px-4 text-sm font-bold text-secondary-foreground tabular-nums" aria-live="polite">
            {total} réservation{total > 1 ? "s" : ""}
            {selectedInFilter > 0 && <span className="ml-1.5 font-semibold">· {selectedInFilter} sélectionnée{selectedInFilter > 1 ? "s" : ""}</span>}
          </span>
          {extraFilter}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onSelectAll} disabled={filteredIds.length === 0} className="h-9 rounded-md px-3 text-[13px] font-semibold">
            <CheckSquare className="!size-4" aria-hidden="true" />
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </Button>
          <Button
            onClick={onDeleteSelected}
            disabled={selectedInFilter === 0 || isDeletingMultiple}
            className="h-9 rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-45"
          >
            <Trash2 className="!size-4" aria-hidden="true" />
            {isDeletingMultiple ? "Suppression…" : selectedInFilter > 0 ? `Supprimer la sélection (${selectedInFilter})` : "Supprimer la sélection"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="h-10 border-b border-border/70 bg-peach-soft/60 text-left text-[13px] text-foreground">
                <th scope="col" className="w-12 pl-4 pr-1">
                  <TableCheckbox
                    checked={headerState}
                    onCheckedChange={() => onSelectAll()}
                    label={allSelected ? "Désélectionner toutes les réservations filtrées" : "Sélectionner toutes les réservations filtrées"}
                  />
                </th>
                <th scope="col" className="px-3 font-semibold" aria-sort={sort?.key === "name" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <SortHeader label="Enfant" active={sort?.key === "name"} dir={sort?.dir ?? "asc"} onClick={() => toggleSort("name")} />
                </th>
                <th scope="col" className="w-24 px-3 font-semibold">Classe</th>
                <th scope="col" className="w-36 px-3 font-semibold" aria-sort={sort?.key === "date" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <SortHeader label="Date" active={sort?.key === "date"} dir={sort?.dir ?? "asc"} onClick={() => toggleSort("date")} />
                </th>
                <th scope="col" className="px-3 font-semibold">Options</th>
                <th scope="col" className="w-28 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">Aucune réservation trouvée</td>
                </tr>
              ) : (
                rows.map((r) => {
                  const selected = selectedReservations.includes(r.id);
                  const type = "wednesday_id" in r ? "wednesday" : "holiday";
                  const name = nameKey(r);
                  const day = dateKey(r);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "h-[42px] border-b border-border/50 transition-colors last:border-b-0",
                        selected ? "bg-peach-soft shadow-[inset_3px_0_0_hsl(var(--primary))]" : "hover:bg-surface-muted/40",
                      )}
                    >
                      <td className="pl-4 pr-1">
                        <TableCheckbox checked={selected} onCheckedChange={(v) => onSelectionChange(r.id, v)} label={`Sélectionner ${name}`} />
                      </td>
                      <td className="max-w-[280px] truncate px-3 font-bold text-foreground">{name}</td>
                      <td className="px-3">
                        <span className="inline-flex h-6 min-w-[36px] items-center justify-center rounded-[5px] bg-peach-soft px-2 text-xs font-bold text-foreground">
                          {r.children.school_class}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 tabular-nums text-foreground">
                        {day ? format(new Date(day), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {r.early_dropoff && <OptionTag tone="coral">Accueil avant 8h30</OptionTag>}
                          {r.without_meal && <OptionTag tone="neutral">Sans repas</OptionTag>}
                          {!r.early_dropoff && !r.without_meal && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4">
                        <div className="flex justify-end gap-1.5">
                          <RowAction label={`Modifier la réservation de ${name}`} onClick={() => onEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </RowAction>
                          <RowAction label={`Supprimer la réservation de ${name}`} tone="danger" onClick={() => onDelete({ id: r.id, type })}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </RowAction>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="tabular-nums">{pagination.startIndex}–{pagination.endIndex} sur {total}</span>
              <span aria-hidden="true">·</span>
              <label htmlFor="rows-per-page">Lignes par page</label>
              <Select value={String(pagination.itemsPerPage)} onValueChange={(v) => pagination.setItemsPerPage(Number(v))}>
                <SelectTrigger id="rows-per-page" className="h-7 w-[70px] rounded-[5px] px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {pagination.totalPages > 1 && (
              <nav className="flex items-center gap-1.5" aria-label="Pagination">
                <Button variant="outline" onClick={pagination.goToPreviousPage} disabled={pagination.currentPage <= 1} className="h-7 w-7 rounded-[5px] p-0" aria-label="Page précédente">
                  <ChevronLeft className="!size-4" aria-hidden="true" />
                </Button>
                <span className="px-1 tabular-nums text-foreground">Page {pagination.currentPage} / {pagination.totalPages}</span>
                <Button variant="outline" onClick={pagination.goToNextPage} disabled={pagination.currentPage >= pagination.totalPages} className="h-7 w-7 rounded-[5px] p-0" aria-label="Page suivante">
                  <ChevronRight className="!size-4" aria-hidden="true" />
                </Button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
