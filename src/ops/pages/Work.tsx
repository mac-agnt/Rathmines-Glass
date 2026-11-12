import { useState } from "react";
import type { Approval, Job, Task, TeamName } from "../types";
import { ops, useOps, go } from "../store";
import { AGENTS, PEOPLE, quoteTotal } from "../fixtures";
import {
  byId, currentRevision, customerOf, depositStatus, emergencyPreview, getJob, personName, quoteOf, refLabel, releaseGates, revisionsOf, supplierGates, invoiceOf, invoiceStatus, STAGE_LABEL
} from "../selectors";
import { fmtDateTime, money, ms, SCENARIO_NOW } from "../time";
import { Badge, Btn, Callout, Card, Chips, DemoPill, Empty, Gates, Icon, ICON, Page, PageHead, RefLink, Stat, Table } from "../ui";

export default function Work({ tab }: { tab: string }) {
  if (tab === "approvals") return <Approvals />;
  if (tab === "workflows") return <Workflows />;
  return <Tasks />;
}

function Tasks() {
  const { data, ui } = useOps();
  const [status, setStatus] = useState<"open" | "done">("open");
  const [team, setTeam] = useState<"all" | TeamName>("all");
  const [mine, setMine] = useState(false);
  const rows = data.tasks.filter(t => t.status === status && (team === "all" || t.team === team) && (!mine || t.ownerId === ui.viewAs))
    .sort((a, b) => (a.due < b.due ? -1 : 1));
  const open = data.tasks.filter(t => t.status === "open");
  const reset = () => { setTeam("all"); setMine(false); setStatus("open"); };
  return (
    <Page>
      <PageHead title="Tasks" sub="Every task has an owner, a due time, a priority, a team and a related record. Completing one updates the record and Activity."
        right={<><Btn kind={mine ? "primary" : "secondary"} onClick={() => setMine(m => !m)}>Mine ({personName(ui.viewAs)})</Btn><Btn kind="primary" icon={ICON.plus} onClick={() => ops.openModal("task")}>New task</Btn></>} />
      <div className="ops-stats" style={{ marginBottom: 14 }}>
        <Stat k="Open" v={open.length} />
        <Stat k="Overdue" v={open.filter(t => ms(t.due) < ms(SCENARIO_NOW)).length} tone="bad" />
        <Stat k="High priority" v={open.filter(t => t.priority === "High").length} tone="warn" />
        <Stat k="Created by agents" v={open.filter(t => AGENTS.some(a => a.name === t.source)).length} s="Local tasks only; no commitments changed" />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Chips label="Status" value={status} onChange={setStatus} options={[{ id: "open", label: "Open", n: open.length }, { id: "done", label: "Done", n: data.tasks.length - open.length }]} />
        <Chips label="Team" value={team} onChange={setTeam} options={[{ id: "all", label: "All teams" }, ...(["Office", "Field glazing", "Workshop", "Specialist studio"] as TeamName[]).map(t => ({ id: t, label: t }))]} />
      </div>
      <Card body={false}>
        <Table<Task> caption="Tasks" rows={rows} rowKey={t => t.id} onRow={t => ops.open(t.ref)}
          empty={<Empty text="No tasks match these filters." action={<Btn onClick={reset}>Reset filters</Btn>} />}
          cols={[
            { key: "t", label: "Task", sort: t => t.title, render: t => <div><div className="strong">{t.title}</div><div className="ops-note">From {t.source}</div></div> },
            { key: "o", label: "Owner", sort: t => personName(t.ownerId), render: t => personName(t.ownerId) },
            { key: "d", label: "Due", sort: t => t.due, render: t => <span>{fmtDateTime(t.due)}{t.status === "open" && ms(t.due) < ms(SCENARIO_NOW) ? <div><Badge tone="bad">Overdue</Badge></div> : null}</span> },
            { key: "p", label: "Priority", sort: t => ["High", "Medium", "Low"].indexOf(t.priority), render: t => <Badge tone={t.priority === "High" ? "warn" : "neutral"} icon={false}>{t.priority}</Badge> },
            { key: "tm", label: "Team", render: t => t.team },
            { key: "r", label: "Related", render: t => <RefLink r={t.ref}>{refLabel(data, t.ref)}</RefLink> },
            { key: "a", label: "", render: t => <span onClick={e => e.stopPropagation()}>{t.status === "open" ? <Btn size="sm" icon={ICON.check} onClick={() => ops.setTaskDone(t.id, true)}>Done</Btn> : <Btn size="sm" kind="ghost" onClick={() => ops.setTaskDone(t.id, false)}>Reopen</Btn>}</span> }
          ]} />
      </Card>
    </Page>
  );
}

