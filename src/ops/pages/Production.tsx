import { useState } from "react";
import type { PersonId, SupplierOrder, WorkshopTask } from "../types";
import { ops, useOps } from "../store";
import {
  ackOverdueHours, brandMatch, customerOf, depositStatus, getJob, paymentsFor, personName, releaseGates, supplierGates, supplierName, byId
} from "../selectors";
import { fmtDate, fmtDateTime, money, workingDaysBetween, ms, SCENARIO_NOW } from "../time";
import { Badge, BrandBadge, Btn, Callout, Card, Chips, DemoPill, Empty, Gates, HealthBadge, Page, PageHead, RefLink, Stat, Table } from "../ui";
import { jobHealth } from "../selectors";

export default function Production({ tab }: { tab: string }) {
  if (tab === "workshop") return <Workshop />;
  if (tab === "suppliers") return <SupplierOrders />;
  if (tab === "ready") return <ReadyToFit />;
  return <Queue />;
}

function Queue() {
  const { data, ui } = useOps();
  const jobs = data.jobs.filter(j => j.stage === "production" && brandMatch(ui.brand, j.brand));
  const waiting = jobs.filter(j => j.prodState === "waiting_release");
  const inProg = jobs.filter(j => j.prodState === "in_progress");
  return (
    <Page>
      <PageHead title="Production queue" sub="A job is released only when the quote is accepted, a 50% deposit is allocated and the current measurement revision is approved. Release creates workshop work; it does not mean the glass is made." right={<DemoPill />} />
      <div className="ops-stats" style={{ marginBottom: 16 }}>
        <Stat k="Waiting release" v={waiting.length} tone={waiting.some(j => jobHealth(data, j).tone === "bad") ? "bad" : "warn"} />
        <Stat k="Paid, gates clear, not released" v={waiting.filter(j => releaseGates(data, j).every(g => g.ok)).length} s="Office sign-off is the only blocker" />
        <Stat k="In progress" v={inProg.length} s={inProg.filter(j => j.fulfilment === "supplier").length + " supplier route"} />
        <Stat k="Deposits held on waiting jobs" v={money(waiting.reduce((n, j) => n + depositStatus(data, j).allocated, 0))} s="Allocated, not yet in production" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {waiting.length ? waiting.map(j => {
          const gates = releaseGates(data, j);
          const ok = gates.every(g => g.ok);
          const dep = depositStatus(data, j);
          const paid = paymentsFor(data, j.id).map(p => p.at).sort()[0];
          const po = data.productionOrders.find(p => p.jobId === j.id && p.status === "waiting_release");
          return (
            <Card key={j.id} title={<span><RefLink r={{ type: "job", id: j.id }}>{j.id}</RefLink> {customerOf(data, j).name}</span>} sub={j.title}
              right={<><BrandBadge brand={j.brand} /><HealthBadge h={jobHealth(data, j)} /></>}>
              <div className="ops-grid">
                <div className="ops-span-7"><Gates gates={gates} /></div>
                <div className="ops-span-5">
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--body)" }}>
                    <div>Order {money(dep.total)} · deposit {money(dep.allocated)} {paid ? "since " + fmtDate(paid) + " (" + workingDaysBetween(paid) + " working days)" : ""}</div>
                    <div>{po?.id} · {j.fulfilment === "supplier" ? "Supplier route" : "In-house workshop"} · workshop owner {personName(po?.ownerId || "mark")}</div>
                    <div>Release approver: Danielle</div>
                    {po?.blocker && <div className="ops-note" style={{ marginTop: 4 }}>{po.blocker}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <Btn kind="primary" disabled={!ok} onClick={() => ops.releaseProduction(j.id)} title={ok ? "Release to workshop" : "Gates not met"}>Release to workshop</Btn>
                    {dep.unmatched[0] && <Btn onClick={() => ops.openModal("allocate", dep.unmatched[0].id)}>Allocate {dep.unmatched[0].externalRef}</Btn>}
                    {ok && <Btn kind="ghost" onClick={() => ops.openModal("reject", data.approvals.find(a => a.status === "pending" && a.kind === "production_release" && a.jobId === j.id)?.id || "")} disabled={!data.approvals.some(a => a.status === "pending" && a.kind === "production_release" && a.jobId === j.id)}>Hold</Btn>}
                  </div>
                </div>
              </div>
            </Card>
          );
        }) : <Card><Empty text="Nothing waiting for release." /></Card>}
      </div>
      <Card title="In progress" style={{ marginTop: 16 }} body={false}>
        <Table caption="In progress" rows={inProg} rowKey={j => j.id} onRow={j => ops.open({ type: "job", id: j.id })} empty={<Empty text="Nothing in progress." />}
          cols={[
            { key: "j", label: "Job", render: j => <span className="strong">{j.id} {customerOf(data, j).name}</span> },
            { key: "r", label: "Route", render: j => j.fulfilment === "supplier" ? "Supplier" : "In-house" + (data.supplierOrders.some(s => s.jobId === j.id && !s.qc) ? " + supplier part" : "") },
            { key: "rel", label: "Released", render: j => j.releasedAt ? fmtDate(j.releasedAt) : "" },
            { key: "s", label: "Progress", render: j => {
              const t = data.workshopTasks.filter(x => x.jobId === j.id);
              const so = data.supplierOrders.filter(x => x.jobId === j.id);
              return <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{t.map(x => <Badge key={x.id} tone={x.status === "done" ? "ok" : x.status === "doing" ? "accent" : "neutral"}>{x.step}</Badge>)}{so.map(x => <Badge key={x.id} tone={x.qc ? "ok" : x.acknowledged ? "warn" : "bad"}>{x.id} {x.qc ? "checked" : x.received ? "received" : x.acknowledged ? "due " + fmtDate(x.expected) : "no ack"}</Badge>)}</span>;
            } },
            { key: "h", label: "Health", render: j => <HealthBadge h={jobHealth(data, j)} reason /> }
          ]} />
      </Card>
    </Page>
  );
}

