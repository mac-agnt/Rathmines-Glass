/* Derived values. Components never hard-code a total: every count, amount and
   chart series comes from these functions over the one fixture store. */
import type {
  BrandFilter, Customer, EmergencyProposal, Invoice, Job, MeasurementRevision, OpsData, PersonId, Quote, Site,
  Skill, Stage, SupplierOrder, Visit, Zone, EntityRef
} from "./types";
import { PEOPLE, PERSON, quoteTotal, BRANDS, SUPPLIERS } from "./fixtures";
import {
  SCENARIO_DATE, SCENARIO_NOW, WORK_END, WORK_START, addDays, calendarDays, fmtDate, fmtDateTime, hhmm, hoursUntil,
  isWorkingDay, minutes, ms, money, workingDaysBetween, dateOf, fmtShortDate
} from "./time";

export const STAGES: { id: Stage; label: string; short: string }[] = [
  { id: "awaiting_measure", label: "Awaiting measure", short: "Measure" },
  { id: "awaiting_quote", label: "Awaiting quote", short: "Quote" },
  { id: "awaiting_deposit", label: "Awaiting deposit", short: "Deposit" },
  { id: "production", label: "Production", short: "Production" },
  { id: "ready_to_fit", label: "Ready to fit", short: "Fit" },
  { id: "completed", label: "Completed", short: "Done" }
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map(s => [s.id, s.label])) as Record<Stage, string>;
export const ACTIVE_STAGES: Stage[] = ["awaiting_measure", "awaiting_quote", "awaiting_deposit", "production", "ready_to_fit"];

export const byId = <T extends { id: string }>(list: T[], id?: string): T | undefined => (id ? list.find(x => x.id === id) : undefined);

export const getJob = (d: OpsData, id?: string) => byId(d.jobs, id);
export const getCustomer = (d: OpsData, id?: string) => byId(d.customers, id);
export const getSite = (d: OpsData, id?: string) => byId(d.sites, id);
export const customerOf = (d: OpsData, j: Job): Customer => getCustomer(d, j.customerId)!;
export const siteOf = (d: OpsData, j: Job): Site => getSite(d, j.siteId)!;
export const personName = (id?: string) => (id && (PERSON as Record<string, { name: string }>)[id]?.name) || id || "Unassigned";
export const supplierName = (id: string) => SUPPLIERS.find(s => s.id === id)?.name || id;

export function brandMatch(brand: BrandFilter, b: string) {
  return brand === "ALL" || brand === b;
}

export function jobLabel(d: OpsData, j: Job) {
  return j.id + " " + customerOf(d, j).name;
}

export function activeJobs(d: OpsData, brand: BrandFilter = "ALL"): Job[] {
  return d.jobs.filter(j => j.stage !== "completed" && brandMatch(brand, j.brand));
}

export function stageCounts(d: OpsData, brand: BrandFilter = "ALL") {
  const out = {} as Record<Stage, number>;
  STAGES.forEach(s => (out[s.id] = 0));
  d.jobs.filter(j => brandMatch(brand, j.brand)).forEach(j => out[j.stage]++);
  return out;
}

export function waitingRelease(d: OpsData, brand: BrandFilter = "ALL") {
  return d.jobs.filter(j => j.stage === "production" && j.prodState === "waiting_release" && brandMatch(brand, j.brand));
}

/* ── quotes, money ────────────────────────────────────────────────────── */

export function quoteOf(d: OpsData, jobId: string): Quote | undefined {
  return d.quotes.find(q => q.jobId === jobId);
}
export function invoiceOf(d: OpsData, jobId: string): Invoice | undefined {
  return d.invoices.find(i => i.jobId === jobId);
}

export const QUOTE_STATUS: Record<Quote["status"], string> = {
  measured_awaiting_price: "Measured, awaiting price",
  draft: "Draft",
  awaiting_approval: "Awaiting approval",
  sent: "Sent",
  accepted: "Accepted"
};

export function jobValue(d: OpsData, j: Job): { cents: number; label: string } {
  const q = quoteOf(d, j.id);
  if (q && q.status === "accepted") return { cents: quoteTotal(q), label: "Order value" };
  if (q && q.lines.length) return { cents: quoteTotal(q), label: q.status === "sent" ? "Quote sent" : q.status === "awaiting_approval" ? "Quote awaiting approval" : "Draft quote" };
  return { cents: j.indicativeCents || 0, label: "Indicative only" };
}