const KIND_LABEL: Record<Approval["kind"], string> = {
  quote_release: "Quote release", emergency_reschedule: "Emergency reschedule", measurement_correction: "Measurement check", customer_message: "Customer message",
  production_release: "Production release", payment_reminder: "Payment reminder", enquiry_merge: "Enquiry merge"
};

export function ApprovalCard({ a }: { a: Approval }) {
  const { data } = useOps();
  const agent = AGENTS.find(x => x.id === a.agentId);
  const draft = a.ref.type === "draft" ? byId(data.drafts, a.ref.id) : undefined;
  const [body, setBody] = useState(draft?.body || "");
  const j = a.jobId ? getJob(data, a.jobId) : undefined;
  let preview: JSX.Element | null = null;
  if (a.kind === "quote_release") {
    const q = byId(data.quotes, a.ref.id);
    if (q) preview = <div className="ops-note">{q.lines.map(l => l.qty + " x " + l.desc + " @ " + money(l.unitCents)).join("; ")}. Total {money(quoteTotal(q))}. {q.xeroRef}.</div>;
  } else if (a.kind === "emergency_reschedule") {
    const p = data.proposals.find(x => x.approvalId === a.id);
    if (p) preview = <><Gates gates={emergencyPreview(data, p).checks} /><div style={{ marginTop: 8 }}><Btn size="sm" kind="ghost" onClick={() => go("Schedule", "emergencies")}>See the full proposal and message</Btn></div></>;
  } else if (a.kind === "measurement_correction" && a.jobId) {
    const revs = revisionsOf(data, a.jobId);
    const cur = revs.find(r => r.status === "submitted");
    const prev = cur ? revs.find(r => r.rev === cur.rev - 1) : undefined;
    if (cur) preview = <div className="ops-note">Rev {cur.rev}: {cur.openings.map(o => "W " + o.widthMm + " x H " + o.heightMm + " mm").join("; ")}{prev ? " (was " + prev.openings.map(o => "W " + o.widthMm + " x H " + o.heightMm + " mm").join("; ") + ")" : ""}. Measured by {personName(cur.measuredBy)}; independent check by {personName(a.approverId)}.</div>;
  } else if (a.kind === "production_release" && j) {
    preview = <Gates gates={releaseGates(data, j)} />;
  } else if (a.kind === "enquiry_merge") {
    const it = data.interactions.find(x => x.dedupeJobId === a.jobId && x.status === "new");
    preview = <div className="ops-note">{it ? it.channel + " at " + it.at.slice(11) + ": " + it.summary + " " + (it.dedupeReason || "") : "Nothing left to merge."}</div>;
  }
  const blocked = a.kind === "production_release" && j ? !releaseGates(data, j).every(g => g.ok) : a.kind === "emergency_reschedule" ? !emergencyPreview(data, data.proposals.find(x => x.approvalId === a.id)!).ok : false;
  return (
    <Card title={a.title} sub={KIND_LABEL[a.kind]} right={a.status === "pending" ? <Badge tone="warn">Waiting for {personName(a.approverId)}</Badge> : <Badge tone={a.status === "approved" ? "ok" : "neutral"}>{a.status === "approved" ? "Approved" : "Rejected"}{a.decidedBy ? " by " + personName(a.decidedBy) : ""}</Badge>}>
      <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>{a.detail}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8, fontSize: 12, color: "var(--dim)" }}>
        <span>Requested by {a.requestedBy}{agent ? " (agent, demo simulation)" : ""}</span><span>·</span><span>{fmtDateTime(a.createdAt)}</span>
        {j && <><span>·</span><RefLink r={{ type: "job", id: j.id }}>{j.id} {customerOf(data, j).name}</RefLink></>}
      </div>
      {preview && <div style={{ marginTop: 12 }}>{preview}</div>}
      {draft && (
        <div style={{ marginTop: 12 }}>
          <div className="ops-note" style={{ marginBottom: 6 }}>{draft.channel} to {customerOf(data, getJob(data, draft.jobId)!).name}: {draft.subject}</div>
          {draft.status === "draft" && a.status === "pending" ? (
            <>
              <textarea className="ops-input" rows={3} value={body} onChange={e => setBody(e.target.value)} aria-label={"Draft: " + draft.subject} />
              {body !== draft.body && <div style={{ marginTop: 6 }}><Btn size="sm" onClick={() => ops.editDraft(draft.id, body)}>Save wording</Btn></div>}
            </>
          ) : <Callout tone={draft.status === "sent_demo" ? "ok" : "neutral"}>{draft.status === "sent_demo" ? "Marked sent in demo, not delivered. " : draft.status === "discarded" ? "Discarded. " : ""}{draft.body}</Callout>}
        </div>
      )}
      {a.outcome && <div className="ops-note" style={{ marginTop: 8 }}>Note: {a.outcome}</div>}
      {a.status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <Btn kind="primary" disabled={blocked} onClick={() => { if (draft && body !== draft.body) ops.editDraft(draft.id, body); ops.decide(a.id, true); }} title={blocked ? "Checks or gates not met" : undefined}>
            {a.kind === "customer_message" || a.kind === "payment_reminder" ? "Approve (mark sent in demo)" : a.kind === "measurement_correction" ? "Approve as " + personName(a.approverId) : "Approve"}
          </Btn>
          <Btn kind="danger" onClick={() => ops.openModal("reject", a.id)}>Reject</Btn>
          {blocked && <span className="ops-note" style={{ alignSelf: "center" }}>Cannot approve until the checks above pass.</span>}
        </div>
      )}
    </Card>
  );
}

