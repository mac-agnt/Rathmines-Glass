/* The single operating store for the Rathmines Glass demo. Every module reads
   this one copy of the records, and every local action writes back here and
   appends to Activity. Nothing leaves the browser: no email, payment or API call
   is ever made. Demo changes persist in localStorage until Reset demo. */
import { useSyncExternalStore } from "react";
import type {
  Approval, BrandFilter, Draft, EntityRef, Interaction, Job, MeasurementRevision, OpsData, Opening, Payment, PersonId,
  Priority, QuoteLine, Task, TeamName, Visit, WorkshopTask, Zone, ActivityEvent, AgentRun, BrandId
} from "./types";
import { DATA_VERSION, PERSON, quoteTotal, seed, AGENTS } from "./fixtures";
import {
  SCENARIO_NOW, SCENARIO_DATE, addDays, fmtDate, fmtDateTime, isWorkingDay, isoFromMs, money, ms, workingDaysBetween, calendarDays
} from "./time";
import {
  byId, currentRevision, customerOf, depositStatus, emergencyPreview, getJob, invoiceOf, invoiceStatus, jobLabel, personName,
  quoteOf, releaseGates, validateVisit, waitingRelease, stageCounts, ledgerTotals, ackOverdueHours, pendingApprovals, siteOf
} from "./selectors";

export type ViewAs = PersonId;
export interface Toast { id: number; text: string; tone: "ok" | "warn" | "bad" | "neutral"; undo?: boolean }
export interface UiState {
  drawer: EntityRef | null;
  toasts: Toast[];
  brand: BrandFilter;
  viewAs: ViewAs;
  density: "comfortable" | "compact";
  availabilityJob: string;
  undo: { label: string; data: OpsData } | null;
  modal: { kind: string; id?: string } | null;
}
export interface OpsState { data: OpsData; ui: UiState }

const KEY = "rg-pulse-demo";

function load(): OpsState {
  const fresh: OpsState = {
    data: seed(),
    ui: { drawer: null, toasts: [], brand: "ALL", viewAs: "danielle", density: "comfortable", availabilityJob: "RG-2601", undo: null, modal: null }
  };
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) return fresh;
    const saved = JSON.parse(raw);
    if (!saved || !saved.data || saved.data.version !== DATA_VERSION) return fresh;
    return { data: saved.data, ui: { ...fresh.ui, brand: saved.brand || "ALL", viewAs: saved.viewAs || "danielle", density: saved.density || "comfortable" } };
  } catch {
    return fresh;
  }
}

let state: OpsState = load();
const listeners = new Set<() => void>();
let toastSeq = 1;

function emit() {
  listeners.forEach(l => l());
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ data: state.data, brand: state.ui.brand, viewAs: state.ui.viewAs, density: state.ui.density }));
  } catch { /* storage blocked: the demo still works for this session */ }
}

export function getState() { return state; }
export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function useOps(): OpsState { return useSyncExternalStore(subscribe, getState, getState); }

function setUi(patch: Partial<UiState>) {
  state = { ...state, ui: { ...state.ui, ...patch } };
  if ("brand" in patch || "viewAs" in patch || "density" in patch) persist();
  emit();
}

/* ── navigation bridge (PulseLogic registers the real router) ─────────── */
type Nav = { go: (page: string, tab?: string) => void; setTheme: (id: string) => void; theme: () => string };
let nav: Nav = { go: () => {}, setTheme: () => {}, theme: () => "rathmines" };
export function registerNav(n: Nav) { nav = n; }
export function go(page: string, tab?: string) { nav.go(page, tab); }
export function setTheme(id: string) { nav.setTheme(id); }
export function currentTheme() { return nav.theme(); }

/* ── internal helpers ─────────────────────────────────────────────────── */

const clone = (d: OpsData): OpsData => JSON.parse(JSON.stringify(d));

/** Each local action happens one scenario minute after the last, so Activity stays ordered. */
function tick(d: OpsData): string {
  d.clock += 1;
  return isoFromMs(ms(SCENARIO_NOW) + d.clock * 60000);
}
function nextId(d: OpsData, prefix: string) {
  d.seq += 1;
  return prefix + "-" + d.seq;
}
function actorName(): string {
  return personName(state.ui.viewAs);
}
function log(d: OpsData, action: string, ref?: EntityRef, opts: { actor?: string; kind?: ActivityEvent["actorKind"]; source?: string } = {}) {
  const at = tick(d);
  let refLabel: string | undefined;
  if (ref?.type === "job") { const j = d.jobs.find(x => x.id === ref.id); if (j) refLabel = j.id + " " + d.customers.find(c => c.id === j.customerId)!.name; }
  d.activity.push({ id: nextId(d, "EV"), at, actorKind: opts.kind || "person", actor: opts.actor || actorName(), action, ref, refLabel, source: opts.source || "Pulse" });
  return at;
}
function commit(next: OpsData, toast?: { text: string; tone?: Toast["tone"] }, undoLabel?: string, prev?: OpsData) {
  state = { ...state, data: next, ui: { ...state.ui, undo: undoLabel && prev ? { label: undoLabel, data: prev } : state.ui.undo } };
  persist();
  if (toast) pushToast(toast.text, toast.tone || "ok", !!undoLabel);
  emit();
}
function fail(text: string): false {
  pushToast(text, "bad");
  return false;
}
function mutate(fn: (d: OpsData) => string | false | void, opts: { undo?: string } = {}): boolean {
  const prev = state.data;
  const d = clone(prev);
  const res = fn(d);
  if (res === false) return false;
  commit(d, typeof res === "string" ? { text: res } : undefined, opts.undo, prev);
  return true;
}

export function pushToast(text: string, tone: Toast["tone"] = "ok", undo = false) {
  const id = toastSeq++;
  state = { ...state, ui: { ...state.ui, toasts: state.ui.toasts.concat([{ id, text, tone, undo }]).slice(-3) } };
  emit();
  setTimeout(() => {
    state = { ...state, ui: { ...state.ui, toasts: state.ui.toasts.filter(t => t.id !== id) } };
    emit();
  }, undo ? 7000 : 4200);
}

function closeTasks(d: OpsData, match: (t: Task) => boolean, at: string) {
  d.tasks.forEach(t => { if (t.status === "open" && match(t)) { t.status = "done"; t.doneAt = at; } });
}
function setNext(j: Job, text: string, owner: PersonId, due: string) {
  j.nextAction = text; j.nextOwnerId = owner; j.nextDue = due;
}
function resolveApproval(d: OpsData, match: (a: Approval) => boolean, status: "approved" | "rejected", at: string, outcome?: string) {
  d.approvals.forEach(a => {
    if (a.status === "pending" && match(a)) { a.status = status; a.decidedAt = at; a.decidedBy = state.ui.viewAs; a.outcome = outcome; }
  });
}
function nextWorkingDay(date: string, n = 1) {
  let dt = date, k = 0;
  while (k < n) { dt = addDays(dt, 1); if (isWorkingDay(dt)) k++; }
  return dt;
}

/* ── public actions ───────────────────────────────────────────────────── */

