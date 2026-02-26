/**
 * Compute UTC ISO range [start, end) for a YYYY-MM-DD date in a specific IANA timezone.
 * Uses Intl timeZoneName=shortOffset to parse the current offset (handles DST).
 */
function parseGmtOffset(offset: string): number {
  // Examples: "GMT-7", "GMT+05:30"
  const m = offset.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const hours = Number(m[2]);
  const mins = m[3] ? Number(m[3]) : 0;
  return sign * (hours * 60 + mins);
}

function getOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const tz = parts.find(p => p.type === "timeZoneName")?.value || "GMT+0";
  return parseGmtOffset(tz);
}

export function dayRangeUtcIso(day: string, timeZone = "America/Denver"): { startIso: string; endIso: string } {
  // Interpret day as midnight in the given timezone; compute the UTC instant for that local midnight.
  const [y, m, d] = day.split("-").map(Number);
  // create a UTC date at that calendar day 00:00, then adjust by the timezone offset at that instant.
  const approxUtcMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const offsetMin = getOffsetMinutes(approxUtcMidnight, timeZone);
  const start = new Date(approxUtcMidnight.getTime() - offsetMin * 60_000);

  const approxUtcNext = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const offsetNextMin = getOffsetMinutes(approxUtcNext, timeZone);
  const end = new Date(approxUtcNext.getTime() - offsetNextMin * 60_000);

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function todayInTz(timeZone = "America/Denver"): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const y = parts.find(p => p.type === "year")?.value || "1970";
  const mo = parts.find(p => p.type === "month")?.value || "01";
  const da = parts.find(p => p.type === "day")?.value || "01";
  return `${y}-${mo}-${da}`;
}