function Approvals() {
  const { data } = useOps();
  const [view, setView] = useState<"pending" | "decided">("pending");
  const [kind, setKind] = useState<"all" | Approval["kind"]>("all");
  const list = data.approvals.filter(a => (view === "pending" ? a.status === "pending" : a.status !== "pending") && (kind === "all" || a.kind === kind))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const kinds = Array.from(new Set(data.approvals.map(a => a.kind)));
  return (
    <Page>
      <PageHead title="Approvals" sub="Quote releases, emergency reschedules, measurement corrections, production releases and customer messages. Agents propose; people decide." right={<DemoPill>Simulation mode</DemoPill>} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Chips label="Status" value={view} onChange={setView} options={[{ id: "pending", label: "Awaiting decision", n: data.approvals.filter(a => a.status === "pending").length }, { id: "decided", label: "Decided", n: data.approvals.filter(a => a.status !== "pending").length }]} />
        <Chips label="Type" value={kind} onChange={setKind} options={[{ id: "all", label: "All types" } as { id: typeof kind; label: string }].concat(kinds.map(k => ({ id: k, label: KIND_LABEL[k] })))} />
      </div>
      <div className="ops-grid">
        {list.map(a => <div key={a.id} className="ops-span-6"><ApprovalCard a={a} /></div>)}
        {!list.length && <div className="ops-span-12"><Card><Empty text={view === "pending" ? "Nothing waiting for a decision." : "No decisions yet."} action={kind !== "all" ? <Btn onClick={() => setKind("all")}>Show all types</Btn> : undefined} /></Card></div>}
      </div>
    </Page>
  );
}

const STEPS = [
  { id: "enquiry", label: "Enquiry logged", owner: "Office coordinator", gate: "Owner and next action set" },
  { id: "measure", label: "Measured", owner: "Field (surveyor)", gate: "Required fields submitted for this service" },
  { id: "check", label: "Specification checked", owner: "Independent reviewer", gate: "Current revision approved by someone other than the measurer" },
  { id: "quote", label: "Quote sent", owner: "Danielle", gate: "Quote approved; no quality hold" },
  { id: "deposit", label: "Accepted, 50% deposit", owner: "Office", gate: "Deposit allocated against the accepted total" },
  { id: "release", label: "Released", owner: "Danielle approves; Mark's workshop", gate: "Quote accepted + deposit + approved revision" },
  { id: "made", label: "Made or received", owner: "Workshop / supplier", gate: "Workshop tasks done, or supplier acknowledged and received" },
  { id: "qc", label: "Quality checked", owner: "Mark Doyle", gate: "QC complete; storage location recorded" },
  { id: "fit", label: "Fitted", owner: "Field crew", gate: "Fitting checklist and office completion record" },
  { id: "paid", label: "Balance paid", owner: "Office", gate: "Balance can stay outstanding after completion" }
];