export function paymentsFor(d: OpsData, jobId: string) {
  return d.payments.filter(p => p.jobId === jobId && p.status === "allocated");
}

export function depositStatus(d: OpsData, j: Job) {
  const q = quoteOf(d, j.id);
  const total = q && q.status === "accepted" ? quoteTotal(q) : 0;
  const required = Math.round(total / 2);
  const allocated = paymentsFor(d, j.id).reduce((n, p) => n + p.amountCents, 0);
  const unmatched = d.payments.filter(p => p.status === "unmatched" && p.suggestedJobId === j.id);
  return {
    total, required, allocated, unmatched,
    pct: required ? Math.min(100, Math.round((allocated / total) * 100)) : 0,
    eligible: required > 0 && allocated >= required
  };
}

export function invoiceStatus(d: OpsData, inv: Invoice) {
  const paid = d.payments.filter(p => p.invoiceId === inv.id && p.status === "allocated").reduce((n, p) => n + p.amountCents, 0);
  const outstanding = Math.max(0, inv.totalCents - paid);
  const overdueDays = inv.due && outstanding > 0 && inv.due < SCENARIO_DATE ? calendarDays(inv.due + "T00:00") : 0;
  return { paid, outstanding, overdueDays, overdue: overdueDays > 0 ? outstanding : 0 };
}

export function ledgerTotals(d: OpsData, brand: BrandFilter = "ALL") {
  let invoiced = 0, paid = 0, outstanding = 0, overdue = 0;
  const rows = d.invoices.filter(inv => brandMatch(brand, getJob(d, inv.jobId)!.brand));
  rows.forEach(inv => {
    const s = invoiceStatus(d, inv);
    invoiced += inv.totalCents; paid += s.paid; outstanding += s.outstanding; overdue += s.overdue;
  });
  return { invoiced, paid, outstanding, overdue, count: rows.length };
}

export function preInvoiceDeposits(d: OpsData, brand: BrandFilter = "ALL") {
  return d.payments.filter(p => p.status === "allocated" && !p.invoiceId && p.jobId && brandMatch(brand, getJob(d, p.jobId)!.brand));
}

export function customerBalance(d: OpsData, customerId: string) {
  return d.invoices.filter(inv => getJob(d, inv.jobId)!.customerId === customerId)
    .reduce((n, inv) => n + invoiceStatus(d, inv).outstanding, 0);
}

/* ── measurement ─────────────────────────────────────────────────────── */

export function revisionsOf(d: OpsData, jobId: string): MeasurementRevision[] {
  return d.revisions.filter(r => r.jobId === jobId).sort((a, b) => b.rev - a.rev);
}
export function currentRevision(d: OpsData, jobId: string): MeasurementRevision | undefined {
  return revisionsOf(d, jobId).find(r => r.status !== "superseded");
}

/* ── production gates ───────────────────────────────────────────────── */

export interface Gate { key: string; label: string; ok: boolean; detail: string; owner: string }

export function releaseGates(d: OpsData, j: Job): Gate[] {
  const q = quoteOf(d, j.id);
  const dep = depositStatus(d, j);
  const rev = currentRevision(d, j.id);
  return [
    { key: "quote", label: "Quote accepted", ok: !!q && q.status === "accepted",
      detail: q ? (q.status === "accepted" ? "Accepted " + fmtShortDate(q.acceptedAt!) + ", " + money(quoteTotal(q)) : QUOTE_STATUS[q.status]) : "No quote", owner: "Office" },
    { key: "deposit", label: "50% deposit allocated", ok: dep.eligible,
      detail: dep.required ? money(dep.allocated) + " of " + money(dep.required) + " required"
        + (dep.unmatched.length ? "; " + money(dep.unmatched[0].amountCents) + " unmatched in review" : "") : "Needs accepted quote", owner: "Office" },
    { key: "spec", label: "Current measurement approved", ok: !!rev && rev.status === "approved" && !rev.specialistReview && !j.qualityHold,
      detail: rev ? "Rev " + rev.rev + " " + (rev.status === "approved" ? "approved by " + personName(rev.reviewerId) : rev.status === "submitted" ? "awaiting independent check" : rev.status) : "Not measured", owner: rev?.reviewerId ? personName(rev.reviewerId) : "Field" }
  ];
}

