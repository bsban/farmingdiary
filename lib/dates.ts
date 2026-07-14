export function todayKST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function toISODate(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function addDays(utcMs: number, days: number): number {
  return utcMs + days * 86400000;
}

export function parseISODate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function shiftDate(dateStr: string, delta: number): string {
  return toISODate(addDays(parseISODate(dateStr), delta));
}

export function startOfWeek(dateStr: string): string {
  const t = parseISODate(dateStr);
  const dow = new Date(t).getUTCDay();
  return toISODate(addDays(t, -dow));
}

export function formatMD(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function startOfMonth(year: number, month: number): string {
  return toISODate(Date.UTC(year, month - 1, 1));
}

export function endOfMonth(year: number, month: number): string {
  return toISODate(Date.UTC(year, month, 0));
}
