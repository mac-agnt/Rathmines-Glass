/* Records client tabs. Records is the operating memory: one canonical copy of
   each customer, job, supplier and person, with read-only relationships. */
import { useState, type ReactNode } from "react";
import { ops, useOps } from "../store";
import { PEOPLE, SUPPLIERS, quoteTotal } from "../fixtures";
import {
  brandMatch, customerOf, customerBalance, getJob, invoiceOf, invoiceStatus, jobHealth, paymentsFor, personName, quoteOf, revisionsOf, siteOf,
  STAGE_LABEL, QUOTE_STATUS, supplierName, refJob
} from "../selectors";
import { fmtDate, fmtDateTime, money } from "../time";
import { Avatar, Badge, BrandBadge, Btn, Card, DemoPill, Empty, HealthBadge, Page, PageHead, Search, Table } from "../ui";
import type { EntityRef } from "../types";

export default function RecordsTabs({ tab }: { tab: string }) {
  if (tab === "jobs") return <JobsChain />;
  if (tab === "suppliers") return <Suppliers />;
  if (tab === "people") return <People />;
  return <Customers />;
}

function Customers() {
  const { data, ui } = useOps();
  const [q, setQ] = useState("");
  const rows = data.customers.filter(c => data.jobs.some(j => j.customerId === c.id && brandMatch(ui.brand, j.brand)))
    .filter(c => !q || (c.name + " " + c.contact + " " + c.kind).toLowerCase().includes(q.toLowerCase()));
  return (
    <Page>
      <PageHead title="Customers" sub="The canonical customer records. Enquiries, Jobs and Finance all open these same entries." right={<><DemoPill /><Search value={q} onChange={setQ} placeholder="Search customers" /></>} />
      <Card body={false}>
        <Table caption="Customers" rows={rows} rowKey={c => c.id} onRow={c => ops.open({ type: "customer", id: c.id })} empty={<Empty text="No match." action={<Btn onClick={() => setQ("")}>Clear</Btn>} />}
          cols={[
            { key: "id", label: "ID", render: c => <span className="ops-note">{c.id}</span> },
            { key: "n", label: "Customer", sort: c => c.name, render: c => <span className="strong">{c.name}</span> },
            { key: "k", label: "Type", sort: c => c.kind, render: c => c.kind },
            { key: "s", label: "Sites", num: true, render: c => c.siteIds.length },
            { key: "j", label: "Jobs", render: c => data.jobs.filter(j => j.customerId === c.id).map(j => j.id).join(", ") },
            { key: "b", label: "Balance", num: true, sort: c => customerBalance(data, c.id), render: c => customerBalance(data, c.id) ? money(customerBalance(data, c.id)) : "None" }
          ]} />
      </Card>
    </Page>
  );
}

