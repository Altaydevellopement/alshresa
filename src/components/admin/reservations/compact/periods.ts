export interface Period {
  id: string;
  name: string;
}

// Même tri que HolidayPeriodFilter : ETE-xx d'abord, dans l'ordre, puis alphabétique
export const sortPeriods = (periods: Period[]) =>
  [...periods].sort((a, b) => {
    const aMatch = a.name?.match(/^(ETE)-(\d+)$/);
    const bMatch = b.name?.match(/^(ETE)-(\d+)$/);
    if (aMatch && bMatch) return parseInt(aMatch[2]) - parseInt(bMatch[2]);
    if (aMatch) return -1;
    if (bMatch) return 1;
    return a.name.localeCompare(b.name);
  });