export const ops = {
  /* ui */
  setBrand(brand: BrandFilter) { setUi({ brand }); },
  setViewAs(viewAs: ViewAs) { setUi({ viewAs }); pushToast("Previewing as " + personName(viewAs) + ". Frontend preview only, not access control.", "neutral"); },
  setDensity(density: UiState["density"]) { setUi({ density }); },
  open(ref: EntityRef) { setUi({ drawer: ref }); },
  close() { setUi({ drawer: null }); },
  openModal(kind: string, id?: string) { setUi({ modal: { kind, id } }); },
  closeModal() { setUi({ modal: null }); },
  setAvailabilityJob(id: string) { setUi({ availabilityJob: id }); },
  dismissToast(id: number) { setUi({ toasts: state.ui.toasts.filter(t => t.id !== id) }); },
  undo() {
    const u = state.ui.undo;
    if (!u) return;
    state = { ...state, data: u.data, ui: { ...state.ui, undo: null, toasts: [] } };
    persist(); emit();
    pushToast("Undone: " + u.label, "neutral");
  },
  reset() {
    state = { data: seed(), ui: { ...state.ui, drawer: null, undo: null, toasts: [], modal: null, availabilityJob: "RG-2601" } };
    persist(); emit();
    pushToast("Demo reset to the 12 Nov 2026, 09:00 scenario.", "neutral");
  },

  /* enquiries */
  completeCallback(id: string, outcome: string) {
    return mutate(d => {
      const cb = byId(d.callbacks, id);
      if (!cb) return false;
      if (cb.status === "done") return fail("Callback already completed.");
      const at = log(d, "Completed callback to " + cb.customerName + (outcome ? ": " + outcome : ""), cb.jobId ? { type: "job", id: cb.jobId } : undefined);
      cb.status = "done"; cb.doneAt = at; cb.outcome = outcome || "Spoke to customer.";
      cb.lastContact = at;
      const j = cb.jobId ? getJob(d, cb.jobId) : undefined;
      if (j && /call/i.test(j.nextAction)) {
        const kind = j.stage === "awaiting_measure" ? (j.skills.includes("stained") ? "studio survey" : "measuring visit") : "next step";
        setNext(j, "Book " + kind + " agreed on the callback", j.ownerId, SCENARIO_DATE + "T17:00");
      }
      closeTasks(d, t => !!cb.jobId && t.ref.id === cb.jobId && /callback/i.test(t.title), at);
      return "Callback to " + cb.customerName + " completed.";
    }, { undo: "callback completion" });
  },

  logCall(f: { from: string; phone: string; brand: BrandId; channel: "Phone" | "Email" | "Manual"; summary: string; smashedOrMissing: boolean; securityRisk: boolean }) {
    if (!f.from.trim() || !f.summary.trim()) return fail("Caller and summary are required.");
    return mutate(d => {
      const id = nextId(d, "IN");
      const digits = f.phone.replace(/\D/g, "");
      const match = digits.length >= 7 ? d.customers.find(c => c.phone.replace(/\D/g, "") === digits)
        : d.customers.find(c => c.name.toLowerCase() === f.from.trim().toLowerCase());
      const job = match ? d.jobs.find(j => j.customerId === match.id && j.stage !== "completed") : undefined;
      const emergency = f.smashedOrMissing && f.securityRisk;
      const at = tick(d);
      const it: Interaction = {
        id, at, channel: f.channel, brand: f.brand, from: f.from.trim(), summary: f.summary.trim(), urgency: emergency ? "emergency" : "normal",
        ownerId: "office", status: "draft_enquiry", emergencyChecks: { smashedOrMissing: f.smashedOrMissing, securityRisk: f.securityRisk },
        dedupeJobId: job?.id, dedupeReason: job ? "Matches " + (digits.length >= 7 ? "phone number" : "name") + " on " + job.id : undefined
      };
      d.interactions.push(it);
      log(d, "Logged " + f.channel.toLowerCase() + " contact from " + it.from + " as a draft enquiry" + (emergency ? " (emergency criteria met)" : ""), undefined, { source: "Manual call log" });
      return "Draft enquiry " + id + " created. No telephony connection is used.";
    });
  },

  linkInteraction(id: string, jobId: string) {
    return mutate(d => {
      const it = byId(d.interactions, id);
      const j = getJob(d, jobId);
      if (!it || !j) return false;
      it.status = "linked"; it.jobId = jobId; it.customerId = j.customerId;
      log(d, "Linked " + it.channel.toLowerCase() + " from " + it.from + " to " + jobId, { type: "job", id: jobId });
      return it.id + " linked to " + jobId + ".";
    }, { undo: "link" });
  },

  mergeInteraction(id: string) {
    return mutate(d => {
      const it = byId(d.interactions, id);
      if (!it || !it.dedupeJobId) return false;
      if (it.status === "merged") return fail("Already merged.");
      const at = log(d, "Merged duplicate contact " + it.id + " into " + it.dedupeJobId, { type: "job", id: it.dedupeJobId });
      it.status = "merged"; it.jobId = it.dedupeJobId; it.customerId = getJob(d, it.dedupeJobId)!.customerId;
      resolveApproval(d, a => a.kind === "enquiry_merge" && a.jobId === it.dedupeJobId, "approved", at);
      return it.id + " merged into " + it.dedupeJobId + ".";
    }, { undo: "merge" });
  },

  convertInteraction(id: string, f: { name: string; locality: string; zone: Zone; service: string; title: string }) {
    if (!f.name.trim() || !f.locality.trim() || !f.title.trim()) return fail("Name, locality and description are required.");
    let created = "";
    const ok = mutate(d => {
      const it = byId(d.interactions, id);
      if (!it) return false;
      const n = Math.max(...d.jobs.map(j => Number(j.id.slice(3)))) + 1;
      const jid = "RG-" + n;
      const cid = nextId(d, "C"), sid = nextId(d, "S");
      const emergency = it.urgency === "emergency";
      d.customers.push({ id: cid, name: f.name.trim(), kind: "Homeowner", contact: f.name.trim(), phone: "Not captured", email: "Not captured", siteIds: [sid] });
      d.sites.push({ id: sid, customerId: cid, address: f.locality.trim(), locality: f.locality.trim(), zone: f.zone, access: "Not yet recorded" });
      const at = tick(d);
      d.jobs.push({
        id: jid, brand: it.brand, customerId: cid, siteId: sid, service: f.service, title: f.title.trim(), stage: "awaiting_measure",
        emergency, ownerId: "office", enquiryAt: it.at, fulfilment: "in_house",
        nextAction: emergency ? "Confirm emergency priority and dispatch" : "Book measuring visit", nextOwnerId: "office",
        nextDue: emergency ? at : nextWorkingDay(SCENARIO_DATE) + "T12:00", visitMins: emergency ? 120 : 90, crewSize: emergency ? 2 : 1,
        skills: emergency ? ["shopfront"] : f.service === "Mirrors" ? ["survey"] : ["survey"], equipment: ["Laser measure"], promises: []
      });
      it.status = "converted"; it.jobId = jid; it.customerId = cid;
      log(d, "Created enquiry " + jid + " from " + it.id, { type: "job", id: jid });
      created = jid;
      return "Enquiry " + jid + " created and added to Awaiting measure.";
    }, { undo: "new enquiry" });
    return ok ? created : "";
  },

  /* schedule */
  bookVisit(jobId: string, v: { date: string; start: string; end: string; crew: PersonId[] }, kind: Visit["kind"]) {
    return mutate(d => {
      const j = getJob(d, jobId);
      if (!j) return false;
      if (kind === "fit" && j.stage !== "ready_to_fit") return fail(j.id + " cannot be booked for fitting: " + (j.fulfilment === "supplier" ? "supplier unit must be received and quality checked first." : "quality check not complete."));
      const chk = validateVisit(d, { jobId, ...v });
      if (!chk.ok) return fail(chk.issues[0]);
      const id = nextId(d, "V");
      d.visits.push({ id, jobId, kind, date: v.date, start: v.start, end: v.end, crew: v.crew, status: "booked" });
      const label = (kind === "fit" ? "Fit" : kind === "measure" ? "Measure" : "Visit") + " booked " + fmtDate(v.date) + " " + v.start;
      setNext(j, label + " (" + v.crew.map(personName).join(" and ") + ")", v.crew[0], v.date + "T" + v.start);
      j.promises.forEach(p => (p.resolved = true));
      const at = log(d, "Booked " + kind + " visit " + fmtDate(v.date) + " " + v.start + " to " + v.end + " with " + v.crew.map(personName).join(" and "), { type: "job", id: jobId });
      closeTasks(d, t => t.ref.id === jobId && /(schedule|book|slot)/i.test(t.title), at);
      return label + ". No customer notification sent.";
    }, { undo: "booking" });
  },

  moveVisit(visitId: string, v: { date: string; start: string; end: string; crew: PersonId[] }) {
    return mutate(d => {
      const x = byId(d.visits, visitId);
      if (!x) return false;
      const chk = validateVisit(d, { jobId: x.jobId, ...v }, { exclude: [visitId] });
      if (!chk.ok) return fail(chk.issues[0]);
      const from = fmtDate(x.date) + " " + x.start;
      Object.assign(x, v);
      const j = getJob(d, x.jobId)!;
      if (x.kind === "fit" || x.kind === "measure") setNext(j, (x.kind === "fit" ? "Fit" : "Measure") + " moved to " + fmtDate(v.date) + " " + v.start, v.crew[0], v.date + "T" + v.start);
      j.promises.forEach(p => { if (!p.resolved) p.resolved = true; });
      log(d, "Moved " + x.kind + " visit " + x.id + " from " + from + " to " + fmtDate(v.date) + " " + v.start + " (no notification sent)", { type: "job", id: x.jobId });
      return "Visit moved. Customer not notified; draft an update from the job if needed.";
    }, { undo: "visit move" });
  },

  approveEmergency(id: string) {
    return mutate(d => {
      const p = byId(d.proposals, id);
      if (!p) return false;
      if (p.status !== "pending") return fail("This proposal was already " + p.status + ".");
      const prev = emergencyPreview(d, p);
      if (!prev.ok) return fail("Checks failed: " + prev.checks.filter(c => !c.ok).map(c => c.detail).join("; "));
      const at = tick(d);
      const vid = nextId(d, "V");
      d.visits.push({ id: vid, jobId: p.jobId, kind: "emergency", date: p.date, start: p.start, end: p.end, crew: p.crew, status: "booked", note: "Make safe and measure" });
      p.displaced.forEach(x => {
        const v = byId(d.visits, x.visitId)!;
        v.date = x.toDate; v.start = x.toStart; v.end = x.toEnd;
        const dj = getJob(d, v.jobId)!;
        setNext(dj, "Fit mirrors " + x.toStart + " to " + x.toEnd + " (moved for emergency)", v.crew[0], x.toDate + "T" + x.toStart);
        dj.promises = dj.promises.map(pr => ({ ...pr, resolved: true as boolean })).concat([{ text: "Revised window " + x.toStart + " to " + x.toEnd + " today", due: x.toDate + "T" + x.toEnd, resolved: false }]);
        log(d, "Moved " + v.jobId + " fitting to " + x.toStart + " to " + x.toEnd + " for the emergency", { type: "job", id: v.jobId });
      });
      const j = getJob(d, p.jobId)!;
      setNext(j, "Make safe and measure " + p.start + " (" + p.crew.map(personName).join(" and ") + ")", p.crew[0], p.date + "T" + p.start);
      p.status = "approved";
      const dr = byId(d.drafts, p.draftId);
      if (dr) dr.status = "sent_demo";
      resolveApproval(d, a => a.id === p.approvalId, "approved", at);
      log(d, "Approved emergency dispatch for " + p.jobId + "; booked " + p.start + " to " + p.end, { type: "job", id: p.jobId });
      if (dr) log(d, "Customer update to " + customerOf(d, getJob(d, dr.jobId)!).name + " marked sent in demo. Nothing was delivered.", { type: "job", id: dr.jobId }, { kind: "system", actor: "Demo messaging", source: "Demo simulation" });
      return "Emergency booked and Fitzpatrick fitting moved. Both visits updated once.";
    }, { undo: "emergency approval" });
  },

  rejectEmergency(id: string, reason: string) {
    return mutate(d => {
      const p = byId(d.proposals, id);
      if (!p || p.status !== "pending") return fail("Nothing to reject.");
      const at = log(d, "Rejected emergency proposal for " + p.jobId + (reason ? ": " + reason : "") + ". Schedule unchanged.", { type: "job", id: p.jobId });
      p.status = "rejected";
      const dr = byId(d.drafts, p.draftId);
      if (dr) dr.status = "discarded";
      resolveApproval(d, a => a.id === p.approvalId, "rejected", at, reason);
      const j = getJob(d, p.jobId)!;
      setNext(j, "Find another crew or offer the next emergency slot", "office", at);
      return "Proposal rejected. Existing bookings left exactly as they were.";
    }, { undo: "emergency rejection" });
  },

  /* measurement */
  submitMeasurement(jobId: string, f: { openings: Opening[]; glassType: string; spec: string; photos: string[]; access: string; ladder: boolean;
    glaziers: number; notes: string; measuredBy: PersonId; reviewerId: PersonId }) {
    const j0 = getJob(state.data, jobId);
    if (!j0) return false;
    const heritage = /heritage/i.test(j0.service);
    const problems: string[] = [];
    if (!f.openings.length) problems.push("Add at least one opening");
    f.openings.forEach((o, i) => {
      if (!o.label.trim()) problems.push("Opening " + (i + 1) + ": identifier required");
      if (!(o.qty >= 1)) problems.push("Opening " + (i + 1) + ": quantity required");
      if (!(o.widthMm >= 50 && o.widthMm <= 6000)) problems.push("Opening " + (i + 1) + ": width must be 50 to 6000 mm");
      if (!(o.heightMm >= 50 && o.heightMm <= 6000)) problems.push("Opening " + (i + 1) + ": height must be 50 to 6000 mm");
    });
    if (!f.glassType.trim()) problems.push("Glass type required");
    if (!f.spec.trim()) problems.push("Thickness or specification required");
    if (!f.access.trim()) problems.push("Access notes required");
    if (heritage && !f.notes.trim()) problems.push("Heritage work: record sash profile depth in notes");
    if ((j0.emergency || /shopfront/i.test(j0.service)) && !f.photos.length) problems.push("Photo required for shopfront and emergency work");
    if (f.reviewerId === f.measuredBy) problems.push("Reviewer must be a different person from the measurer");
    if (problems.length) return fail(problems[0] + (problems.length > 1 ? " (+" + (problems.length - 1) + " more)" : ""));
    return mutate(d => {
      const j = getJob(d, jobId)!;
      const prevRevs = d.revisions.filter(r => r.jobId === jobId);
      const rev = prevRevs.reduce((n, r) => Math.max(n, r.rev), 0) + 1;
      const at = tick(d);
      prevRevs.forEach(r => { if (r.status === "submitted" || r.status === "approved") { r.status = "superseded"; r.reason = r.reason || "Superseded by rev " + rev; } });
      const mr: MeasurementRevision = {
        id: "MR-" + jobId.slice(3) + "-" + rev, jobId, rev, openings: f.openings, glassType: f.glassType, spec: f.spec, photos: f.photos,
        access: f.access, ladder: f.ladder, glaziers: f.glaziers, notes: f.notes, measuredBy: f.measuredBy, measuredAt: at,
        status: "submitted", reviewerId: f.reviewerId, specialistReview: heritage
      };
      d.revisions.push(mr);
      const aid = nextId(d, "A");
      d.approvals.push({ id: aid, kind: "measurement_correction", jobId, ref: { type: "job", id: jobId }, requestedBy: personName(f.measuredBy), approverId: f.reviewerId,
        status: "pending", createdAt: at, title: (rev > 1 ? "Approve measurement correction rev " + rev : "Review measurements") + " for " + jobLabel(d, j),
        detail: f.openings.map(o => o.label + ": " + o.qty + " x W " + o.widthMm + " x H " + o.heightMm + " mm").join("; ") });
      if (rev > 1 || j.stage !== "awaiting_measure") j.qualityHold = "Revision " + rev + " awaiting independent check by " + personName(f.reviewerId);
      if (j.stage === "awaiting_measure") {
        j.stage = "awaiting_quote"; j.measuredAt = at; j.emergency = j.emergency;
        if (!quoteOf(d, jobId)) d.quotes.push({ id: "Q-" + (3000 + Number(jobId.slice(5))), jobId, status: "measured_awaiting_price", lines: [], xeroRef: "Not yet created", ownerId: "danielle", createdAt: at });
        setNext(j, "Price the quote", "danielle", nextWorkingDay(SCENARIO_DATE) + "T12:00");
      }
      d.visits.forEach(v => { if (v.jobId === jobId && v.status === "booked" && (v.kind === "measure" || v.kind === "emergency")) v.status = "completed"; });
      log(d, "Submitted measurement rev " + rev + " for " + jobId + " (" + f.openings.map(o => "W " + o.widthMm + " x H " + o.heightMm + " mm").join(", ") + ")", { type: "job", id: jobId },
        { actor: personName(f.measuredBy) });
      return "Rev " + rev + " submitted. Independent check assigned to " + personName(f.reviewerId) + ".";
    });
  },

  reviewRevision(revId: string, reviewerId: PersonId, approve: boolean, reason: string) {
    return mutate(d => {
      const r = byId(d.revisions, revId);
      if (!r) return false;
      if (r.status !== "submitted") return fail("Revision " + r.rev + " is already " + r.status + ".");
      if (reviewerId === r.measuredBy) return fail("Independent check required: " + personName(reviewerId) + " took these measurements.");
      if (!approve && !reason.trim()) return fail("Give a reason when rejecting a revision.");
      const j = getJob(d, r.jobId)!;
      const at = tick(d);
      r.status = approve ? "approved" : "rejected"; r.reviewerId = reviewerId; r.reviewedAt = at; r.specialistReview = false;
      if (reason) r.reason = reason;
      if (approve) {
        j.qualityHold = undefined;
        if (j.stage === "awaiting_quote") setNext(j, quoteOf(d, j.id)?.lines.length ? "Submit quote for approval" : "Price the quote", "danielle", SCENARIO_DATE + "T17:00");
      } else {
        j.qualityHold = "Rev " + r.rev + " rejected: " + reason + ". Remeasure needed.";
        setNext(j, "Remeasure (rev " + r.rev + " rejected)", r.measuredBy, nextWorkingDay(SCENARIO_DATE) + "T12:00");
      }
      resolveApproval(d, a => a.kind === "measurement_correction" && a.jobId === r.jobId, approve ? "approved" : "rejected", at, reason);
      closeTasks(d, t => t.ref.id === r.jobId && /(check|sign-off)/i.test(t.title), at);
      log(d, (approve ? "Approved" : "Rejected") + " measurement rev " + r.rev + " for " + r.jobId + " (independent check)" + (reason ? ": " + reason : ""), { type: "job", id: r.jobId },
        { actor: personName(reviewerId) });
      return approve ? "Rev " + r.rev + " approved by " + personName(reviewerId) + ". Quality hold cleared." : "Rev " + r.rev + " rejected. Production stays blocked.";
    });
  },

  /* quotes */
  saveQuoteLines(quoteId: string, lines: QuoteLine[]) {
    if (!lines.length || lines.some(l => !l.desc.trim() || !(l.qty > 0) || !(l.unitCents > 0))) return fail("Every line needs a description, quantity and price.");
    return mutate(d => {
      const q = byId(d.quotes, quoteId);
      if (!q) return false;
      if (q.status === "accepted" || q.status === "sent") return fail("Quote already " + q.status + "; create a revision in Xero instead.");
      q.lines = lines;
      if (q.status === "measured_awaiting_price" || q.status === "awaiting_approval") q.status = "draft";
      q.xeroRef = "QU-" + q.id.slice(2) + " (mock draft)";
      const j = getJob(d, q.jobId)!;
      if (!j.qualityHold) setNext(j, "Submit quote for approval", "danielle", SCENARIO_DATE + "T17:00");
      log(d, "Saved draft quote " + q.id + " at " + money(quoteTotal(q)), { type: "job", id: q.jobId });
      return "Draft saved: " + money(quoteTotal(q)) + ".";
    }, { undo: "quote edit" });
  },

  submitQuote(quoteId: string) {
    return mutate(d => {
      const q = byId(d.quotes, quoteId);
      if (!q) return false;
      const j = getJob(d, q.jobId)!;
      if (j.qualityHold) return fail("Quality hold on " + j.id + ": " + j.qualityHold);
      if (!q.lines.length) return fail("Price the quote first.");
      if (q.status !== "draft") return fail("Only a draft can be submitted.");
      const at = tick(d);
      q.status = "awaiting_approval";
      d.approvals.push({ id: nextId(d, "A"), kind: "quote_release", ref: { type: "quote", id: q.id }, jobId: q.jobId, requestedBy: actorName(), approverId: "danielle",
        status: "pending", createdAt: at, title: "Release quote " + q.id + " to " + customerOf(d, j).name + " (" + money(quoteTotal(q)) + ")", detail: q.lines.map(l => l.qty + " x " + l.desc).join("; ") });
      setNext(j, "Approve and send " + money(quoteTotal(q)) + " quote", "danielle", SCENARIO_DATE + "T17:00");
      log(d, "Submitted quote " + q.id + " for approval", { type: "job", id: q.jobId });
      return "Quote " + q.id + " sent to Danielle for approval.";
    });
  },

  approveQuote(quoteId: string) {
    return mutate(d => {
      const q = byId(d.quotes, quoteId);
      if (!q) return false;
      if (q.status !== "awaiting_approval") return fail("Quote is " + q.status.replace(/_/g, " ") + ", not awaiting approval.");
      const j = getJob(d, q.jobId)!;
      if (j.qualityHold) return fail("Quality hold: " + j.qualityHold);
      const at = tick(d);
      q.status = "sent"; q.sentAt = at; q.approvedBy = state.ui.viewAs; q.xeroRef = "QU-" + q.id.slice(2) + " (mock)";
      resolveApproval(d, a => a.kind === "quote_release" && a.ref.id === q.id, "approved", at);
      setNext(j, "Follow up quote " + q.id, "office", nextWorkingDay(SCENARIO_DATE, 3) + "T10:00");
      log(d, "Approved quote " + q.id + " (" + money(quoteTotal(q)) + "); marked sent in demo, no email delivered", { type: "job", id: q.jobId });
      return "Quote approved and marked sent in the demo. Nothing was emailed.";
    }, { undo: "quote approval" });
  },

  rejectQuote(quoteId: string, reason: string) {
    return mutate(d => {
      const q = byId(d.quotes, quoteId);
      if (!q || q.status !== "awaiting_approval") return fail("Nothing to send back.");
      const at = tick(d);
      q.status = "draft";
      resolveApproval(d, a => a.kind === "quote_release" && a.ref.id === q.id, "rejected", at, reason);
      setNext(getJob(d, q.jobId)!, "Revise quote: " + (reason || "returned by Danielle"), "office", SCENARIO_DATE + "T17:00");
      log(d, "Returned quote " + q.id + " to draft" + (reason ? ": " + reason : ""), { type: "job", id: q.jobId });
      return "Quote returned to draft.";
    }, { undo: "quote return" });
  },

  acceptQuote(quoteId: string) {
    return mutate(d => {
      const q = byId(d.quotes, quoteId);
      if (!q) return false;
      if (q.status !== "sent") return fail("Only a sent quote can be accepted.");
      const j = getJob(d, q.jobId)!;
      q.status = "accepted"; q.acceptedAt = tick(d);
      j.stage = "awaiting_deposit";
      setNext(j, "Take " + money(Math.round(quoteTotal(q) / 2)) + " deposit (50%)", "office", nextWorkingDay(SCENARIO_DATE, 2) + "T12:00");
      log(d, "Recorded customer acceptance of " + q.id + "; deposit of " + money(Math.round(quoteTotal(q) / 2)) + " now due", { type: "job", id: q.jobId });
      return "Accepted. " + j.id + " moved to Awaiting deposit.";
    }, { undo: "acceptance" });
  },

  /* payments */
  allocatePayment(paymentId: string, jobId: string) {
    return mutate(d => {
      const p = byId(d.payments, paymentId);
      const j = getJob(d, jobId);
      if (!p || !j) return false;
      if (p.status === "allocated") return fail(p.externalRef + " is already allocated. Payments are never counted twice.");
      const inv = invoiceOf(d, jobId), q = quoteOf(d, jobId);
      if (!inv && !(q && q.status === "accepted")) return fail(jobId + " has no invoice or accepted quote to allocate against.");
      const at = tick(d);
      p.status = "allocated"; p.jobId = jobId; p.invoiceId = inv?.id; p.quoteId = inv ? undefined : q!.id;
      log(d, "Allocated " + p.source + " " + p.externalRef + " (" + money(p.amountCents) + ") to " + (inv ? inv.id : q!.id), { type: "job", id: jobId });
      syncDeposit(d, j, at);
      closeTasks(d, t => t.ref.id === paymentId, at);
      return money(p.amountCents) + " allocated to " + jobId + ".";
    }, { undo: "allocation" });
  },

  recordDeposit(jobId: string, amountCents: number, source: "Square" | "Bank transfer") {
    if (!(amountCents > 0)) return fail("Enter an amount.");
    return mutate(d => {
      const j = getJob(d, jobId)!;
      const dep = depositStatus(d, j);
      if (!dep.required) return fail("No accepted quote, so no deposit is due.");
      if (dep.allocated + amountCents > dep.total) return fail("That would take payments above the order value.");
      const at = tick(d);
      const inv = invoiceOf(d, jobId), q = quoteOf(d, jobId)!;
      const pay: Payment = { id: nextId(d, "PAY"), source, externalRef: (source === "Square" ? "SQ-DEMO-" : "BT-DEMO-") + d.seq, at, amountCents, payerRef: customerOf(d, j).name.toUpperCase(),
        invoiceId: inv?.id, quoteId: inv ? undefined : q.id, jobId, status: "allocated", kind: "deposit" };
      d.payments.push(pay);
      log(d, "Recorded simulated " + source + " deposit " + money(amountCents) + " for " + jobId + " (no card was charged)", { type: "job", id: jobId });
      syncDeposit(d, j, at);
      return "Deposit recorded in the demo.";
    }, { undo: "deposit" });
  },

  recordBalance(invoiceId: string) {
    return mutate(d => {
      const inv = byId(d.invoices, invoiceId);
      if (!inv) return false;
      const s = invoiceStatus(d, inv);
      const pid = "PAY-BAL-" + inv.id;
      if (s.outstanding === 0 || byId(d.payments, pid)) return fail(inv.id + " has no outstanding balance. Nothing recorded twice.");
      const at = tick(d);
      d.payments.push({ id: pid, source: "Square", externalRef: "SQ-DEMO-BAL-" + inv.id.slice(4), at, amountCents: s.outstanding, payerRef: "BALANCE " + inv.id,
        invoiceId: inv.id, jobId: inv.jobId, status: "allocated", kind: "balance" });
      resolveApproval(d, a => a.kind === "payment_reminder" && a.jobId === inv.jobId, "rejected", at, "Withdrawn: balance paid");
      d.drafts.forEach(dr => { if (dr.jobId === inv.jobId && dr.status === "draft" && /balance|INV/i.test(dr.subject)) dr.status = "discarded"; });
      const j = getJob(d, inv.jobId)!;
      setNext(j, "None. Paid in full", j.ownerId, at);
      closeTasks(d, t => t.ref.id === inv.jobId, at);
      log(d, "Recorded simulated balance payment " + money(s.outstanding) + " on " + inv.id + "; reminder withdrawn", { type: "job", id: inv.jobId });
      return inv.id + " paid in full in the demo.";
    }, { undo: "balance payment" });
  },

  squareImport() {
    return mutate(d => {
      const ref = "SQ-88433";
      if (d.payments.some(p => p.externalRef === ref)) {
        log(d, "Checked card events: 0 new, " + d.payments.filter(p => p.source === "Square").length + " already imported (no duplicates)", undefined, { kind: "system", actor: "Simulated Square import", source: "Simulated Square import" });
        return "Simulated Square import: nothing new. Existing events were not duplicated.";
      }
      const at = tick(d);
      d.payments.push({ id: nextId(d, "PAY"), source: "Square", externalRef: ref, at, amountCents: 107000, payerRef: "MORAN DEP", status: "unmatched", suggestedJobId: "RG-2618", kind: "deposit" });
      d.squareImports += 1;
      log(d, "Imported 1 new card event SQ-88433 (€1,070, ref MORAN DEP); sent to review", undefined, { kind: "system", actor: "Simulated Square import", source: "Simulated Square import" });
      return "Simulated Square import: 1 new event waiting for allocation.";
    });
  },

  xeroRefresh() {
    return mutate(d => {
      log(d, "Read " + d.invoices.length + " invoices and " + d.payments.filter(p => p.invoiceId).length + " invoice payments. No changes written.", undefined,
        { kind: "system", actor: "Simulated Xero sync", source: "Simulated Xero sync" });
      return "Simulated Xero refresh complete. Read only; nothing written.";
    });
  },

  /* production */
  releaseProduction(jobId: string) {
    return mutate(d => {
      const j = getJob(d, jobId);
      if (!j) return false;
      if (!(j.stage === "production" && j.prodState === "waiting_release")) return fail(jobId + " is not waiting for release.");
      const failing = releaseGates(d, j).filter(g => !g.ok);
      if (failing.length) return fail("Cannot release: " + failing.map(g => g.label + " (" + g.detail + ")").join("; "));
      const at = tick(d);
      const po = d.productionOrders.find(p => p.jobId === jobId && p.status === "waiting_release");
      if (po) { po.status = "released"; po.releasedAt = at; po.releasedBy = state.ui.viewAs; po.blocker = undefined; }
      j.prodState = "in_progress"; j.releasedAt = at;
      if (j.fulfilment === "in_house" && po) {
        const steps: [WorkshopTask["step"], PersonId, number][] = [["cut", "liam", 1], ["assemble", "liam", 2], ["qc", "mark", 3]];
        steps.forEach(([step, owner, n]) => d.workshopTasks.push({ id: nextId(d, "WT"), poId: po.id, jobId, step, ownerId: owner, due: nextWorkingDay(SCENARIO_DATE, n) + "T16:00", status: "todo" }));
      }
      setNext(j, "Workshop: cut, assemble and QC", "mark", nextWorkingDay(SCENARIO_DATE, 3) + "T16:00");
      resolveApproval(d, a => a.kind === "production_release" && a.jobId === jobId, "approved", at);
      closeTasks(d, t => t.ref.id === jobId && /release/i.test(t.title), at);
      log(d, "Released " + jobId + " to the workshop. Cut, assemble and QC tasks created; glass not yet made.", { type: "job", id: jobId });
      return jobId + " released. Workshop tasks created for Mark's team.";
    }, { undo: "release" });
  },

  holdRelease(jobId: string, reason: string) {
    return mutate(d => {
      const at = tick(d);
      resolveApproval(d, a => a.kind === "production_release" && a.jobId === jobId, "rejected", at, reason);
      const po = d.productionOrders.find(p => p.jobId === jobId && p.status === "waiting_release");
      if (po) po.blocker = "Held by office: " + (reason || "no reason given");
      log(d, "Held release of " + jobId + (reason ? ": " + reason : ""), { type: "job", id: jobId });
      return "Release held. Nothing sent to the workshop.";
    }, { undo: "hold" });
  },

  advanceWorkshopTask(id: string) {
    return mutate(d => {
      const t = byId(d.workshopTasks, id);
      if (!t) return false;
      if (t.status === "done") return fail("Already done.");
      const siblings = d.workshopTasks.filter(x => x.poId === t.poId);
      const order = ["cut", "assemble", "qc"];
      const blocking = siblings.find(x => order.indexOf(x.step) < order.indexOf(t.step) && x.status !== "done");
      if (blocking) return fail("Finish " + blocking.step + " first.");
      t.status = t.status === "todo" ? "doing" : "done";
      const at = log(d, (t.status === "doing" ? "Started " : "Completed ") + t.step + " for " + t.jobId, { type: "job", id: t.jobId }, { actor: personName(t.ownerId) });
      if (t.step === "assemble" && t.status === "done") closeTasks(d, x => x.ref.id === t.jobId && /assemble/i.test(x.title), at);
      if (t.step === "qc" && t.status === "done") return finishProduction(d, t.jobId, at);
      return t.step + " " + (t.status === "doing" ? "started" : "done") + ".";
    }, { undo: "workshop step" });
  },

  supplierStep(soId: string, step: "ack" | "receive" | "qc", ref?: string) {
    return mutate(d => {
      const so = byId(d.supplierOrders, soId);
      if (!so) return false;
      const at = tick(d);
      if (step === "ack") {
        if (so.acknowledged) return fail("Already acknowledged.");
        so.acknowledged = true; so.ackAt = at; so.supplierRef = ref?.trim() || "STP-" + (55800 + d.seq);
        closeTasks(d, t => t.ref.id === soId && /acknowledg/i.test(t.title), at);
        log(d, "Recorded supplier acknowledgement for " + so.id + " (ref " + so.supplierRef + ")", { type: "job", id: so.jobId });
        return "Acknowledgement recorded.";
      }
      if (step === "receive") {
        if (!so.acknowledged) return fail("Record the supplier acknowledgement first.");
        if (so.received) return fail("Already received.");
        so.received = true; so.receivedAt = at;
        log(d, "Received " + so.id + " at Robinhood", { type: "job", id: so.jobId });
        return "Receipt recorded. Quality check next.";
      }
      if (!so.received) return fail("Cannot QC before receipt.");
      if (so.qc) return fail("Already checked.");
      so.qc = true; so.qcAt = at;
      closeTasks(d, t => t.ref.id === soId, at);
      log(d, "Quality checked " + so.id + " against spec rev " + so.specRev, { type: "job", id: so.jobId });
      const j = getJob(d, so.jobId)!;
      const allTasksDone = d.workshopTasks.filter(x => x.jobId === j.id).every(x => x.status === "done");
      if (j.stage === "production" && j.prodState === "in_progress" && (j.fulfilment === "supplier" || allTasksDone)) return finishProduction(d, j.id, at);
      return "QC recorded.";
    }, { undo: "supplier step" });
  },

  completeFitting(jobId: string) {
    return mutate(d => {
      const j = getJob(d, jobId);
      if (!j || j.stage !== "ready_to_fit") return fail("Only a ready-to-fit job can be completed.");
      const v = d.visits.find(x => x.jobId === jobId && x.kind === "fit" && x.status === "booked");
      if (!v) return fail("Book the fitting visit first.");
      const at = tick(d);
      v.status = "completed";
      j.stage = "completed"; j.fittedAt = at;
      const inv = invoiceOf(d, jobId);
      const out = inv ? invoiceStatus(d, inv).outstanding : 0;
      setNext(j, out ? "Collect balance " + money(out) : "Raise balance invoice in Xero", "office", nextWorkingDay(SCENARIO_DATE, 5) + "T12:00");
      log(d, "Completed fitting for " + jobId + " (checklist signed by field and office)", { type: "job", id: jobId });
      return jobId + " completed. Balance stays outstanding until paid.";
    }, { undo: "completion" });
  },

  /* approvals, drafts, tasks */
  decide(approvalId: string, approve: boolean, reason = "") {
    const a = byId(state.data.approvals, approvalId);
    if (!a || a.status !== "pending") return fail("This approval was already decided.");
    const d = state.data;
    switch (a.kind) {
      case "quote_release": return approve ? ops.approveQuote(a.ref.id) : ops.rejectQuote(a.ref.id, reason);
      case "emergency_reschedule": { const p = d.proposals.find(x => x.approvalId === a.id)!; return approve ? ops.approveEmergency(p.id) : ops.rejectEmergency(p.id, reason); }
      case "production_release": return approve ? ops.releaseProduction(a.jobId!) : ops.holdRelease(a.jobId!, reason);
      case "measurement_correction": { const r = currentRevision(d, a.jobId!)!; return ops.reviewRevision(r.id, a.approverId, approve, reason); }
      case "enquiry_merge": {
        if (approve) { const it = d.interactions.find(x => x.dedupeJobId === a.jobId && x.status === "new"); return it ? ops.mergeInteraction(it.id) : fail("No duplicate left to merge."); }
        return mutate(dd => { const at = tick(dd); resolveApproval(dd, x => x.id === a.id, "rejected", at, reason); dd.interactions.forEach(x => { if (x.dedupeJobId === a.jobId && x.status === "new") { x.dedupeJobId = undefined; x.dedupeReason = undefined; } }); log(dd, "Kept contact separate from " + a.jobId, { type: "job", id: a.jobId! }); return "Kept separate."; });
      }
      case "customer_message":
      case "payment_reminder": {
        const draftId = a.ref.type === "draft" ? a.ref.id : "";
        return ops.decideDraft(draftId, approve, a.id, reason);
      }
    }
    return false;
  },

  decideDraft(draftId: string, approve: boolean, approvalId?: string, reason = "") {
    return mutate(d => {
      const dr = byId(d.drafts, draftId);
      if (!dr) return false;
      if (dr.status !== "draft") return fail("Draft already " + (dr.status === "sent_demo" ? "marked sent in demo" : "discarded") + ".");
      const at = tick(d);
      dr.status = approve ? "sent_demo" : "discarded";
      resolveApproval(d, a => a.id === (approvalId || dr.approvalId), approve ? "approved" : "rejected", at, reason);
      const j = getJob(d, dr.jobId)!;
      if (approve && /balance/i.test(dr.subject)) setNext(j, "Await balance; reminder marked sent in demo", "office", nextWorkingDay(SCENARIO_DATE, 3) + "T12:00");
      log(d, (approve ? "Approved" : "Discarded") + " " + dr.channel.toLowerCase() + " draft to " + customerOf(d, j).name + ": " + dr.subject + (approve ? ". Marked sent in demo; nothing delivered." : ""), { type: "job", id: dr.jobId });
      return approve ? "Marked sent in the demo. No message left the browser." : "Draft discarded.";
    }, { undo: approve ? "message approval" : "discard" });
  },

  editDraft(draftId: string, body: string) {
    if (!body.trim()) return fail("Message cannot be empty.");
    return mutate(d => {
      const dr = byId(d.drafts, draftId);
      if (!dr || dr.status !== "draft") return false;
      dr.body = body;
      log(d, "Edited draft " + dr.subject, { type: "job", id: dr.jobId });
      return "Draft updated.";
    });
  },

  draftUpdate(jobId: string, subject: string, body: string) {
    return mutate(d => {
      const j = getJob(d, jobId)!;
      const at = tick(d);
      const id = nextId(d, "D"), aid = nextId(d, "A");
      d.drafts.push({ id, jobId, customerId: j.customerId, channel: "SMS", subject, body, status: "draft", createdBy: actorName(), approvalId: aid, createdAt: at });
      d.approvals.push({ id: aid, kind: "customer_message", ref: { type: "draft", id }, jobId, requestedBy: actorName(), approverId: "office", status: "pending", createdAt: at,
        title: "Send update to " + customerOf(d, j).name + ": " + subject, detail: body });
      log(d, "Drafted customer update for " + jobId + ": " + subject, { type: "job", id: jobId });
      return "Draft created and waiting for office review in Work.";
    });
  },

  addTask(f: { title: string; ownerId: PersonId; due: string; priority: Priority; team: TeamName; ref: EntityRef }) {
    if (!f.title.trim()) return fail("Title is required.");
    if (!f.due) return fail("Due time is required.");
    if (!f.ref.id) return fail("Link the task to a record.");
    return mutate(d => {
      const t: Task = { id: nextId(d, "T"), title: f.title.trim(), ownerId: f.ownerId, due: f.due, priority: f.priority, team: f.team, status: "open", ref: f.ref, source: "Manual" };
      d.tasks.push(t);
      log(d, "Created task: " + t.title + " (owner " + personName(t.ownerId) + ")", f.ref.type === "job" ? f.ref : undefined);
      return "Task created.";
    }, { undo: "new task" });
  },

  setTaskDone(id: string, done: boolean) {
    return mutate(d => {
      const t = byId(d.tasks, id);
      if (!t) return false;
      const at = tick(d);
      t.status = done ? "done" : "open"; t.doneAt = done ? at : undefined;
      log(d, (done ? "Completed task: " : "Reopened task: ") + t.title, t.ref.type === "job" ? t.ref : undefined);
      return done ? "Task completed." : "Task reopened.";
    }, { undo: done ? "task completion" : "reopen" });
  },

  paperDecision(id: string, accept: boolean) {
    return mutate(d => {
      const r = byId(d.paper, id);
      if (!r) return false;
      r.status = accept ? "accepted" : "rejected";
      log(d, (accept ? "Accepted" : "Rejected") + " paper migration sample " + r.id + " (" + r.source + ")", undefined, { source: "Paper migration sample" });
      return accept ? "Accepted. Sample rows only; no historical paper is digitised." : "Rejected and left for manual entry.";
    }, { undo: "paper review" });
  },

  runAgent(agentId: string) {
    return mutate(d => {
      const run = buildRun(d, agentId);
      d.agentRuns.push(run);
      const agent = AGENTS.find(a => a.id === agentId)!;
      if (agentId === "watchdog") {
        d.callbacks.filter(c => c.status === "open" && ms(c.due) < ms(SCENARIO_NOW)).forEach(c => {
          if (!d.tasks.some(t => t.status === "open" && /callback/i.test(t.title) && t.title.includes(c.customerName.split(" ")[0]))) {
            d.tasks.push({ id: nextId(d, "T"), title: "Return " + c.customerName + "'s overdue callback", ownerId: c.ownerId, due: SCENARIO_DATE + "T12:00", priority: "High",
              team: "Office", status: "open", ref: c.jobId ? { type: "job", id: c.jobId } : { type: "person", id: c.ownerId }, source: "Ops Watchdog" });
            run.result = "Created local task for " + c.customerName + ". No commitment changed.";
          }
        });
      }
      log(d, "Ran a demo simulation: " + run.findings.length + " findings", undefined, { kind: "agent", actor: agent.name, source: "Demo simulation" });
      return agent.name + " ran (demo simulation).";
    });
  }
};