export function supplierGates(so: SupplierOrder): Gate[] {
  return [
    { key: "ack", label: "Supplier acknowledged", ok: so.acknowledged, detail: so.acknowledged ? "Ref " + so.supplierRef : "No acknowledgement since " + fmtDateTime(so.orderedAt), owner: "Mark Doyle" },
    { key: "recv", label: "Received at Robinhood", ok: so.received, detail: so.received ? fmtDateTime(so.receivedAt!) : "Expected " + fmtDate(so.expected), owner: "Mark Doyle" },
    { key: "qc", label: "Quality checked", ok: so.qc, detail: so.qc ? fmtDateTime(so.qcAt!) : "After receipt", owner: "Mark Doyle" }
  ];
}

export function ackOverdueHours(so: SupplierOrder) {
  return so.acknowledged ? 0 : Math.round(-hoursUntil(so.orderedAt));
}

/* ── health ─────────────────────────────────────────────────────────── */

export type Tone = "bad" | "warn" | "ok" | "neutral" | "accent";
export interface Health { tone: Tone; label: string; reason: string }

export function jobHealth(d: OpsData, j: Job): Health {
  if (j.stage === "completed") {
    const inv = invoiceOf(d, j.id);
    if (inv) {
      const s = invoiceStatus(d, inv);
      if (s.overdueDays > 0) return { tone: "bad", label: "Overdue", reason: "Balance " + money(s.outstanding) + " overdue " + s.overdueDays + " days" };
      if (s.outstanding > 0) return { tone: "warn", label: "Balance due", reason: money(s.outstanding) + " outstanding" };
    }
    return { tone: "ok", label: "Completed", reason: "Fitted " + (j.fittedAt ? fmtShortDate(j.fittedAt) : "") };
  }
  const missed = j.promises.find(p => !p.resolved && ms(p.due) < ms(SCENARIO_NOW));
  if (missed) return { tone: "bad", label: "Overdue", reason: "Missed commitment: " + missed.text };
  if (j.stage === "production" && j.prodState === "waiting_release") {
    const dep = depositStatus(d, j);
    const paidAt = paymentsFor(d, j.id).map(p => p.at).sort()[0];
    const gates = releaseGates(d, j);
    if (dep.eligible && paidAt && gates.every(g => g.ok)) {
      const wd = workingDaysBetween(paidAt);
      if (wd >= 3) return { tone: "bad", label: "Blocked", reason: "Paid " + wd + " working days ago, not released to workshop" };
    }
    const failing = gates.find(g => !g.ok);
    if (failing) return { tone: "warn", label: "Blocked", reason: failing.label + ": " + failing.detail };
  }
  if (ms(j.nextDue) < ms(SCENARIO_NOW)) return { tone: "bad", label: "Overdue", reason: "Next action overdue since " + fmtDateTime(j.nextDue) };
  const so = d.supplierOrders.find(s => s.jobId === j.id && !s.acknowledged);
  if (so && ackOverdueHours(so) >= 24) return { tone: "warn", label: "At risk", reason: "Supplier has not acknowledged " + so.id + " (" + ackOverdueHours(so) + " h)" };
  if (j.qualityHold) return { tone: "warn", label: "On hold", reason: j.qualityHold };
  const ep = d.proposals.find(p => p.jobId === j.id && p.status === "pending");
  if (ep) return { tone: "warn", label: "Awaiting approval", reason: "Emergency dispatch proposal waiting for office approval" };
  if (j.stage === "production" && j.fulfilment === "supplier") {
    const s2 = d.supplierOrders.find(s => s.jobId === j.id);
    if (s2 && !s2.received) return { tone: "warn", label: "Dependency", reason: "Waiting for supplier delivery, expected " + fmtDate(s2.expected) };
  }
  if (hoursUntil(j.nextDue) <= 4) return { tone: "warn", label: "Due soon", reason: "Next action due " + fmtDateTime(j.nextDue) };
  return { tone: "ok", label: "On track", reason: "Next action " + fmtDateTime(j.nextDue) };
}

/** Calendar days in the current stage: measure from enquiry, quote from
    measurement, deposit and release from acceptance, production from release. */
export function stageAgeDays(j: Job, d?: OpsData): number {
  const accepted = d ? quoteOf(d, j.id)?.acceptedAt : undefined;
  const from = j.stage === "awaiting_measure" ? j.enquiryAt : j.stage === "awaiting_quote" ? (j.measuredAt || j.enquiryAt)
    : j.stage === "awaiting_deposit" ? (accepted || j.enquiryAt)
    : j.stage === "ready_to_fit" ? (j.qcAt || j.enquiryAt)
    : j.stage === "production" ? (j.releasedAt || accepted || j.enquiryAt) : (j.fittedAt || j.enquiryAt);
  return calendarDays(from);
}

