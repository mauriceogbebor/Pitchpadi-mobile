/** "25,000", "₦25,000" or "25000.50" → kobo, or null when it is not a price. */
export function toKobo(value: string): number | null {
  const cleaned = value.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** Kobo → what goes in a price field: "25,000" or "25,000.50". */
export function nairaInput(minor: number): string {
  const naira = Math.floor(minor / 100);
  const kobo = minor % 100;
  return `${String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${kobo ? `.${String(kobo).padStart(2, "0")}` : ""}`;
}
