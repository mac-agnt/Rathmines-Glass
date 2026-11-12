/* Deterministic Home chat replies. Each answer is computed from the live demo
   records and links to them. No language model or external API is called. */
import { getState, ops, go } from "./store";
import {
  activeJobs, customerOf, depositStatus, emergencyPreview, findSlots, getJob, invoiceStatus, jobHealth, paymentsFor, pendingApprovals,
  personName, releaseGates, stageCounts, waitingRelease, ledgerTotals, STAGE_LABEL, byId
} from "./selectors";
import { fmtDay, money, workingDaysBetween, fmtDateTime, ms, SCENARIO_NOW } from "./time";

export interface Answer {
  text: string;
  tool: string;
  effect: string;
  cols?: string[];
  rows?: string[][];
  actions: [string, boolean, (() => void) | null][];
}

const TOOL = "Demo answer from records";
const EFFECT = "deterministic, no model call";
const openJob = (id: string) => () => ops.open({ type: "job", id });

export const SUGGESTED = ["What needs attention?", "Find a measuring slot for Emma", "What would this emergency move?", "Which paid jobs are stuck?"];

export function answer(q: string): Answer {
  const d = getState().data;
  const s = q.toLowerCase();
  const idMatch = q.toUpperCase().match(/RG-\d{4}/);

  if (/emergenc|rowan|displace|move/.test(s) && !/slot/.test(s)) {
    const p = d.proposals.find(x => x.status === "pending") || d.proposals[d.proposals.length - 1];
    if (!p) return fallback();
    const j = getJob(d, p.jobId)!;
    const moved = p.displaced.map(x => { const v = byId(d.visits, x.visitId)!; return { v, x, j: getJob(d, v.jobId)! }; });
    if (p.status !== "pending") {
      return { tool: TOOL, effect: EFFECT, text: "The emergency proposal for " + customerOf(d, j).name + " (" + j.id + ") was " + p.status + ". " + (p.status === "approved" ? "Both visits were updated once and the customer update was marked sent in the demo." : "Every existing booking was left as it was."),
        actions: [["Open " + j.id, true, openJob(j.id)], ["Open Activity", false, () => go("Activity", "all")]] };
    }
    const pv = emergencyPreview(d, p);
    return {
      tool: TOOL, effect: EFFECT,
      text: "Approving would send " + p.crew.map(personName).join(" and ") + " to " + customerOf(d, j).name + " (" + j.id + ") " + p.start + " to " + p.end + ". "
        + moved.map(m => customerOf(d, m.j).name + "'s " + m.v.kind + " (" + m.j.id + ") moves from " + m.v.start + " to " + m.x.toStart + " to " + m.x.toEnd).join("; ")
        + ". " + (pv.ok ? "All checks pass: no double booking, travel fits, and it ends inside working hours." : "Some checks fail, so it cannot be approved yet.")
        + " A customer message is drafted but not sent. Nothing changes until the office approves.",
      cols: ["Check", "Result"], rows: pv.checks.map(c => [c.label, c.ok ? "Pass" : "Fail: " + c.detail]),
      actions: [["Review the proposal", true, () => go("Schedule", "emergencies")], ["Open " + moved[0].j.id, false, openJob(moved[0].j.id)]]
    };
  }

  if (/slot|measur|emma|book/.test(s) && !idMatch || /emma/.test(s)) {
    const j = getJob(d, "RG-2601")!;
    const booked = d.visits.find(v => v.jobId === j.id && v.status === "booked");
    if (booked || j.stage !== "awaiting_measure") {
      return { tool: TOOL, effect: EFFECT, text: customerOf(d, j).name + " (" + j.id + ") " + (booked ? "is booked " + fmtDay(booked.date) + " " + booked.start + " with " + booked.crew.map(personName).join(" and ") + "." : "is now " + STAGE_LABEL[j.stage].toLowerCase() + "."),
        actions: [["Open " + j.id, true, openJob(j.id)]] };
    }
    const slots = findSlots(d, j.id, 3);
    return {
      tool: TOOL, effect: EFFECT,
      text: "Emma Murphy (RG-2601) has waited " + Math.round((ms(SCENARIO_NOW) - ms(j.enquiryAt)) / 86400000) + " calendar days for a measure and her callback is due 10:00. She needs one surveyor for 2 hours in Rathgar. These are the next slots that fit working hours, booked visits and travel"
        + (d.proposals.some(p => p.status === "pending") ? ". They will change if the emergency proposal is approved." : "."),
      cols: ["When", "Who", "Why it fits"], rows: slots.map(x => [fmtDay(x.date) + " " + x.start + " to " + x.end, x.crew.map(personName).join(" + "), x.notes[0] || "First visit of the day"]),
      actions: [["Open Availability", true, () => { ops.setAvailabilityJob(j.id); go("Schedule", "availability"); }], ["Open RG-2601", false, openJob(j.id)]]
    };
  }

  if (/paid|stuck|release|production|deposit/.test(s)) {
    const rows = waitingRelease(d).map(j => {
      const dep = depositStatus(d, j);
      const paid = paymentsFor(d, j.id).map(p => p.at).sort()[0];
      const fail = releaseGates(d, j).filter(g => !g.ok);
      return { j, dep, paid, fail };
    });
    const stuck = rows.filter(r => r.dep.allocated > 0 || r.dep.unmatched.length);
    if (!stuck.length) return { tool: TOOL, effect: EFFECT, text: "No paid job is waiting for release.", actions: [["Open Production", true, () => go("Production", "queue")]] };
    const worst = stuck.find(r => !r.fail.length) || stuck[0];
    return {
      tool: TOOL, effect: EFFECT,
      text: stuck.length + " paid or part-paid jobs are waiting for production release. " + customerOf(d, worst.j).name + " (" + worst.j.id + ") has paid " + money(worst.dep.allocated)
        + (worst.paid ? " and waited " + workingDaysBetween(worst.paid) + " working days" : "") + (worst.fail.length ? "; blocked by " + worst.fail.map(f => f.label.toLowerCase()).join(", ") + "." : "; every gate passes, so only the office release is missing."),
      cols: ["Job", "Paid", "Waiting", "Blocker"],
      rows: stuck.map(r => [r.j.id + " " + customerOf(d, r.j).name, money(r.dep.allocated) + (r.dep.unmatched.length ? " (+" + money(r.dep.unmatched[0].amountCents) + " unmatched)" : ""), r.paid ? workingDaysBetween(r.paid) + " working days" : "Not allocated", r.fail.length ? r.fail.map(f => f.label).join(", ") : "Office release only"]),
      actions: [["Open " + worst.j.id, true, openJob(worst.j.id)], ["Open Production queue", false, () => go("Production", "queue")]]
    };
  }

  if (/owe|overdue|balance|invoice|cash|harbour/.test(s)) {
    const L = ledgerTotals(d);
    const od = d.invoices.map(i => ({ i, st: invoiceStatus(d, i) })).filter(x => x.st.outstanding > 0);
    return {
      tool: TOOL, effect: EFFECT,
      text: "In the sample ledger, " + money(L.invoiced) + " is invoiced, " + money(L.paid) + " paid and " + money(L.outstanding) + " outstanding, of which " + money(L.overdue) + " is overdue. These are demo ledger totals, not company revenue.",
      cols: ["Invoice", "Customer", "Outstanding", "Status"],
      rows: od.map(x => [x.i.id, customerOf(d, getJob(d, x.i.jobId)!).name, money(x.st.outstanding), x.st.overdueDays ? x.st.overdueDays + " days overdue" : x.i.dueNote]),
      actions: [["Open Balances", true, () => go("Finance", "balances")], ["Open INV-503", false, () => ops.open({ type: "invoice", id: "INV-503" })]]
    };
  }

  if (idMatch && getJob(d, idMatch[0])) {
    const j = getJob(d, idMatch[0])!;
    const h = jobHealth(d, j);
    return { tool: TOOL, effect: EFFECT,
      text: j.id + " is " + customerOf(d, j).name + ", " + j.title.toLowerCase() + ". Stage: " + STAGE_LABEL[j.stage].toLowerCase() + ". Owner: " + personName(j.ownerId) + ". Next: " + j.nextAction.toLowerCase() + " (" + personName(j.nextOwnerId) + ", " + fmtDateTime(j.nextDue) + "). " + (h.tone === "ok" ? "On track." : h.reason + "."),
      actions: [["Open " + j.id, true, openJob(j.id)]] };
  }

  if (/attention|today|what.*need|priorit|brief|morning/.test(s)) {
    const reds = activeJobs(d).filter(j => jobHealth(d, j).tone === "bad").concat(d.jobs.filter(j => j.stage === "completed" && jobHealth(d, j).tone === "bad"));
    const c = stageCounts(d);
    const ap = pendingApprovals(d);
    return {
      tool: TOOL, effect: EFFECT,
      text: c.awaiting_measure + " jobs await measurement and " + c.awaiting_quote + " await quotes. " + reds.length + " jobs are red (an overdue commitment or a blocked critical step) and " + ap.length + " approvals are waiting"
        + (d.proposals.some(p => p.status === "pending") ? ", including an emergency proposal that would move a fitting." : "."),
      cols: ["Job", "Customer", "Why", "Owner"],
      rows: reds.map(j => [j.id, customerOf(d, j).name, jobHealth(d, j).reason, personName(j.nextOwnerId)]),
      actions: [["Review approvals", true, () => go("Work", "approvals")], ...reds.slice(0, 2).map(j => ["Open " + j.id, false, openJob(j.id)] as [string, boolean, () => void])]
    };
  }

  if (/callback|call back/.test(s)) {
    const open = d.callbacks.filter(c => c.status === "open");
    return { tool: TOOL, effect: EFFECT, text: open.length + " callbacks are open, " + open.filter(c => ms(c.due) < ms(SCENARIO_NOW)).length + " overdue.",
      cols: ["Customer", "Due", "Owner"], rows: open.map(c => [c.customerName, fmtDateTime(c.due), personName(c.ownerId)]),
      actions: [["Open Callbacks", true, () => go("Enquiries", "callbacks")]] };
  }

  return fallback();
}

function fallback(): Answer {
  return {
    tool: TOOL, effect: EFFECT,
    text: "This demo answers from its own records with fixed rules, not a language model. Try one of these, or ask about a job ID such as RG-2606.",
    actions: SUGGESTED.map((x, i) => [x, i === 0, null] as [string, boolean, null])
  };
}
