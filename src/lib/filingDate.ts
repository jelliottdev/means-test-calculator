const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseIsoDateParts(isoDate: string): { year: number; monthIndex: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

export function getMeansTestLookbackMonths(filingDate: string): string[] {
  const parsed = parseIsoDateParts(filingDate);
  if (!parsed) return [];

  const months: string[] = [];

  for (let offset = 6; offset >= 1; offset -= 1) {
    const date = new Date(Date.UTC(parsed.year, parsed.monthIndex - offset, 1));
    months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  return months;
}

export function formatLookbackMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;

  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}
