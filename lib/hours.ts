import { format } from "date-fns";
import type { TimeEntry } from "./types";

export interface DaySummary {
  date: string; // YYYY-MM-DD
  hoursWorked: number;
  shifts: { start: number; end: number }[];
}

/**
 * Pairs consecutive in/out entries into shifts, grouped by the day the shift started.
 * A trailing unmatched "in" (still clocked in) is not counted in the totals.
 */
export function summarizeByDay(entries: TimeEntry[]): DaySummary[] {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const days = new Map<string, DaySummary>();

  let pendingIn: TimeEntry | null = null;
  for (const entry of sorted) {
    if (entry.type === "in") {
      pendingIn = entry;
      continue;
    }
    if (entry.type === "out" && pendingIn) {
      const dateKey = format(pendingIn.timestamp, "yyyy-MM-dd");
      const hours = (entry.timestamp - pendingIn.timestamp) / (1000 * 60 * 60);
      const day = days.get(dateKey) ?? { date: dateKey, hoursWorked: 0, shifts: [] };
      day.hoursWorked += hours;
      day.shifts.push({ start: pendingIn.timestamp, end: entry.timestamp });
      days.set(dateKey, day);
      pendingIn = null;
    }
  }

  return [...days.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function totalHours(days: DaySummary[]): number {
  return days.reduce((sum, day) => sum + day.hoursWorked, 0);
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function currentStatus(entries: TimeEntry[]): "in" | "out" {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  return sorted.length > 0 ? sorted[sorted.length - 1].type : "out";
}
