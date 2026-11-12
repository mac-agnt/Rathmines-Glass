import type { Invoice } from "../types";
import { ops, useOps } from "../store";
import { quoteTotal } from "../fixtures";
import {
  brandMatch, customerOf, depositStatus, getJob, invoiceStatus, ledgerTotals, preInvoiceDeposits, quoteOf, releaseGates, STAGE_LABEL, byId
} from "../selectors";
import { fmtDate, fmtDateTime, money } from "../time";
import { Badge, BrandBadge, Btn, Callout, Card, DemoPill, Empty, Page, PageHead, RefLink, Stat, Table } from "../ui";
import { REWORK_ESTIMATE } from "./Jobs";

export default function Finance({ tab }: { tab: string }) {
  if (tab === "deposits") return <Deposits />;
  if (tab === "balances") return <Balances />;
  if (tab === "costs") return <JobCosts />;
  return <Overview />;
}

function Overview() {
  const { data, ui } = useOps();
  const L = ledgerTotals(data, ui.brand);
  const unmatched = data.payments.filter(p => p.status === "unmatched");
  const pre = preInvoiceDeposits(data, ui.brand);
  const lastXero = data.activity.filter(e => e.source === "Simulated Xero sync").pop();
  const lastSquare = data.activity.filter(e => e.source === "Simulated Square import").pop();
  const invoices = data.invoices.filter(i => brandMatch(ui.brand, getJob(data, i.jobId)!.brand));
  const reconciles = L.invoiced - L.paid === L.outstanding;
  return (
    <Page>
      <PageHead title="Finance overview" sub={"Sample ledger of " + L.count + " invoices, gross customer amounts for the demo (not a VAT calculation and not company revenue). Order value, invoice value and payments are kept separate."}
        right={<DemoPill>Xero and Square: simulated</DemoPill>} />
      <div className="ops-stats" style={{ marginBottom: 12 }}>
        <Stat k="Invoiced (sample ledger)" v={money(L.invoiced)} s={L.count + " invoices"} />
        <Stat k="Paid against invoices" v={money(L.paid)} s="Allocated payments only" />
        <Stat k="Outstanding" v={money(L.outstanding)} tone="warn" onClick={() => ops.open({ type: "invoice", id: invoices[0]?.id || "" })} />
        <Stat k="Overdue" v={money(L.overdue)} tone={L.overdue ? "bad" : "ok"} s={L.overdue ? "Past due date" : "Nothing past due"} />
      </div>
      <div className="ops-note" style={{ marginBottom: 16 }}>Check: {money(L.invoiced)} invoiced − {money(L.paid)} paid = {money(L.invoiced - L.paid)} outstanding {reconciles ? "(reconciles)" : "(does not reconcile)"}.</div>
      <div className="ops-grid">
        <Card className="ops-span-6" title="Xero (mock)" sub="Authoritative for quote and invoice references in the demo"
          right={<Btn size="sm" onClick={() => ops.xeroRefresh()}>Run simulated refresh</Btn>}>
          <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>Last simulated refresh: {lastXero ? fmtDateTime(lastXero.at) : "never"}. Read only. Any change would be a reviewed draft; no two-way sync is claimed.</div>
        </Card>
        <Card className="ops-span-6" title="Square (mock)" sub="Card payments mapped to invoices by allocation records"
          right={<Btn size="sm" onClick={() => ops.squareImport()}>Run simulated import</Btn>}>
          <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>{data.payments.filter(p => p.source === "Square").length} card events imported · {unmatched.length} unmatched · last run {lastSquare ? fmtDateTime(lastSquare.at) : "never"}. Re-importing never double-counts a payment.</div>
        </Card>
        <Card className="ops-span-12" title="Reconciliation warnings">
          {unmatched.map(p => (
            <div key={p.id} className="ops-row">
              <div className="main"><div className="t">{p.externalRef} · {money(p.amountCents)} unmatched</div><div className="m">{p.source} {fmtDateTime(p.at)}, reference "{p.payerRef}"{p.suggestedJobId ? ", looks like " + p.suggestedJobId : ""}. Not counted anywhere until allocated.</div></div>
              <Btn size="sm" kind="primary" onClick={() => ops.openModal("allocate", p.id)}>Allocate</Btn>
            </div>
          ))}
          {invoices.filter(i => invoiceStatus(data, i).overdueDays).map(i => (
            <div key={i.id} className="ops-row"><div className="main"><div className="t">{i.id} overdue {invoiceStatus(data, i).overdueDays} days</div><div className="m">{customerOf(data, getJob(data, i.jobId)!).name} · {money(invoiceStatus(data, i).outstanding)}</div></div>
              <Btn size="sm" onClick={() => ops.open({ type: "invoice", id: i.id })}>Open</Btn></div>
          ))}
          {pre.length > 0 && <div className="ops-row"><div className="main"><div className="t">{pre.length} deposits recorded against accepted quotes, not yet invoiced</div>
            <div className="m">{money(pre.reduce((n, p) => n + p.amountCents, 0))} held as pre-invoice deposits. Outside the sample ledger totals above, so nothing is counted twice.</div></div>
            <Btn size="sm" onClick={() => document.getElementById("pre-dep")?.scrollIntoView({ behavior: "smooth" })}>Show</Btn></div>}
          {!unmatched.length && !pre.length && !invoices.some(i => invoiceStatus(data, i).overdueDays) && <Empty text="Ledger reconciles with no warnings." />}
        </Card>
        <Card className="ops-span-12" title="Sample ledger" body={false}>
          <Table<Invoice> caption="Invoices" rows={invoices} rowKey={i => i.id} onRow={i => ops.open({ type: "invoice", id: i.id })}
            cols={[
              { key: "i", label: "Invoice", render: i => <div><div className="strong">{i.id}</div><div className="ops-note">{i.xeroRef}</div></div> },
              { key: "j", label: "Job", render: i => <span><RefLink r={{ type: "job", id: i.jobId }}>{i.jobId}</RefLink> {customerOf(data, getJob(data, i.jobId)!).name}</span> },
              { key: "b", label: "Brand", render: i => <BrandBadge brand={getJob(data, i.jobId)!.brand} /> },
              { key: "t", label: "Invoiced", num: true, sort: i => i.totalCents, render: i => money(i.totalCents) },
              { key: "p", label: "Paid", num: true, render: i => money(invoiceStatus(data, i).paid) },
              { key: "o", label: "Outstanding", num: true, sort: i => invoiceStatus(data, i).outstanding, render: i => money(invoiceStatus(data, i).outstanding) },
              { key: "d", label: "Due", render: i => { const s = invoiceStatus(data, i); return <span>{i.dueNote}{s.overdueDays ? <div><Badge tone="bad">{s.overdueDays} days overdue</Badge></div> : null}</span>; } }
            ]} />
        </Card>
        <Card className="ops-span-12" title="Deposits held before invoicing" sub="Allocated to accepted quotes; deposit invoices not raised in this sample" body={false}>
          <div id="pre-dep" />
          <Table caption="Pre-invoice deposits" rows={pre} rowKey={p => p.id} onRow={p => ops.open({ type: "job", id: p.jobId! })} empty={<Empty text="None." />}
            cols={[
              { key: "r", label: "Payment", render: p => p.source + " " + p.externalRef },
              { key: "j", label: "Job", render: p => <span>{p.jobId} {customerOf(data, getJob(data, p.jobId!)!).name}</span> },
              { key: "q", label: "Against", render: p => p.quoteId },
              { key: "a", label: "Amount", num: true, render: p => money(p.amountCents) },
              { key: "d", label: "Received", render: p => fmtDate(p.at) }
            ]} />
        </Card>
      </div>
    </Page>
  );
}

