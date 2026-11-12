/* Scenario clock and formatting. Every age, overdue and working-day figure is
   measured from SCENARIO_NOW, never from the browser clock. The browser clock
   only drives the Home greeting. */
import type { Cents, Iso } from "./types";

export const SCENARIO_NOW: Iso = "2026-11-12T09:00";
export const SCENARIO_DATE = "2026-11-12";
export const SCENARIO_LABEL = "Scenario: Thu 12 Nov 2026, 09:00";
export const WORK_START = "08:00";
export const WORK_END = "17:00";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Milliseconds for a scenario timestamp, treated as UTC so maths never shifts. */
export function ms(iso: Iso): number {
  const [d, t = "00:00"] = iso.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  return Date.UTC(y, m - 1, day, hh, mm);
}

export function isoFromMs(v: number): Iso {
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()) + "T" + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes());
}

export function dateOf(iso: Iso): string {
  return iso.slice(0, 10);
}

export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function hhmm(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

export function weekday(date: string): number {
  return new Date(ms(date + "T00:00")).getUTCDay();
}

export function addDays(date: string, n: number): string {
  return isoFromMs(ms(date + "T00:00") + n * 86400000).slice(0, 10);
}

export function isWorkingDay(date: string): boolean {
  const w = weekday(date);
  return w !== 0 && w !== 6;
}

/** Whole calendar days from `from` to `to` (date parts only). */
export function calendarDays(from: Iso, to: Iso = SCENARIO_NOW): number {
  return Math.round((ms(dateOf(to) + "T00:00") - ms(dateOf(from) + "T00:00")) / 86400000);
}

/** Working days elapsed after `from` up to and including `to` (Mon to Fri). */
export function workingDaysBetween(from: Iso, to: Iso = SCENARIO_NOW): number {
  let n = 0;
  let d = addDays(dateOf(from), 1);
  const end = dateOf(to);
  while (d <= end) {
    if (isWorkingDay(d)) n++;
    d = addDays(d, 1);
  }
  return n;
}

export function hoursUntil(iso: Iso, from: Iso = SCENARIO_NOW): number {
  return (ms(iso) - ms(from)) / 3600000;
}

export function fmtDate(iso: Iso | string): string {
  const d = new Date(ms(iso.length === 10 ? iso + "T00:00" : iso));
  return DAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
}

export function fmtShortDate(iso: Iso | string): string {
  const d = new Date(ms(iso.length === 10 ? iso + "T00:00" : iso));
  return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
}

export function fmtDateTime(iso: Iso): string {
  const time = iso.slice(11, 16);
  if (dateOf(iso) === SCENARIO_DATE) return "Today " + time;
  if (dateOf(iso) === addDays(SCENARIO_DATE, -1)) return "Yesterday " + time;
  if (dateOf(iso) === addDays(SCENARIO_DATE, 1)) return "Tomorrow " + time;
  return fmtShortDate(iso) + " " + time;
}

export function fmtDay(date: string): string {
  if (date === SCENARIO_DATE) return "Today";
  if (date === addDays(SCENARIO_DATE, 1)) return "Tomorrow";
  return fmtDate(date);
}

export function relAge(iso: Iso): string {
  const mins = Math.round((ms(SCENARIO_NOW) - ms(iso)) / 60000);
  if (mins < 0) {
    const ahead = -mins;
    if (ahead < 60) return "in " + ahead + " min";
    if (ahead < 1440) return "in " + Math.round(ahead / 60) + " h";
    return "in " + Math.round(ahead / 1440) + " d";
  }
  if (mins < 60) return mins + " min ago";
  if (mins < 1440) return Math.round(mins / 60) + " h ago";
  return calendarDays(iso) + " days ago";
}

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

export function money(c: Cents): string {
  return c % 100 === 0 ? eur.format(c / 100) : eur2.format(c / 100);
}

export function plural(n: number, one: string, many?: string): string {
  return n + " " + (n === 1 ? one : many || one + "s");
}

/** Deterministic PRNG used only for seeded sample rows. */
export function mulberry(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