/* deposit allocation can move a job forward through its gates, never past them */
function syncDeposit(d: OpsData, j: Job, at: string) {
  const dep = depositStatus(d, j);
  if (j.stage === "awaiting_deposit" && dep.eligible) {
    j.stage = "production"; j.prodState = "waiting_release";
    const rev = currentRevision(d, j.id);
    d.productionOrders.push({ id: nextId(d, "PO"), jobId: j.id, route: j.fulfilment, status: "waiting_release", specRev: rev?.rev || 1, ownerId: "mark", blocker: "Waiting for release approval" });
    d.approvals.push({ id: nextId(d, "A"), kind: "production_release", ref: { type: "job", id: j.id }, jobId: j.id, requestedBy: "Production Coordinator", approverId: "danielle",
      status: "pending", createdAt: at, title: "Release " + jobLabel(d, j) + " to workshop", detail: "Deposit " + money(dep.allocated) + " allocated. Check gates before releasing.", agentId: "production" });
    setNext(j, "Approve release to workshop", "danielle", nextWorkingDay(SCENARIO_DATE) + "T12:00");
    log(d, "Deposit threshold met; " + j.id + " moved to Production, waiting release", { type: "job", id: j.id }, { kind: "system", actor: "Pulse gates", source: "Pulse" });
  } else if (j.stage === "production" && j.prodState === "waiting_release") {
    const po = d.productionOrders.find(p => p.jobId === j.id && p.status === "waiting_release");
    const failing = releaseGates(d, j).filter(g => !g.ok);
    if (po) po.blocker = failing.length ? failing.map(g => g.label).join(", ") : "All gates clear; waiting for release approval";
    if (!failing.length) {
      setNext(j, "Approve release to workshop", "danielle", SCENARIO_DATE + "T17:00");
      if (!d.approvals.some(a => a.status === "pending" && a.kind === "production_release" && a.jobId === j.id)) {
        d.approvals.push({ id: nextId(d, "A"), kind: "production_release", ref: { type: "job", id: j.id }, jobId: j.id, requestedBy: "Production Coordinator", approverId: "danielle",
          status: "pending", createdAt: at, title: "Release " + jobLabel(d, j) + " to workshop", detail: "All gates clear after deposit allocation.", agentId: "production" });
      }
    }
  }
}