function Deposits() {
  const { data, ui } = useOps();
  const jobs = data.jobs.filter(j => j.stage !== "completed" && quoteOf(data, j.id)?.status === "accepted" && brandMatch(ui.brand, j.brand));
  const unmatched = data.payments.filter(p => p.status === "unmatched");
  return (
    <Page>
      <PageHead title="Deposits" sub="50% of the approved total is required before production release. Paid percentage is against the order value; release eligibility also needs the other gates." right={<DemoPill />} />
      {unmatched.length > 0 && (
        <Card title="Payments waiting for allocation" style={{ marginBottom: 16 }}>
          {unmatched.map(p => <div key={p.id} className="ops-row"><div className="main"><div className="t">{p.externalRef} · {money(p.amountCents)} · "{p.payerRef}"</div><div className="m">{p.source} {fmtDateTime(p.at)}{p.suggestedJobId ? " · suggested " + p.suggestedJobId : ""}</div></div><Btn size="sm" kind="primary" onClick={() => ops.openModal("allocate", p.id)}>Allocate</Btn></div>)}
        </Card>
      )}
      <Card body={false}>
        <Table caption="Deposits" rows={jobs} rowKey={j => j.id} onRow={j => ops.open({ type: "job", id: j.id })} empty={<Empty text="No accepted orders for this brand." />}
          cols={[
            { key: "j", label: "Job", sort: j => j.id, render: j => <div><div className="strong">{j.id} {customerOf(data, j).name}</div><div className="ops-note">{STAGE_LABEL[j.stage]}{j.prodState === "waiting_release" ? ", waiting release" : ""}</div></div> },
            { key: "v", label: "Order value", num: true, sort: j => depositStatus(data, j).total, render: j => money(depositStatus(data, j).total) },
            { key: "r", label: "Required (50%)", num: true, render: j => money(depositStatus(data, j).required) },
            { key: "a", label: "Allocated", num: true, render: j => money(depositStatus(data, j).allocated) },
            { key: "p", label: "Paid", num: true, sort: j => depositStatus(data, j).pct, render: j => depositStatus(data, j).pct + "%" },
            { key: "e", label: "Release eligibility", render: j => {
              const dep = depositStatus(data, j);
              if (!dep.eligible) return <Badge tone={dep.unmatched.length ? "warn" : "bad"}>{dep.unmatched.length ? "Payment unmatched" : "Deposit not met"}</Badge>;
              if (j.stage !== "production" || j.prodState !== "waiting_release") return <Badge tone="ok">Deposit met</Badge>;
              const g = releaseGates(data, j).filter(x => !x.ok);
              return g.length ? <Badge tone="warn">{g[0].label} pending</Badge> : <Badge tone="ok">Eligible</Badge>;
            } },
            { key: "x", label: "", render: j => j.stage === "awaiting_deposit" ? <span onClick={e => e.stopPropagation()}><Btn size="sm" kind="primary" onClick={() => ops.openModal("deposit", j.id)}>Record deposit</Btn></span> : null }
          ]} />
      </Card>
    </Page>
  );
}

