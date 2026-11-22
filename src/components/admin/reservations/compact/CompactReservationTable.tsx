import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Minus, Pencil, Trash2, X } from "lucide-react";
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
  /** Toutes les réservations filtrées (sélection « tout ») */
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
  /** Contenu affiché à droite du bandeau (ex. exports) */
  toolbar?: React.ReactNode;
}

const reservationDate = (r: Reservation) =>
  new Date("wednesday_id" in r ? r.available_wednesdays.date : r.reservation_date);

/** Case à cocher compacte (gère l'état intermédiaire). */
const TableCheckbox = ({
  checked, onCheckedChange, label,
}: { checked: boolean | "indeterminate"; onCheckedChange: (v: boolean) => void; label: string }) => (
  <CheckboxPrimitive.Root
    checked={checked}
    onCheckedChange={(v) => onCheckedChange(v === true)}
    aria-label={label}
    className={cn(
      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-card transition-colors",
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

/** Bouton d'action icône (28 px) avec infobulle accessible. */
const IconAction = ({
  label, onClick, children, tone = "default", disabled,
}: { label: string; onClick: () => void; children: React.ReactNode; tone?: "default" | "danger"; disabled?: boolean }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
          tone === "danger" ? "hover:bg-destructive-soft hover:text-destructive" : "hover:bg-peach-soft hover:text-primary",
        )}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="px-2 py-1 text-xs">{label}</TooltipContent>
  </Tooltip>
);

const OptionTag = ({ children, tone }: { children: React.ReactNode; tone: "coral" | "neutral" }) => (
  <span
    className={cn(
      "inline-flex h-5 items-center whitespace-nowrap rounded-[4px] px-1.5 text-[11px] font-medium",
      tone === "coral" ? "bg-peach-soft text-secondary-foreground" : "bg-muted text-muted-foreground",
    )}
  >
    {children}
  </span>
);

/** Tableau de données compact pour la gestion des réservations (admin). */
export const CompactReservationTable = <T extends Reservation>({
  filtered, pagination, selectedReservations, onSelectionChange, onSelectAll,
  onDeleteSelected, isDeletingMultiple, onEdit, onDelete, toolbar,
}: CompactReservationTableProps<T>) => {
  const rows = pagination.paginatedData;
  const filteredIds = (filtered ?? []).map((r) => r.id);
  const selectedInFilter = filteredIds.filter((id) => selectedReservations.includes(id)).length;
  const allSelected = filteredIds.length > 0 && selectedInFilter === filteredIds.length;
  const headerState: boolean | "indeterminate" = allSelected ? true : selectedInFilter > 0 ? "indeterminate" : false;
  const total = pagination.totalItems;

  return (
    <div className="overflow-hidden rounded-md border border-border/80 bg-card">
      {/* Bandeau : compteur ou actions groupées */}
      <div
        className={cn(
          "flex min-h-[40px] flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 text-[13px]",
          selectedInFilter > 0 ? "bg-peach-soft" : "bg-card",
        )}
      >
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          {selectedInFilter > 0 ? (
            <>
              <span className="font-semibold text-secondary-foreground">
                {selectedInFilter} sélectionnée{selectedInFilter > 1 ? "s" : ""} sur {total}
              </span>
              <Button
                variant="ghost"
                onClick={() => (allSelected ? onSelectAll() : filteredIds.forEach((id) => selectedReservations.includes(id) && onSelectionChange(id, false)))}
                className="h-7 rounded-[5px] px-2 text-xs"
              >
                <X className="!size-3.5" aria-hidden="true" />
                Désélectionner
              </Button>
              <Button
                variant="destructive"
                onClick={onDeleteSelected}
                disabled={isDeletingMultiple}
                className="h-7 rounded-[5px] px-2.5 text-xs"
              >
                <Trash2 className="!size-3.5" aria-hidden="true" />
                {isDeletingMultiple ? "Suppression…" : `Supprimer (${selectedInFilter})`}
              </Button>
            </>
          ) : (
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{total}</span> réservation{total > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {toolbar}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          <thead>
            <tr className="h-9 border-b border-border/70 bg-surface-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="w-10 pl-3 pr-1">
                <TableCheckbox
                  checked={headerState}
                  onCheckedChange={() => onSelectAll()}
                  label={allSelected ? "Désélectionner toutes les réservations filtrées" : "Sélectionner toutes les réservations filtrées"}
                />
              </th>
              <th scope="col" className="px-3 font-semibold">Enfant</th>
              <th scope="col" className="w-20 px-3 font-semibold">Classe</th>
              <th scope="col" className="w-36 px-3 font-semibold">Date</th>
              <th scope="col" className="px-3 font-semibold">Options</th>
              <th scope="col" className="w-24 px-3 text-right font-semibold">Actions</th>
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
                const name = `${r.children.last_name} ${r.children.first_name}`;
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "h-10 border-b border-border/50 transition-colors last:border-b-0",
                      selected ? "bg-peach-soft/70 shadow-[inset_2px_0_0_hsl(var(--primary))]" : "hover:bg-surface-muted/50",
                    )}
                  >
                    <td className="pl-3 pr-1">
                      <TableCheckbox checked={selected} onCheckedChange={(v) => onSelectionChange(r.id, v)} label={`Sélectionner ${name}`} />
                    </td>
                    <td className="max-w-[260px] truncate px-3 font-medium text-foreground">
                      <span className="uppercase">{r.children.last_name}</span> {r.children.first_name}
                    </td>
                    <td className="px-3">
                      <span className="inline-flex h-5 items-center rounded-[4px] border border-border px-1.5 text-[11px] font-semibold text-muted-foreground">
                        {r.children.school_class}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 tabular-nums text-foreground">
                      <span className="text-muted-foreground">{format(reservationDate(r), "EEE", { locale: fr })}</span>{" "}
                      {format(reservationDate(r), "dd/MM/yyyy")}
                    </td>
                    <td className="px-3">
                      <div className="flex flex-wrap gap-1">
                        {r.early_dropoff && <OptionTag tone="coral">Accueil avant 8h30</OptionTag>}
                        {r.without_meal && <OptionTag tone="neutral">Sans repas</OptionTag>}
                        {!r.early_dropoff && !r.without_meal && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-3">
                      <div className="flex justify-end gap-0.5">
                        <IconAction label={`Modifier la réservation de ${name}`} onClick={() => onEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconAction>
                        <IconAction label={`Supprimer la réservation de ${name}`} tone="danger" onClick={() => onDelete({ id: r.id, type })}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination compacte */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-3 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              {pagination.startIndex}–{pagination.endIndex} sur {total}
            </span>
            <span aria-hidden="true">·</span>
            <label htmlFor="rows-per-page">Lignes</label>
            <Select value={String(pagination.itemsPerPage)} onValueChange={(v) => pagination.setItemsPerPage(Number(v))}>
              <SelectTrigger id="rows-per-page" className="h-7 w-[68px] rounded-[5px] px-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {pagination.totalPages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <IconAction label="Page précédente" onClick={pagination.goToPreviousPage} disabled={pagination.currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </IconAction>
              <span className="px-1 tabular-nums text-foreground">
                Page {pagination.currentPage} / {pagination.totalPages}
              </span>
              <IconAction label="Page suivante" onClick={pagination.goToNextPage} disabled={pagination.currentPage >= pagination.totalPages}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </IconAction>
            </nav>
          )}
        </div>
      )}
    </div>
  );
};
