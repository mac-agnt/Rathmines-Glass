/* Home right-rail widgets: queues, the briefing, today's work and recent
   actions. The Home centre column stays chat-only. */
import type { ReactNode } from "react";
import { ops, useOps, go } from "./store";
import { AGENTS } from "./fixtures";
import {
  customerOf, dayVisits, depositStatus, getJob, ledgerTotals, paymentsFor, personName, stageCounts, waitingRelease, activeJobs, pendingApprovals, refLabel
} from "./selectors";
import { SCENARIO_DATE, SCENARIO_LABEL, fmtDateTime, money, workingDaysBetween } from "./time";
import { Badge, Icon, ICON, RefLink } from "./ui";

function Widget({ title, right, children, onRemove, edit }: { title: string; right?: ReactNode; children: ReactNode; onRemove: () => void; edit: boolean }) {
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", boxShadow: "var(--card-shadow)", padding: "16px 18px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: 13.5, fontWeight: 600 }}>{title}</h2>
        {right}
        {edit && <button type="button" className="ops-btn ghost sm" aria-label={"Remove " + title} onClick={onRemove}><Icon d={ICON.x} size={11} /></button>}
      </div>
      {children}
    </section>
  );
}

function Row({ k, v, onClick, tone }: { k: string; v: ReactNode; onClick: () => void; tone?: "bad" | "warn" }) {
  return (
    <button type="button" className="ops-row" onClick={onClick} style={{ padding: "8px 8px" }}>
      <span style={{ flex: 1, fontSize: 13, color: "var(--body)" }}>{k}</span>
      <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: tone === "bad" ? "var(--bad)" : tone === "warn" ? "var(--warn)" : "var(--ink)" }}>{v}</span>
    </button>
  );
}