function stepState(data: ReturnType<typeof useOps>["data"], j: Job): { done: boolean; blocker?: string }[] {
  const rev = currentRevision(data, j.id);
  const q = quoteOf(data, j.id);
  const dep = depositStatus(data, j);
  const sos = data.supplierOrders.filter(s => s.jobId === j.id);
  const tasks = data.workshopTasks.filter(t => t.jobId === j.id);
  const inv = invoiceOf(data, j.id);
  const order = ["awaiting_measure", "awaiting_quote", "awaiting_deposit", "production", "ready_to_fit", "completed"];
  const at = order.indexOf(j.stage);
  const made = j.stage === "ready_to_fit" || j.stage === "completed" || (j.prodState === "in_progress" && tasks.length > 0 && tasks.every(t => t.status === "done") && sos.every(s => s.received));
  return [
    { done: true },
    { done: !!rev, blocker: rev ? undefined : j.nextAction },
    { done: !!rev && rev.status === "approved" && !rev.specialistReview, blocker: rev && rev.status === "submitted" ? "Awaiting check by " + personName(rev.reviewerId) : rev?.status === "rejected" ? "Revision rejected: remeasure" : undefined },
    { done: !!q && (q.status === "sent" || q.status === "accepted"), blocker: q && q.status !== "sent" && q.status !== "accepted" ? (j.qualityHold ? "Quality hold" : "Quote " + q.status.replace(/_/g, " ")) : undefined },
    { done: at >= 3, blocker: at === 2 ? "Deposit " + money(dep.allocated) + " of " + money(dep.required) : undefined },
    { done: !!j.releasedAt || at >= 4, blocker: j.prodState === "waiting_release" ? releaseGates(data, j).filter(g => !g.ok).map(g => g.label).join(", ") || "Waiting for Danielle's release" : undefined },
    { done: made, blocker: j.prodState === "in_progress" ? [tasks.filter(t => t.status !== "done").map(t => t.step).join(", "), sos.filter(s => !s.received).map(s => s.id + (s.acknowledged ? " in transit" : " not acknowledged")).join(", ")].filter(Boolean).join("; ") : undefined },
    { done: at >= 4, blocker: j.prodState === "in_progress" && made ? "QC" : undefined },
    { done: at >= 5, blocker: at === 4 ? (data.visits.some(v => v.jobId === j.id && v.kind === "fit" && v.status === "booked") ? "Fitting booked" : "Fitting not scheduled") : undefined },
    { done: at >= 5 && (!inv || invoiceStatus(data, inv).outstanding === 0), blocker: at >= 5 && inv && invoiceStatus(data, inv).outstanding ? money(invoiceStatus(data, inv).outstanding) + " outstanding" : undefined }
  ];
}

function Workflows() {
  const { data } = useOps();
  const [jobId, setJobId] = useState("RG-2605");
  const j = getJob(data, jobId)!;
  const states = stepState(data, j);
  const firstOpen = states.findIndex(s => !s.done);
  const counts = STEPS.map((_, i) => data.jobs.filter(x => x.stage !== "completed" && stepState(data, x).findIndex(s => !s.done) === i).length);
  return (
    <Page>
      <PageHead title="Enquiry to fit" sub="The workflow every job follows, with the gate that blocks each step and who owns it. Pick a job to see exactly where it is stuck." right={<DemoPill />} />
      <div className="ops-grid">
        <Card className="ops-span-5" title="Where active jobs are waiting" sub="First unfinished step">
          {STEPS.map((s, i) => (
            <div key={s.id} className="ops-row">
              <span style={{ width: 22, height: 22, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11, flex: "none" }}>{i + 1}</span>
              <div className="main"><div className="t">{s.label}</div><div className="m">Gate: {s.gate} · Owner: {s.owner}</div></div>
              <Badge tone={counts[i] ? "neutral" : "ok"} icon={false}>{counts[i]} waiting</Badge>
            </div>
          ))}
        </Card>
        <Card className="ops-span-7" title={"Job " + j.id + " · " + customerOf(data, j).name} sub={STAGE_LABEL[j.stage]}
          right={<select className="ops-input" aria-label="Choose job" value={jobId} onChange={e => setJobId(e.target.value)} style={{ width: 240 }}>
            {data.jobs.map(x => <option key={x.id} value={x.id}>{x.id} {customerOf(data, x).name}</option>)}
          </select>}>
          {STEPS.map((s, i) => {
            const st = states[i];
            const current = i === firstOpen;
            return (
              <div key={s.id} className="ops-gate" style={{ padding: "8px 0", borderTop: i ? "1px solid var(--border)" : 0 }}>
                <span style={{ color: st.done ? "var(--ok)" : current ? "var(--warn)" : "var(--faint)", marginTop: 1 }}><Icon d={st.done ? ICON.check : current ? ICON.block : ICON.dot} size={16} stroke={2.2} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="gl">{s.label}{current && <span style={{ marginLeft: 8 }}><Badge tone="warn">Blocking here</Badge></span>}</div>
                  <div className="gd">{st.done ? "Done" : current ? (st.blocker || s.gate) + " · Owner: " + s.owner : "Gate: " + s.gate}</div>
                </div>
              </div>
            );
          })}
          {data.supplierOrders.filter(x => x.jobId === j.id).map(so => <div key={so.id} style={{ marginTop: 10 }}><div className="ops-note" style={{ marginBottom: 6 }}>Supplier record {so.id}</div><Gates gates={supplierGates(so)} /></div>)}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn kind="primary" onClick={() => ops.open({ type: "job", id: j.id })}>Open job</Btn>
            {j.nextOwnerId && <span className="ops-note" style={{ alignSelf: "center" }}>Next: {j.nextAction} ({personName(j.nextOwnerId)}, {fmtDateTime(j.nextDue)})</span>}
          </div>
        </Card>
      </div>
    </Page>
  );
}

export { PEOPLE };