/* ── schedule ───────────────────────────────────────────────────────── */

const TRAVEL: Record<string, number> = {
  "DEPOT-D6": 25, "DEPOT-D8": 20, "DEPOT-D12": 15, "DEPOT-D14": 30, "DEPOT-D24": 20, "DEPOT-D4": 35,
  "D6-D6": 10, "D6-D8": 15, "D6-D12": 20, "D6-D14": 20, "D6-D24": 25, "D6-D4": 20,
  "D8-D8": 10, "D8-D12": 20, "D8-D14": 25, "D8-D24": 25, "D8-D4": 25,
  "D12-D12": 10, "D12-D14": 25, "D12-D24": 15, "D12-D4": 30,
  "D14-D14": 10, "D14-D24": 25, "D14-D4": 25,
  "D24-D24": 10, "D24-D4": 35, "D4-D4": 10
};
export function travelMins(a: Zone | "DEPOT", b: Zone | "DEPOT"): number {
  return TRAVEL[a + "-" + b] ?? TRAVEL[b + "-" + a] ?? 30;
}
export const ZONE_NAME: Record<Zone | "DEPOT", string> = {
  DEPOT: "Robinhood workshop", D6: "Dublin 6 area", D8: "Dublin 8 area", D12: "Dublin 12 area", D14: "Dublin 14/16 area", D24: "Dublin 24 area", D4: "Dublin 4 / Blackrock"
};

export function visitZone(d: OpsData, v: { jobId: string }): Zone {
  return siteOf(d, getJob(d, v.jobId)!).zone;
}

export const FIELD_CREW: PersonId[] = ["phil", "sean", "aoife", "niamh"];

export interface SlotCheck { ok: boolean; issues: string[]; notes: string[] }

/** Validate a visit for every crew member against booked visits, travel and hours. */
export function validateVisit(d: OpsData, v: { jobId: string; date: string; start: string; end: string; crew: PersonId[] },
  opts: { exclude?: string[]; extra?: Visit[]; replace?: Record<string, Partial<Visit>> } = {}): SlotCheck {
  const issues: string[] = [], notes: string[] = [];
  const zone = visitZone(d, v);
  const s = minutes(v.start), e = minutes(v.end);
  if (!isWorkingDay(v.date)) issues.push(fmtDate(v.date) + " is not a working day");
  if (v.date < SCENARIO_DATE || (v.date === SCENARIO_DATE && s < minutes(SCENARIO_NOW.slice(11)))) issues.push("Start is in the past for the scenario clock");
  if (e <= s) issues.push("End must be after start");
  if (e > minutes(WORK_END)) issues.push("Ends after " + WORK_END + " (working hours)");
  if (!v.crew.length) issues.push("No crew selected");
  const dayStart = minutes(WORK_START) + travelMins("DEPOT", zone);
  if (s < dayStart) issues.push("Starts before " + hhmm(dayStart) + " (08:00 plus " + travelMins("DEPOT", zone) + " min from Robinhood)");
  const all = d.visits.map(x => (opts.replace && opts.replace[x.id] ? { ...x, ...opts.replace[x.id] } as Visit : x)).concat(opts.extra || []);
  v.crew.forEach(pid => {
    all.filter(x => x.status === "booked" && x.date === v.date && x.crew.includes(pid) && !(opts.exclude || []).includes(x.id)).forEach(x => {
      const xs = minutes(x.start), xe = minutes(x.end), xz = visitZone(d, x);
      const before = xe + travelMins(xz, zone) <= s;
      const after = e + travelMins(zone, xz) <= xs;
      if (!before && !after) {
        issues.push(personName(pid) + " is booked " + x.start + " to " + x.end + " on " + x.jobId + " (needs " + travelMins(xz, zone) + " min travel)");
      } else if (before && xe <= s) {
        notes.push(personName(pid) + ": " + travelMins(xz, zone) + " min travel from " + x.jobId + " (ends " + x.end + ")");
      } else if (after) {
        notes.push(personName(pid) + ": " + travelMins(zone, xz) + " min travel on to " + x.jobId + " (starts " + x.start + ")");
      }
    });
  });
  return { ok: issues.length === 0, issues: Array.from(new Set(issues)), notes: Array.from(new Set(notes)) };
}