export default function HomeRail({ widgets, edit, toggle }: { widgets: string[]; edit: boolean; toggle: (id: string) => void }) {
  const { data, ui } = useOps();
  const c = stageCounts(data, ui.brand);
  const act = activeJobs(data, ui.brand);
  const L = ledgerTotals(data, ui.brand);
  const paidWaiting = waitingRelease(data, ui.brand).filter(j => { const d = depositStatus(data, j); return d.allocated > 0 || d.unmatched.length > 0; });
  const today = dayVisits(data, SCENARIO_DATE, ui.brand).filter(v => v.status !== "cancelled");
  const proposal = data.proposals.find(p => p.status === "pending");
  const oneill = getJob(data, "RG-2605")!;
  const oneillPaid = paymentsFor(data, oneill.id).map(p => p.at).sort()[0];
  const brief = data.agentRuns.filter(r => r.agentId === "briefing").sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const recent = data.activity.slice().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
  const show = (id: string) => widgets.includes(id);
  return (
    <>
      <div className="ops-note" style={{ padding: "0 4px" }}>{SCENARIO_LABEL} · fixture dates. Greeting uses your clock.</div>
      {show("queues") && (
        <Widget title="Queues" right={<Badge tone="neutral" icon={false}>{ui.brand === "ALL" ? "All brands" : ui.brand}</Badge>} edit={edit} onRemove={() => toggle("queues")}>
          <Row k="Active jobs" v={act.length} onClick={() => go("Jobs", "pipeline")} />
          <Row k="Awaiting measurement" v={c.awaiting_measure} onClick={() => go("Jobs", "pipeline")} />
          <Row k="Awaiting quote" v={c.awaiting_quote} onClick={() => go("Enquiries", "quotes")} />
          <Row k="Paid orders not released" v={paidWaiting.length} tone={paidWaiting.length ? "warn" : undefined} onClick={() => go("Production", "queue")} />
          <Row k="Invoiced outstanding" v={money(L.outstanding)} tone={L.overdue ? "bad" : undefined} onClick={() => go("Finance", "balances")} />
          <div className="ops-note" style={{ padding: "4px 0 2px" }}>Outstanding is the sample ledger ({L.count} invoices), {money(L.overdue)} overdue.</div>
        </Widget>
      )}
      {show("attention") && (
        <Widget title="Needs attention" right={<Badge tone="warn">{pendingApprovals(data).length} approvals</Badge>} edit={edit} onRemove={() => toggle("attention")}>
          {proposal && (() => {
            const pj = getJob(data, proposal.jobId)!;
            const moved = proposal.displaced.map(x => getJob(data, data.visits.find(v => v.id === x.visitId)!.jobId)!);
            return (
              <button type="button" className="ops-row" onClick={() => go("Schedule", "emergencies")} style={{ alignItems: "flex-start" }}>
                <span style={{ color: "var(--bad)", marginTop: 2 }}><Icon d={ICON.alert} /></span>
                <div className="main"><div className="t">Emergency proposal: {customerOf(data, pj).name}</div><div className="m">Would move {moved.map(m => customerOf(data, m).name).join(", ")}'s fitting to {proposal.displaced[0].toStart}. Needs office approval.</div></div>
              </button>
            );
          })()}
          {oneill.stage === "production" && oneill.prodState === "waiting_release" && oneillPaid && (
            <button type="button" className="ops-row" onClick={() => ops.open({ type: "job", id: oneill.id })} style={{ alignItems: "flex-start" }}>
              <span style={{ color: "var(--bad)", marginTop: 2 }}><Icon d={ICON.block} /></span>
              <div className="main"><div className="t">O'Neill Residence paid, not released</div><div className="m">{money(depositStatus(data, oneill).allocated)} paid {workingDaysBetween(oneillPaid)} working days ago. Gates clear; release sign-off missing.</div></div>
            </button>
          )}
          {brief && (
            <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, fontWeight: 600 }}>Briefing <span className="ops-note" style={{ fontWeight: 400 }}>{fmtDateTime(brief.at)} · demo simulation</span></div>
              {brief.findings.map((f, i) => (
                <div key={i} style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5, marginTop: 6 }}>
                  {f.text}{f.refs.length > 0 && <> {f.refs.map((r, k) => <span key={k}>{k ? " " : ""}<RefLink r={r}>{refLabel(data, r).split(" ")[0]}</RefLink></span>)}</>}
                </div>
              ))}
              <button type="button" className="ops-btn ghost sm" style={{ marginTop: 6 }} onClick={() => ops.runAgent("briefing")}>Refresh briefing</button>
            </div>
          )}
        </Widget>
      )}
      {show("today") && (
        <Widget title="Today's work" right={<span className="ops-note">{today.length} visits</span>} edit={edit} onRemove={() => toggle("today")}>
          {today.map(v => {
            const j = getJob(data, v.jobId)!;
            return (
              <button key={v.id} type="button" className="ops-row" onClick={() => ops.open({ type: "job", id: j.id })}>
                <span style={{ width: 44, flex: "none", fontWeight: 600, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{v.start}</span>
                <div className="main"><div className="t">{customerOf(data, j).name}</div><div className="m">{v.kind} · {v.crew.map(personName).join(" + ")}{v.status === "completed" ? " · done" : ""}</div></div>
              </button>
            );
          })}
          {!today.length && <div className="ops-note">Nothing booked today for this brand.</div>}
        </Widget>
      )}
      {show("recent") && (
        <Widget title="Recent actions" edit={edit} onRemove={() => toggle("recent")}>
          {recent.map(e => (
            <button key={e.id} type="button" className="ops-row" onClick={() => (e.ref ? ops.open(e.ref) : go("Activity", "all"))}>
              <div className="main"><div className="t" style={{ fontWeight: 400, fontSize: 12.5 }}>{e.actor}: {e.action}</div><div className="m">{fmtDateTime(e.at)}{e.actorKind !== "person" ? " · " + e.source : ""}</div></div>
            </button>
          ))}
        </Widget>
      )}
    </>
  );
}

export { AGENTS };