function Node({ label, kind, r, children }: { label: string; kind: string; r?: EntityRef; children?: ReactNode }) {
  const inner = (
    <>
      <div style={{ fontSize: 10.5, color: "var(--faint)", fontWeight: 500, letterSpacing: ".04em" }}>{kind}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{label}</div>
      {children && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.4 }}>{children}</div>}
    </>
  );
  const style = { display: "block", minWidth: 150, maxWidth: 220, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-2)", textAlign: "left" as const };
  return r ? <button type="button" onClick={() => ops.open(r)} style={{ ...style, font: "inherit", cursor: "pointer" }}>{inner}</button> : <div style={style}>{inner}</div>;
}
const Arrow = ({ label }: { label: string }) => <div style={{ alignSelf: "center", fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap", padding: "0 2px" }} aria-hidden="true">{label} →</div>;
const Chain = ({ children, title }: { children: ReactNode; title: string }) => (
  <div style={{ marginTop: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", marginBottom: 8 }}>{title}</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }} role="list">{children}</div>
  </div>
);

function JobsChain() {
  const { data, ui } = useOps();
  const jobs = data.jobs.filter(j => brandMatch(ui.brand, j.brand));
  const [id, setId] = useState("RG-2608");
  const j = getJob(data, jobs.some(x => x.id === id) ? id : jobs[0]?.id) || getJob(data, "RG-2608")!;
  const c = customerOf(data, j), s = siteOf(data, j);
  const revs = revisionsOf(data, j.id);
  const q = quoteOf(data, j.id), inv = invoiceOf(data, j.id);
  const pays = paymentsFor(data, j.id);
  const visits = data.visits.filter(v => v.jobId === j.id);
  const pos = data.productionOrders.filter(p => p.jobId === j.id);
  const sos = data.supplierOrders.filter(x => x.jobId === j.id);
  const tasks = data.tasks.filter(t => t.ref.id === j.id || refJob(data, t.ref) === j.id);
  const approvals = data.approvals.filter(a => a.jobId === j.id);
  const events = data.activity.filter(e => e.ref?.id === j.id);
  return (
    <Page>
      <PageHead title="Jobs and their relationships" sub="Read-only view of how one job connects: Customer → Site → Job → Measurement revision → Quote → Invoice → Payment; Job → Visit → Crew; Job → Production order → Supplier."
        right={<select className="ops-input" aria-label="Job" value={j.id} onChange={e => setId(e.target.value)} style={{ width: 260 }}>{jobs.map(x => <option key={x.id} value={x.id}>{x.id} {customerOf(data, x).name}</option>)}</select>} />
      <Card title={j.id + " · " + c.name} sub={STAGE_LABEL[j.stage]} right={<><BrandBadge brand={j.brand} /><HealthBadge h={jobHealth(data, j)} /><Btn size="sm" kind="primary" onClick={() => ops.open({ type: "job", id: j.id })}>Open record</Btn></>}>
        <Chain title="Commercial chain">
          <Node kind="CUSTOMER" label={c.name} r={{ type: "customer", id: c.id }}>{c.kind}</Node><Arrow label="at site" />
          <Node kind="SITE" label={s.locality}>{s.address}</Node><Arrow label="has job" />
          <Node kind="JOB" label={j.id} r={{ type: "job", id: j.id }}>{j.title}</Node><Arrow label="measured as" />
          {revs.length ? revs.slice().reverse().map(r => <Node key={r.id} kind={"MEASUREMENT REV " + r.rev} label={r.status === "submitted" ? "Awaiting check" : r.status}>{r.openings.map(o => "W " + o.widthMm + " x H " + o.heightMm).join("; ")}</Node>) : <Node kind="MEASUREMENT" label="Not yet" />}
          <Arrow label="priced as" />
          {q ? <Node kind="QUOTE" label={q.id} r={{ type: "job", id: j.id }}>{QUOTE_STATUS[q.status]}{q.lines.length ? " · " + money(quoteTotal(q)) : ""}</Node> : <Node kind="QUOTE" label="Not yet" />}
          <Arrow label="invoiced as" />
          {inv ? <Node kind="INVOICE" label={inv.id} r={{ type: "invoice", id: inv.id }}>{money(inv.totalCents)} · {money(invoiceStatus(data, inv).outstanding)} due</Node> : <Node kind="INVOICE" label="Not in sample ledger" />}
          <Arrow label="paid by" />
          {pays.length ? pays.map(p => <Node key={p.id} kind="PAYMENT" label={p.externalRef} r={{ type: "payment", id: p.id }}>{money(p.amountCents)} · {p.source}</Node>) : <Node kind="PAYMENT" label="None allocated" />}
        </Chain>
        <Chain title="Visits and crew">
          <Node kind="JOB" label={j.id} />
          <Arrow label="booked as" />
          {visits.length ? visits.map(v => <Node key={v.id} kind={"VISIT · " + v.kind.toUpperCase()} label={fmtDate(v.date) + " " + v.start}>{v.status} · crew: {v.crew.map(personName).join(", ")}</Node>) : <Node kind="VISIT" label="None" />}
        </Chain>
        <Chain title="Production and suppliers">
          <Node kind="JOB" label={j.id} />
          <Arrow label="made by" />
          {pos.length ? pos.map(p => <Node key={p.id} kind="PRODUCTION ORDER" label={p.id}>{p.route === "supplier" ? "Supplier route" : "In-house"} · {p.status.replace("_", " ")} · spec rev {p.specRev}</Node>) : <Node kind="PRODUCTION ORDER" label="Not created" />}
          {sos.length > 0 && <Arrow label="ordered from" />}
          {sos.map(so => <Node key={so.id} kind={"SUPPLIER ORDER " + so.id} label={supplierName(so.supplierId)} r={{ type: "supplier", id: so.supplierId }}>Ref {so.supplierRef} · spec rev {so.specRev} · {so.qc ? "checked" : so.received ? "received" : so.acknowledged ? "due " + fmtDate(so.expected) : "not acknowledged"}</Node>)}
        </Chain>
        <Chain title="Work and history that points at this job">
          <Node kind="TASKS" label={String(tasks.length)}>{tasks.filter(t => t.status === "open").length} open</Node>
          <Node kind="APPROVALS" label={String(approvals.length)}>{approvals.filter(a => a.status === "pending").length} pending</Node>
          <Node kind="ACTIVITY" label={String(events.length)}>{events.length ? "latest " + fmtDateTime(events[events.length - 1].at) : "none"}</Node>
        </Chain>
        <div className="ops-note" style={{ marginTop: 14 }}>No module keeps its own copy of a job. Every page above reads this one record.</div>
      </Card>
    </Page>
  );
}

function Suppliers() {
  const { data } = useOps();
  return (
    <Page>
      <PageHead title="Suppliers" sub="Fictional supplier records. No real supplier relationship is implied." right={<DemoPill>Fictional</DemoPill>} />
      <div className="ops-grid">
        {SUPPLIERS.map(s => {
          const orders = data.supplierOrders.filter(o => o.supplierId === s.id);
          return (
            <Card key={s.id} className="ops-span-6" title={s.name} sub={s.speciality} right={<Btn size="sm" onClick={() => ops.open({ type: "supplier", id: s.id })}>Open</Btn>}>
              {orders.map(o => (
                <button key={o.id} type="button" className="ops-row" onClick={() => ops.open({ type: "job", id: o.jobId })}>
                  <div className="main"><div className="t">{o.id} · {o.jobId} {customerOf(data, getJob(data, o.jobId)!).name}</div><div className="m">Spec rev {o.specRev} · expected {fmtDate(o.expected)}</div></div>
                  <Badge tone={o.qc ? "ok" : o.acknowledged ? "warn" : "bad"}>{o.qc ? "Checked" : o.received ? "Received" : o.acknowledged ? "Acknowledged" : "No acknowledgement"}</Badge>
                </button>
              ))}
              <div className="ops-note" style={{ marginTop: 8 }}>{s.provenance}</div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

function People() {
  const { data } = useOps();
  return (
    <Page>
      <PageHead title="People" sub="Demonstration users and what each one owns right now." right={<DemoPill>Demonstration users</DemoPill>} />
      <Card body={false}>
        <Table caption="People" rows={PEOPLE} rowKey={p => p.id} onRow={p => ops.open({ type: "person", id: p.id })}
          cols={[
            { key: "n", label: "Person", render: p => <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Avatar initials={p.initials} /><span><span className="strong">{p.name}</span><div className="ops-note">{p.role}</div></span></span> },
            { key: "t", label: "Team", render: p => p.team },
            { key: "j", label: "Next steps owned", num: true, render: p => data.jobs.filter(j => j.stage !== "completed" && j.nextOwnerId === p.id).length },
            { key: "k", label: "Open tasks", num: true, render: p => data.tasks.filter(t => t.status === "open" && t.ownerId === p.id).length },
            { key: "v", label: "Booked visits", num: true, render: p => data.visits.filter(v => v.status === "booked" && v.crew.includes(p.id)).length }
          ]} />
      </Card>
    </Page>
  );
}