function Balances() {
  const { data, ui } = useOps();
  const rows = data.invoices.filter(i => brandMatch(ui.brand, getJob(data, i.jobId)!.brand)).map(i => ({ i, s: invoiceStatus(data, i), j: getJob(data, i.jobId)! }))
    .filter(r => r.s.outstanding > 0 || data.payments.some(p => p.id === "PAY-BAL-" + r.i.id));
  return (
    <Page>
      <PageHead title="Balances" sub="Outstanding customer balances next to the work they relate to. Reminders are drafts that need office approval and are only ever marked sent in the demo." right={<DemoPill />} />
      <Card body={false}>
        <Table caption="Balances" rows={rows} rowKey={r => r.i.id} onRow={r => ops.open({ type: "invoice", id: r.i.id })} initialSort={{ key: "od", dir: -1 }} empty={<Empty text="No balances for this brand." />}
          cols={[
            { key: "c", label: "Customer", render: r => <div><div className="strong">{customerOf(data, r.j).name}</div><div className="ops-note">{r.j.id} · {STAGE_LABEL[r.j.stage]}</div></div> },
            { key: "i", label: "Invoice", render: r => r.i.id },
            { key: "o", label: "Balance", num: true, sort: r => r.s.outstanding, render: r => r.s.outstanding ? money(r.s.outstanding) : <Badge tone="ok">Paid</Badge> },
            { key: "d", label: "Due", render: r => r.i.dueNote },
            { key: "od", label: "Days overdue", num: true, sort: r => r.s.overdueDays, render: r => r.s.overdueDays ? <Badge tone="bad">{r.s.overdueDays} days</Badge> : <span className="ops-note">Not overdue</span> },
            { key: "rem", label: "Reminder", render: r => {
              const dr = data.drafts.find(d => d.jobId === r.j.id && /balance/i.test(d.subject));
              if (!dr) return <span className="ops-note">None drafted</span>;
              return dr.status === "draft" ? <span onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Btn size="sm" kind="primary" onClick={() => ops.decide(dr.approvalId!, true)}>Approve reminder</Btn><Btn size="sm" kind="ghost" onClick={() => ops.open({ type: "job", id: r.j.id })}>Read</Btn></span>
                : <Badge tone={dr.status === "sent_demo" ? "ok" : "neutral"}>{dr.status === "sent_demo" ? "Marked sent (demo)" : "Withdrawn"}</Badge>;
            } },
            { key: "p", label: "", render: r => r.s.outstanding ? <span onClick={e => e.stopPropagation()}><Btn size="sm" onClick={() => ops.recordBalance(r.i.id)}>Record payment</Btn></span> : null }
          ]} />
      </Card>
      <div className="ops-note" style={{ marginTop: 10 }}>Recording a payment is simulated and idempotent: a second click on a paid invoice records nothing.</div>
    </Page>
  );
}