function crewOptions(j: Job, crewSize: number, skills: Skill[]): PersonId[][] {
  const field = PEOPLE.filter(p => FIELD_CREW.includes(p.id));
  const has = (ids: PersonId[]) => skills.every(sk => ids.some(id => PERSON[id].skills.includes(sk)));
  if (crewSize <= 1) return field.filter(p => has([p.id])).map(p => [p.id]);
  const pairs: PersonId[][] = [];
  const glaziers = field.filter(p => p.skills.includes("glazing") || p.skills.includes("mirror"));
  for (let a = 0; a < glaziers.length; a++) for (let b = a + 1; b < glaziers.length; b++) {
    const pair = [glaziers[a].id, glaziers[b].id];
    if (has(pair)) pairs.push(pair);
  }
  return pairs;
}

export interface Slot { date: string; start: string; end: string; crew: PersonId[]; notes: string[] }

/** Next valid slots from working hours, booked visits, skills, crew size and travel. */
export function findSlots(d: OpsData, jobId: string, count = 4, horizonDays = 8): Slot[] {
  const j = getJob(d, jobId)!;
  const mins = j.visitMins || 60;
  const skills = j.stage === "awaiting_measure" && !j.emergency ? (j.skills.length ? j.skills : ["survey"] as Skill[]) : j.skills;
  const crews = crewOptions(j, j.crewSize, skills);
  const out: Slot[] = [];
  let date = SCENARIO_DATE;
  for (let i = 0; i < horizonDays + 4 && out.length < count; i++, date = addDays(date, 1)) {
    if (!isWorkingDay(date)) continue;
    const seen = new Set<string>();
    for (let s = minutes(WORK_START); s + mins <= minutes(WORK_END) && out.length < count; s += 30) {
      for (const crew of crews) {
        const v = { jobId, date, start: hhmm(s), end: hhmm(s + mins), crew };
        const chk = validateVisit(d, v);
        const key = date + crew.join();
        if (chk.ok && !seen.has(key)) {
          out.push({ date, start: v.start, end: v.end, crew, notes: chk.notes });
          seen.add(key);
          break;
        }
      }
    }
  }
  return out;
}

export function emergencyPreview(d: OpsData, p: EmergencyProposal) {
  const replace: Record<string, Partial<Visit>> = {};
  p.displaced.forEach(x => (replace[x.visitId] = { date: x.toDate, start: x.toStart, end: x.toEnd }));
  const emergency: Visit = { id: "EV-PREVIEW", jobId: p.jobId, kind: "emergency", date: p.date, start: p.start, end: p.end, crew: p.crew, status: "booked" };
  const crewCheck = validateVisit(d, emergency, { replace });
  const checks: { label: string; ok: boolean; detail: string }[] = [
    { label: p.crew.map(personName).join(" and ") + " free " + p.start + " to " + p.end, ok: crewCheck.ok,
      detail: crewCheck.ok ? "Once the displaced visit moves" : crewCheck.issues.join("; ") }
  ];
  p.displaced.forEach(x => {
    const v = d.visits.find(y => y.id === x.visitId)!;
    const moved = { ...v, date: x.toDate, start: x.toStart, end: x.toEnd };
    const chk = validateVisit(d, moved, { exclude: [v.id], extra: [emergency], replace });
    const travel = travelMins(visitZone(d, emergency), visitZone(d, v));
    checks.push({ label: v.jobId + " moves " + v.start + " to " + x.toStart + " (" + fmtDate(x.toDate) + ")", ok: chk.ok,
      detail: chk.ok ? "Travel " + travel + " min from the emergency; ends " + x.toEnd + ", inside " + WORK_END : chk.issues.join("; ") });
    checks.push({ label: "No double booking for " + v.crew.map(personName).join(" or "), ok: chk.ok && crewCheck.ok, detail: chk.ok && crewCheck.ok ? "Checked against every booked visit that day" : "Conflict found" });
  });
  const draft = d.drafts.find(x => x.id === p.draftId);
  checks.push({ label: "Customer message drafted (not sent)", ok: !!draft, detail: draft ? draft.channel + " to " + customerOf(d, getJob(d, draft.jobId)!).name : "Missing" });
  return { ok: checks.every(c => c.ok), checks };
}

/* ── refs ───────────────────────────────────────────────────────────── */