function finishProduction(d: OpsData, jobId: string, at: string): string {
  const j = getJob(d, jobId)!;
  const pendingSupplier = d.supplierOrders.find(s => s.jobId === jobId && !s.qc);
  if (pendingSupplier) {
    log(d, "Workshop QC done for " + jobId + "; still waiting on " + pendingSupplier.id + " from the supplier", { type: "job", id: jobId });
    return "Workshop QC done. " + pendingSupplier.id + " still outstanding, so not ready to fit.";
  }
  j.stage = "ready_to_fit"; j.prodState = undefined; j.qcAt = at;
  j.rackLocation = j.rackLocation || "Rack C" + ((d.seq % 5) + 1);
  d.productionOrders.forEach(p => { if (p.jobId === jobId && p.status === "released") p.status = "complete"; });
  setNext(j, "Schedule fitting (" + j.crewSize + " glaziers, " + j.visitMins + " min)", "office", nextWorkingDay(SCENARIO_DATE) + "T12:00");
  log(d, jobId + " passed QC and moved to Ready to fit (" + j.rackLocation + ")", { type: "job", id: jobId });
  return jobId + " ready to fit at " + j.rackLocation + ".";
}

/* deterministic agent output from current records */
function buildRun(d: OpsData, agentId: string): AgentRun {
  const at = isoFromMs(ms(SCENARIO_NOW) + (d.clock + 1) * 60000);
  const c = stageCounts(d);
  const L = ledgerTotals(d);
  const base = { id: "RUN-" + (200 + d.agentRuns.length), agentId, at };
  const wr = waitingRelease(d).map(j => ({ j, dep: depositStatus(d, j) })).filter(x => x.dep.eligible);
  const overdueInv = d.invoices.map(inv => ({ inv, s: invoiceStatus(d, inv) })).filter(x => x.s.overdueDays > 0);
  switch (agentId) {
    case "briefing": {
      const f = [{ text: c.awaiting_measure + " jobs await measurement and " + c.awaiting_quote + " await quotes.", refs: [] as EntityRef[] }];
      wr.forEach(x => { const paid = paymentsAt(d, x.j.id); f.push({ text: customerOf(d, x.j).name + " has paid " + money(x.dep.allocated) + " and waited " + workingDaysBetween(paid) + " working days for production release.", refs: [{ type: "job", id: x.j.id }] }); });
      overdueInv.forEach(x => f.push({ text: customerOf(d, getJob(d, x.inv.jobId)!).name + " owes " + money(x.s.outstanding) + ", " + x.s.overdueDays + " days overdue.", refs: [{ type: "invoice", id: x.inv.id }] }));
      d.proposals.filter(p => p.status === "pending").forEach(p => f.push({ text: "One emergency proposal would move " + p.displaced.map(x => customerOf(d, getJob(d, d.visits.find(v => v.id === x.visitId)!.jobId)!).name).join(", ") + "'s fitting.", refs: [{ type: "job", id: p.jobId }] }));
      return { ...base, inputs: ["Stage counts", "Waiting releases", "Sample ledger: " + money(L.invoiced) + " invoiced", pendingApprovals(d).length + " pending approvals"], findings: f, proposed: "No action. Read only.", result: "Briefing refreshed." };
    }
    case "watchdog": {
      const f: AgentRun["findings"] = [];
      d.callbacks.filter(cb => cb.status === "open" && ms(cb.due) < ms(SCENARIO_NOW)).forEach(cb => f.push({ text: cb.customerName + "'s callback was due " + fmtDateTime(cb.due) + ".", refs: cb.jobId ? [{ type: "job", id: cb.jobId }] : [] }));
      d.jobs.filter(j => j.stage !== "completed" && ms(j.nextDue) < ms(SCENARIO_NOW)).forEach(j => f.push({ text: j.id + " next action overdue: " + j.nextAction + ".", refs: [{ type: "job", id: j.id }] }));
      return { ...base, inputs: ["Callbacks", "Job next actions", "Commitments"], findings: f.length ? f : [{ text: "Nothing overdue.", refs: [] }], proposed: "Create local tasks for the office.", result: "No new tasks needed." };
    }
    case "enquiry": {
      const dup = d.interactions.filter(i => i.status === "new" && i.dedupeJobId);
      const drafts = d.interactions.filter(i => i.status === "draft_enquiry");
      return { ...base, inputs: [d.interactions.length + " inbox items"], findings: dup.map(i => ({ text: i.id + " looks like a duplicate of " + i.dedupeJobId + ".", refs: [{ type: "job", id: i.dedupeJobId! }] as EntityRef[] }))
        .concat(drafts.map(i => ({ text: i.id + " from " + i.from + " is a draft enquiry: " + (i.urgency === "emergency" ? "meets emergency criteria" : "standard priority") + ".", refs: [] }))),
        proposed: dup.length ? "Office to approve merges." : "No merges to propose.", result: "Suggestions only." };
    }
    case "scheduling": {
      const target = d.jobs.find(j => j.id === state.ui.availabilityJob) || getJob(d, "RG-2601")!;
      return { ...base, inputs: ["Booked visits", "Crew skills", "Travel estimates"], findings: [{ text: "Next slots for " + target.id + " are on Schedule, Availability.", refs: [{ type: "job", id: target.id }] }],
        proposed: "Offer the earliest valid slot.", result: "Proposal only; nothing booked." };
    }
    case "production": {
      const f: AgentRun["findings"] = waitingRelease(d).map(j => {
        const g = releaseGates(d, j).filter(x => !x.ok);
        return { text: j.id + (g.length ? " blocked: " + g.map(x => x.label).join(", ") : " passes every gate"), refs: [{ type: "job", id: j.id }] as EntityRef[] };
      });
      d.supplierOrders.filter(s => !s.acknowledged).forEach(s => f.push({ text: s.id + " not acknowledged after " + ackOverdueHours(s) + " h.", refs: [{ type: "supplierOrder", id: s.id }] }));
      return { ...base, inputs: ["Production orders", "Deposits", "Revisions", "Supplier orders"], findings: f.length ? f : [{ text: "No releases waiting.", refs: [] }], proposed: "Request release approval where gates pass.", result: "Never approves its own revisions." };
    }
    case "updates": {
      const f = d.drafts.filter(x => x.status === "draft").map(x => ({ text: "Draft to " + customerOf(d, getJob(d, x.jobId)!).name + " waiting for review: " + x.subject, refs: [{ type: "job", id: x.jobId }] as EntityRef[] }));
      return { ...base, inputs: ["Drafts", "Inbox"], findings: f.length ? f : [{ text: "No drafts waiting.", refs: [] }], proposed: "Office reviews before any simulated send.", result: "No message sent." };
    }
    default: {
      const un = d.payments.filter(p => p.status === "unmatched");
      const f = overdueInv.map(x => ({ text: x.inv.id + " has " + money(x.s.outstanding) + " outstanding, " + x.s.overdueDays + " days overdue.", refs: [{ type: "invoice", id: x.inv.id }] as EntityRef[] }))
        .concat(un.map(p => ({ text: p.externalRef + " (" + money(p.amountCents) + ") unmatched" + (p.suggestedJobId ? "; looks like " + p.suggestedJobId : "") + ".", refs: [{ type: "payment", id: p.id }] as EntityRef[] })));
      return { ...base, inputs: ["Sample ledger: " + money(L.invoiced) + " invoiced, " + money(L.paid) + " paid", "Card events"], findings: f.length ? f : [{ text: "Ledger reconciles. Nothing overdue.", refs: [] }],
        proposed: "Draft reminders for office approval.", result: "Never initiates a payment or refund." };
    }
  }
}
function paymentsAt(d: OpsData, jobId: string) {
  return d.payments.filter(p => p.jobId === jobId && p.status === "allocated").map(p => p.at).sort()[0] || SCENARIO_NOW;
}

export { calendarDays, siteOf };
export type { Draft };