/* Sample cost estimates for a handful of jobs. Clearly estimates, for showing
   where cost data would sit; not drawn from real accounts. */
const COSTS: Record<string, { material: number; labour: number; subcontract: number; note: string }> = {
  "RG-2605": { material: 1450, labour: 1180, subcontract: 0, note: "Slim units made in-house" },
  "RG-2608": { material: 150, labour: 420, subcontract: 1680, note: "Toughened unit from supplier" },
  "RG-2604": { material: 900, labour: 480, subcontract: 220, note: "Bevelling sent out" },
  "RG-2607": { material: 1300, labour: 760, subcontract: 0, note: "Out-of-hours fitting" },
  "RG-2623": { material: 760, labour: 860, subcontract: 310, note: "One toughened panel ordered out" },
  "RG-2606": { material: 390, labour: 300, subcontract: 0, note: "Not yet ordered; quality hold" }
};

function JobCosts() {
  const { data, ui } = useOps();
  const rows = Object.entries(COSTS).map(([id, c]) => ({ id, c, j: byId(data.jobs, id)! })).filter(r => r.j && brandMatch(ui.brand, r.j.brand));
  return (
    <Page>
      <PageHead title="Job costs" sub="Sample estimated material, labour, subcontract and rework costs for six jobs. Every figure on this page is an estimate for the demo, not an accounting result. No payroll or tax filing." right={<DemoPill>Estimates</DemoPill>} />
      <Callout tone="warn">Estimates only. Rework is shown where a quality hold exists; it is avoidable cost if the hold works, not a realised saving.</Callout>
      <Card body={false} style={{ marginTop: 14 }}>
        <Table caption="Job cost estimates" rows={rows} rowKey={r => r.id} onRow={r => ops.open({ type: "job", id: r.id })}
          cols={[
            { key: "j", label: "Job", render: r => <div><div className="strong">{r.id} {customerOf(data, r.j).name}</div><div className="ops-note">{r.c.note}</div></div> },
            { key: "v", label: "Order or quote value", num: true, render: r => { const q = quoteOf(data, r.id); return q && q.lines.length ? money(quoteTotal(q)) : "Not priced"; } },
            { key: "m", label: "Material (est.)", num: true, render: r => money(r.c.material * 100) },
            { key: "l", label: "Labour (est.)", num: true, render: r => money(r.c.labour * 100) },
            { key: "s", label: "Subcontract (est.)", num: true, render: r => r.c.subcontract ? money(r.c.subcontract * 100) : "None" },
            { key: "rw", label: "Rework at risk (est.)", num: true, render: r => REWORK_ESTIMATE[r.id] ? <Badge tone="warn">{money(REWORK_ESTIMATE[r.id].cents)}</Badge> : "None" },
            { key: "t", label: "Total (est.)", num: true, render: r => money((r.c.material + r.c.labour + r.c.subcontract) * 100) }
          ]} />
      </Card>
    </Page>
  );
}