export function refLabel(d: OpsData, r: EntityRef): string {
  switch (r.type) {
    case "job": { const j = getJob(d, r.id); return j ? jobLabel(d, j) : r.id; }
    case "customer": return getCustomer(d, r.id)?.name || r.id;
    case "quote": { const q = byId(d.quotes, r.id); return q ? q.id + " " + customerOf(d, getJob(d, q.jobId)!).name : r.id; }
    case "invoice": { const i = byId(d.invoices, r.id); return i ? i.id + " " + customerOf(d, getJob(d, i.jobId)!).name : r.id; }
    case "supplier": return supplierName(r.id);
    case "person": return personName(r.id);
    case "payment": { const p = byId(d.payments, r.id); return p ? p.externalRef + " " + money(p.amountCents) : r.id; }
    case "supplierOrder": { const s = byId(d.supplierOrders, r.id); return s ? s.id + " " + supplierName(s.supplierId) : r.id; }
    default: return r.id;
  }
}

/** The job a reference ultimately belongs to, for opening the canonical record. */
export function refJob(d: OpsData, r: EntityRef): string | undefined {
  if (r.type === "job") return r.id;
  if (r.type === "quote") return byId(d.quotes, r.id)?.jobId;
  if (r.type === "invoice") return byId(d.invoices, r.id)?.jobId;
  if (r.type === "payment") { const p = byId(d.payments, r.id); return p?.jobId || p?.suggestedJobId; }
  if (r.type === "supplierOrder") return byId(d.supplierOrders, r.id)?.jobId;
  if (r.type === "draft") return byId(d.drafts, r.id)?.jobId;
  if (r.type === "visit") return byId(d.visits, r.id)?.jobId;
  return undefined;
}

export function brandName(b: string) {
  return (BRANDS as Record<string, { name: string }>)[b]?.name || b;
}

export function openTasksFor(d: OpsData, jobId: string) {
  return d.tasks.filter(t => t.status === "open" && (t.ref.id === jobId || refJob(d, t.ref) === jobId));
}

export function pendingApprovals(d: OpsData) {
  return d.approvals.filter(a => a.status === "pending");
}

export function jobTimeline(d: OpsData, jobId: string) {
  const items: { at: string; text: string; who: string }[] = [];
  const j = getJob(d, jobId)!;
  items.push({ at: j.enquiryAt, text: "Enquiry received (" + brandName(j.brand) + ")", who: "Office" });
  revisionsOf(d, jobId).forEach(r => {
    items.push({ at: r.measuredAt, text: "Measurement rev " + r.rev + " submitted", who: personName(r.measuredBy) });
    if (r.reviewedAt) items.push({ at: r.reviewedAt, text: "Rev " + r.rev + " " + (r.status === "rejected" ? "rejected" : "approved"), who: personName(r.reviewerId) });
  });
  const q = quoteOf(d, jobId);
  if (q?.sentAt) items.push({ at: q.sentAt, text: "Quote " + q.id + " sent (" + money(quoteTotal(q)) + ")", who: personName(q.approvedBy) });
  if (q?.acceptedAt) items.push({ at: q.acceptedAt, text: "Quote accepted", who: "Customer" });
  paymentsFor(d, jobId).forEach(p => items.push({ at: p.at, text: money(p.amountCents) + " " + p.kind + " allocated (" + p.source + " " + p.externalRef + ")", who: "Finance" }));
  if (j.releasedAt) items.push({ at: j.releasedAt, text: "Released to " + (j.fulfilment === "supplier" ? "supplier order" : "workshop"), who: "Office" });
  if (j.qcAt) items.push({ at: j.qcAt, text: "Quality check complete" + (j.rackLocation ? " (" + j.rackLocation + ")" : ""), who: "Workshop" });
  if (j.fittedAt) items.push({ at: j.fittedAt, text: "Fitted and completed", who: "Field" });
  d.activity.filter(e => e.ref && (e.ref.id === jobId || refJob(d, e.ref) === jobId)).forEach(e => items.push({ at: e.at, text: e.action, who: e.actor }));
  const seen = new Set<string>();
  return items.filter(i => { const k = i.at + i.text; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function dayVisits(d: OpsData, date: string, brand: BrandFilter = "ALL") {
  return d.visits.filter(v => v.date === date && v.status !== "cancelled" && brandMatch(brand, getJob(d, v.jobId)!.brand))
    .sort((a, b) => (a.start < b.start ? -1 : 1));
}

export function weekDates(from = SCENARIO_DATE, n = 5): string[] {
  const out: string[] = [];
  let dt = from;
  while (out.length < n) { if (isWorkingDay(dt)) out.push(dt); dt = addDays(dt, 1); }
  return out;
}

export { dateOf };
