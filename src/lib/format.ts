export function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

export function timeAgo(date: string | Date | null | undefined) {
  if (!date) return "—";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "—";
  const now = new Date();
  const diff = now.getTime() - parsed.getTime(); // Fixed: now - date (not date - now)
  const diffInSeconds = Math.round(diff / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ranges: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let unit: Intl.RelativeTimeFormatUnit = "second";
  let value = diffInSeconds;
  for (let i = 0; i < ranges.length; i++) {
    if (Math.abs(value) < ranges[i][0]) {
      unit = ranges[i][1];
      break;
    }
    value /= ranges[i][0];
  }
  value = Math.round(value);
  return rtf.format(value, unit);
}
