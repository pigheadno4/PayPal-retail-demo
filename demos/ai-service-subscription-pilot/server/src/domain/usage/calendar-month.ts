export function addCalendarMonth(start: string, timeZone: string): string {
  const instant = new Date(start);
  if (!Number.isFinite(instant.getTime()) || timeZone !== "America/Los_Angeles") throw new Error("invalid_funding_time");
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const parts = (date: Date) => Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const local = parts(instant);
  const month = local.month === 12 ? 1 : local.month! + 1;
  const year = local.year! + (local.month === 12 ? 1 : 0);
  const day = Math.min(local.day!, new Date(Date.UTC(year, month, 0)).getUTCDate());
  const target = Date.UTC(year, month - 1, day, local.hour, local.minute, local.second);
  const stamp = (date: Date) => {
    const p = parts(date);
    return Date.UTC(p.year!, p.month! - 1, p.day!, p.hour, p.minute, p.second);
  };
  const candidates: number[] = [];
  let firstAfter: number | undefined;
  // The approved zone is minute-aligned. Resolve folds to the later instant;
  // gaps to the first valid wall-clock instant, not an invented shifted clock.
  for (let value = target - 12 * 3_600_000; value <= target + 12 * 3_600_000; value += 60_000) {
    const wall = stamp(new Date(value));
    if (wall === target) candidates.push(value);
    if (wall > target && (firstAfter === undefined || wall < stamp(new Date(firstAfter)))) firstAfter = value;
  }
  const result = candidates.at(-1) ?? firstAfter;
  if (result === undefined) throw new Error("invalid_funding_time");
  return new Date(candidates.length ? result + instant.getUTCMilliseconds() : Math.floor(result / 60_000) * 60_000).toISOString();
}