const STEPS: WorkshopTask["step"][] = ["cut", "assemble", "qc"];
const STEP_LABEL = { cut: "Cut", assemble: "Assemble", qc: "Quality check" };

function Workshop() {
  const { data, ui } = useOps();
  const [who, setWho] = useState<"all" | PersonId>(ui.viewAs === "mark" || ui.viewAs === "liam" ? ui.viewAs : "all");
  const tasks = data.workshopTasks.filter(t => brandMatch(ui.brand, getJob(data, t.jobId)!.brand) && (who === "all" || t.ownerId === who));
  const open = tasks.filter(t => t.status !== "done");
  return (
    <Page>
      <PageHead title="Workshop" sub="Cut, assemble and quality check at Robinhood, each with an owner and a due date. Finishing QC moves the job to Ready to fit."
        right={<Chips label="Owner" value={who} onChange={setWho} options={[{ id: "all", label: "Everyone" }, { id: "mark", label: "Mark Doyle" }, { id: "liam", label: "Liam Walsh" }]} />} />
      {(ui.viewAs === "mark" || ui.viewAs === "liam") && <div style={{ marginBottom: 12 }}><Callout>Previewing {personName(ui.viewAs)}'s queue. Frontend preview only; not access control.</Callout></div>}
      <div className="ops-kanban" style={{ gridTemplateColumns: "repeat(3,minmax(240px,1fr))" }}>
        {STEPS.map(step => {
          const list = open.filter(t => t.step === step).sort((a, b) => (a.due < b.due ? -1 : 1));
          return (
            <section key={step} className="ops-col" aria-label={STEP_LABEL[step]}>
              <div className="ops-col-head">{STEP_LABEL[step]}<span className="n">{list.length}</span></div>
              {list.length ? list.map(t => {
                const j = getJob(data, t.jobId)!;
                const late = ms(t.due) < ms(SCENARIO_NOW);
                return (
                  <div key={t.id} className="ops-jobcard" style={{ cursor: "default" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}><RefLink r={{ type: "job", id: j.id }}>{j.id}</RefLink><BrandBadge brand={j.brand} /></div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{customerOf(data, j).name}</div>
                    <div className="ops-note">{j.title}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                      <Badge tone={t.status === "doing" ? "accent" : "neutral"} icon={false}>{t.status === "doing" ? "In progress" : "To do"}</Badge>
                      {late ? <Badge tone="bad">Overdue</Badge> : null}
                      <span className="ops-note">{personName(t.ownerId)} · due {fmtDateTime(t.due)}</span>
                    </div>
                    <div style={{ marginTop: 8 }}><Btn size="sm" kind="primary" onClick={() => ops.advanceWorkshopTask(t.id)}>{t.status === "todo" ? "Start" : "Mark done"}</Btn></div>
                  </div>
                );
              }) : <div className="ops-note" style={{ padding: 6 }}>Clear.</div>}
            </section>
          );
        })}
      </div>
      <Card title="Recently completed" style={{ marginTop: 16 }}>
        {tasks.filter(t => t.status === "done").slice(-6).reverse().map(t => <div key={t.id} className="ops-row"><div className="main"><div className="t">{STEP_LABEL[t.step]} · {t.jobId} {customerOf(data, getJob(data, t.jobId)!).name}</div><div className="m">{personName(t.ownerId)}</div></div><Badge tone="ok">Done</Badge></div>)}
        {!tasks.some(t => t.status === "done") && <Empty text="Nothing completed for this filter." action={<Btn onClick={() => setWho("all")}>Show everyone</Btn>} />}
      </Card>
      <div className="ops-note" style={{ marginTop: 10 }}>No cutting optimisation or stock control: this is a work queue, not a warehouse system.</div>
    </Page>
  );
}

function SupplierOrders() {
  const { data, ui } = useOps();
  const rows = data.supplierOrders.filter(s => brandMatch(ui.brand, getJob(data, s.jobId)!.brand)).sort((a, b) => (a.orderedAt < b.orderedAt ? 1 : -1));
  const missing = rows.filter(s => !s.acknowledged && ackOverdueHours(s) >= 24);
  const [ref, setRef] = useState<Record<string, string>>({});
  return (
    <Page>
      <PageHead title="Supplier orders" sub="Specialist items such as toughened or bevelled glass are ordered out. They share the job ID but have their own record: acknowledgement, receipt and quality check." right={<DemoPill>Fictional suppliers</DemoPill>} />
      {missing.map(s => <div key={s.id} style={{ marginBottom: 10 }}><Callout tone="bad">{s.id} to {supplierName(s.supplierId)} has no acknowledgement after {ackOverdueHours(s)} hours. Job <button type="button" className="ops-link" onClick={() => ops.open({ type: "job", id: s.jobId })}>{s.jobId}</button> cannot be promised a fitting date.</Callout></div>)}
      <div className="ops-grid">
        {rows.map(s => {
          const j = getJob(data, s.jobId)!;
          return (
            <Card key={s.id} className="ops-span-6" title={s.id + " · " + supplierName(s.supplierId)} sub={"Ref " + s.supplierRef}
              right={s.qc ? <Badge tone="ok">Checked</Badge> : s.received ? <Badge tone="warn">Received, QC due</Badge> : s.acknowledged ? <Badge tone="warn">Due {fmtDate(s.expected)}</Badge> : <Badge tone="bad">No acknowledgement</Badge>}>
              <div style={{ fontSize: 13, color: "var(--body)", marginBottom: 12, lineHeight: 1.6 }}>
                Job <RefLink r={{ type: "job", id: j.id }}>{j.id}</RefLink> {customerOf(data, j).name} · spec rev {s.specRev} · ordered {fmtDateTime(s.orderedAt)} · expected {fmtDate(s.expected)}
                {j.id === "RG-2608" && !s.qc && <div className="ops-note">Final fitting cannot be booked until this unit is received and quality checked.</div>}
              </div>
              <Gates gates={supplierGates(s)} />
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                {!s.acknowledged && <><input className="ops-input" style={{ maxWidth: 180 }} aria-label="Supplier reference" placeholder="Supplier ref" value={ref[s.id] || ""} onChange={e => setRef(r => ({ ...r, [s.id]: e.target.value }))} /><Btn size="sm" kind="primary" onClick={() => ops.supplierStep(s.id, "ack", ref[s.id])}>Record acknowledgement</Btn></>}
                {s.acknowledged && !s.received && <Btn size="sm" kind="primary" onClick={() => ops.supplierStep(s.id, "receive")}>Record receipt</Btn>}
                {s.received && !s.qc && <Btn size="sm" kind="primary" onClick={() => ops.supplierStep(s.id, "qc")}>Record QC pass</Btn>}
                <Btn size="sm" kind="ghost" onClick={() => ops.open({ type: "supplier", id: s.supplierId })}>Supplier record</Btn>
              </div>
            </Card>
          );
        })}
        {!rows.length && <Card className="ops-span-12"><Empty text="No supplier orders for this brand." /></Card>}
      </div>
    </Page>
  );
}

function ReadyToFit() {
  const { data, ui } = useOps();
  const rows = data.jobs.filter(j => j.stage === "ready_to_fit" && brandMatch(ui.brand, j.brand));
  const nearly = data.jobs.filter(j => j.stage === "production" && j.prodState === "in_progress" && brandMatch(ui.brand, j.brand));
  return (
    <Page>
      <PageHead title="Ready to fit" sub="Only jobs with a completed quality check appear here, with where the glass is stored and the team the fitting needs." right={<DemoPill />} />
      <Card body={false}>
        <Table caption="Ready to fit" rows={rows} rowKey={j => j.id} onRow={j => ops.open({ type: "job", id: j.id })} empty={<Empty text="Nothing has passed QC for this brand." />}
          cols={[
            { key: "j", label: "Job", render: j => <div><div className="strong">{j.id} {customerOf(data, j).name}</div><div className="ops-note">{j.title}</div></div> },
            { key: "b", label: "Brand", render: j => <BrandBadge brand={j.brand} /> },
            { key: "q", label: "QC complete", render: j => j.qcAt ? fmtDateTime(j.qcAt) : "" },
            { key: "l", label: "Location", render: j => j.rackLocation || "Not recorded" },
            { key: "t", label: "Team needed", render: j => j.crewSize + " · " + j.visitMins + " min · " + (j.skills.join(", ") || "glazing") },
            { key: "f", label: "Fitting", render: j => {
              const v = data.visits.find(x => x.jobId === j.id && x.kind === "fit" && x.status === "booked");
              return v ? <span>{fmtDate(v.date)} {v.start} · {v.crew.map(personName).join(" + ")}</span> : <Badge tone="warn">Not scheduled</Badge>;
            } },
            { key: "a", label: "", render: j => {
              const v = data.visits.find(x => x.jobId === j.id && x.kind === "fit" && x.status === "booked");
              return <span onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 6 }}>{v ? <><Btn size="sm" onClick={() => ops.openModal("move", v.id)}>Move</Btn><Btn size="sm" kind="primary" onClick={() => ops.openModal("fit-complete", j.id)}>Complete</Btn></> : <Btn size="sm" kind="primary" onClick={() => ops.openModal("book-fit", j.id)}>Schedule fitting</Btn>}</span>;
            } }
          ]} />
      </Card>
      <Card title="Not ready yet" sub="In production; shown so nobody promises a date early" style={{ marginTop: 16 }}>
        {nearly.map(j => {
          const so = data.supplierOrders.find(s => s.jobId === j.id && !s.qc);
          const t = data.workshopTasks.filter(x => x.jobId === j.id && x.status !== "done");
          return <button key={j.id} type="button" className="ops-row" onClick={() => ops.open({ type: "job", id: j.id })}><div className="main"><div className="t">{j.id} {customerOf(data, j).name}</div>
            <div className="m">{[t.length ? "Workshop: " + t.map(x => x.step).join(", ") + " to finish" : "", so ? so.id + " " + (so.received ? "awaiting QC" : "due " + fmtDate(so.expected)) : ""].filter(Boolean).join(" · ")}</div></div><Badge tone="warn">Waiting</Badge></button>;
        })}
        {!nearly.length && <Empty text="Nothing in progress." />}
      </Card>
    </Page>
  );
}

export { byId };
export type { SupplierOrder };
