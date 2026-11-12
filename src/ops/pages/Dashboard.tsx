import { useState, type ReactNode } from "react";
import type { Job } from "../types";
import { ops, useOps } from "../store";
import { CONTACT_SAMPLE, quoteTotal, BRANDS } from "../fixtures";
import {
  ACTIVE_STAGES, STAGE_LABEL, activeJobs, brandMatch, customerOf, getJob, invoiceStatus, jobHealth, ledgerTotals, preInvoiceDeposits,
  quoteOf, stageAgeDays, personName, QUOTE_STATUS
} from "../selectors";
import { calendarDays, fmtShortDate, money, workingDaysBetween, ms, SCENARIO_NOW } from "../time";
import { Badge, Bars, Btn, Card, DemoPill, Empty, HealthBadge, Page, Table } from "../ui";

export default function Dashboard({ tab }: { tab: string }) {
  if (tab === "enquiries") return <EnquiryDash />;
  if (tab === "delivery") return <Delivery />;
  if (tab === "cash") return <Cash />;
  return <Business />;
}

function Meta({ n, unit, range, note }: { n: number; unit: string; range: string; note?: string }) {
  return <div className="ops-note" style={{ marginTop: 10 }}>Sample: n = {n} {unit} · {range}{note ? " · " + note : ""}</div>;
}

function JobRows({ jobs, title, onClear }: { jobs: Job[]; title: string; onClear: () => void }) {
  const { data } = useOps();
  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 13, fontWeight: 600 }}>{title}</strong><span className="ops-note">{jobs.length} rows</span>
        <span style={{ marginLeft: "auto" }}><Btn size="sm" kind="ghost" onClick={onClear}>Clear</Btn></span>
      </div>
      <Table caption={title} rows={jobs} rowKey={j => j.id} onRow={j => ops.open({ type: "job", id: j.id })} empty={<Empty text="No matching jobs." />}
        cols={[
          { key: "j", label: "Job", render: j => <span className="strong">{j.id} {customerOf(data, j).name}</span> },
          { key: "s", label: "Stage", render: j => STAGE_LABEL[j.stage] },
          { key: "h", label: "Health", render: j => <HealthBadge h={jobHealth(data, j)} reason /> },
          { key: "o", label: "Next owner", render: j => personName(j.nextOwnerId) },
          { key: "a", label: "Days in stage", num: true, render: j => stageAgeDays(j, data) }
        ]} />
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <Page><div className="ops-grid">{children}</div></Page>;
}

function Business() {
  const { data, ui } = useOps();
  const act = activeJobs(data, ui.brand);
  const [pick, setPick] = useState<{ kind: string; id: string } | null>(null);
  const toggle = (kind: string) => (id: string) => setPick(p => (p && p.kind === kind && p.id === id ? null : { kind, id }));
  const health = (s: string, tone: string) => act.filter(j => j.stage === s && jobHealth(data, j).tone === tone).length;
  const services = Array.from(new Set(act.map(j => j.service))).map(sv => ({ id: sv, label: sv, value: act.filter(j => j.service === sv).length }))
    .sort((a, b) => b.value - a.value);
  const aging = ACTIVE_STAGES.map(s => { const xs = act.filter(j => j.stage === s).map(j => stageAgeDays(j, data)); return { id: s, label: STAGE_LABEL[s], value: xs.length ? Math.max(...xs) : 0, display: xs.length ? Math.max(...xs) + " d max" : "none" }; });
  const drill = pick ? act.filter(j => pick.kind === "service" ? j.service === pick.id : pick.kind === "stage" ? j.stage === pick.id : pick.kind === "age" ? j.stage === pick.id : jobHealth(data, j).tone === pick.id) : [];
  const brandLabel = ui.brand === "ALL" ? "All brands" : BRANDS[ui.brand].name;
  return (
    <Grid>
      <Card className="ops-span-7" title="Queue health" sub={brandLabel} right={<DemoPill />}>
        <Table caption="Queue health by stage" rows={ACTIVE_STAGES} rowKey={s => s} onRow={s => toggle("stage")(s)}
          cols={[
            { key: "s", label: "Stage", render: s => <span className="strong">{STAGE_LABEL[s]}</span> },
            { key: "n", label: "Jobs", num: true, render: s => act.filter(j => j.stage === s).length },
            { key: "r", label: "Red", num: true, render: s => health(s, "bad") ? <Badge tone="bad">{health(s, "bad")}</Badge> : "0" },
            { key: "a", label: "Amber", num: true, render: s => health(s, "warn") ? <Badge tone="warn">{health(s, "warn")}</Badge> : "0" },
            { key: "g", label: "Green", num: true, render: s => health(s, "ok") ? <Badge tone="ok">{health(s, "ok")}</Badge> : "0" }
          ]} />
        <div className="ops-note" style={{ marginTop: 8 }}>Total {act.length} active jobs. Red is an overdue commitment or a blocked critical step; amber is a dependency or a due-soon action. Click a stage for its jobs.</div>
        {pick?.kind === "stage" && <JobRows jobs={drill} title={STAGE_LABEL[pick.id as Job["stage"]]} onClear={() => setPick(null)} />}
      </Card>
      <Card className="ops-span-5" title="Service mix" sub="Active jobs by service">
        <Bars data={services} unit="jobs" onPick={toggle("service")} picked={pick?.kind === "service" ? pick.id : null} />
        <Meta n={act.length} unit="active jobs" range="scenario 12 Nov 2026" />
        {pick?.kind === "service" && <JobRows jobs={drill} title={pick.id} onClear={() => setPick(null)} />}
      </Card>
      <Card className="ops-span-12" title="Bottleneck aging" sub="Longest time any job has spent in each stage (calendar days)">
        <Bars data={aging} unit="days" onPick={toggle("age")} picked={pick?.kind === "age" ? pick.id : null} />
        <Meta n={act.length} unit="active jobs" range="ages measured to 12 Nov 2026 09:00" note="measure from enquiry, quote from measurement, production from release" />
        {pick?.kind === "age" && <JobRows jobs={drill.slice().sort((a, b) => stageAgeDays(b, data) - stageAgeDays(a, data))} title={"Aging: " + STAGE_LABEL[pick.id as Job["stage"]]} onClear={() => setPick(null)} />}
      </Card>
    </Grid>
  );
}

function EnquiryDash() {
  const { data, ui } = useOps();
  const rows = CONTACT_SAMPLE;
  const conv = new Map<string, { label: string; n: number }>();
  rows.forEach(r => { const c = conv.get(r.conversation) || { label: r.label, n: 0 }; c.n++; conv.set(r.conversation, c); });
  const [pick, setPick] = useState<{ kind: string; id: string } | null>(null);
  const [all, setAll] = useState(false);
  const toggle = (kind: string) => (id: string) => { setAll(false); setPick(p => (p && p.kind === kind && p.id === id ? null : { kind, id })); };
  const kinds = Array.from(new Set(rows.map(r => r.kind))).map(k => ({ id: k, label: k, value: rows.filter(r => r.kind === k).length })).sort((a, b) => b.value - a.value);
  const repeat = Array.from(conv.entries()).map(([id, c]) => ({ id, label: c.label, value: c.n })).sort((a, b) => b.value - a.value).slice(0, 8);
  const drill = pick ? rows.filter(r => pick.kind === "channel" ? r.channel === pick.id : pick.kind === "kind" ? r.kind === pick.id : r.conversation === pick.id) : [];
  const quotes = data.quotes.filter(q => q.status !== "accepted" && brandMatch(ui.brand, getJob(data, q.jobId)!.brand) && getJob(data, q.jobId)!.stage !== "completed");
  const qAge = quotes.map(q => { const j = getJob(data, q.jobId)!; return { id: q.id, label: q.id + " " + customerOf(data, j).name, value: calendarDays(j.measuredAt || q.createdAt), display: calendarDays(j.measuredAt || q.createdAt) + " d · " + QUOTE_STATUS[q.status] }; })
    .sort((a, b) => b.value - a.value);
  return (
    <Grid>
      <Card className="ops-span-12" title="Contacts are not enquiries" sub="Previous business day, Wed 11 Nov 2026" right={<DemoPill>Fictional sample rows</DemoPill>}>
        <div className="ops-stats">
          <div className="ops-stat"><div className="k">Contact interactions</div><div className="v">{rows.length}</div><div className="s">{rows.filter(r => r.channel === "Phone").length} phone + {rows.filter(r => r.channel === "Email").length} email</div></div>
          <div className="ops-stat"><div className="k">Distinct enquiry conversations</div><div className="v">{conv.size}</div><div className="s">Many contacts are repeat calls and status checks</div></div>
          <div className="ops-stat"><div className="k">Contacts per conversation</div><div className="v">{(rows.length / conv.size).toFixed(1)}</div><div className="s">{rows.length} ÷ {conv.size}</div></div>
          <div className="ops-stat"><div className="k">Status checks</div><div className="v">{rows.filter(r => r.kind === "Status check").length}</div><div className="s">Calls asking "what is happening with my job?"</div></div>
        </div>
        <div className="ops-note" style={{ marginTop: 10 }}>Reported daily volume on the call was about 200 calls and 40 to 60 emails: contact volume, not distinct leads or confirmed jobs. These 250 rows are fictional, sized to that report.</div>
      </Card>
      <Card className="ops-span-4" title="Channel split" sub="Interactions, 11 Nov">
        <Bars data={[{ id: "Phone", label: "Phone", value: rows.filter(r => r.channel === "Phone").length }, { id: "Email", label: "Email", value: rows.filter(r => r.channel === "Email").length }]} unit="contacts" onPick={toggle("channel")} picked={pick?.kind === "channel" ? pick.id : null} />
        <Meta n={rows.length} unit="interactions" range="11 Nov 2026" />
      </Card>
      <Card className="ops-span-4" title="Why they got in touch" sub="Interactions by reason">
        <Bars data={kinds} unit="contacts" onPick={toggle("kind")} picked={pick?.kind === "kind" ? pick.id : null} />
        <Meta n={rows.length} unit="interactions" range="11 Nov 2026" />
      </Card>
      <Card className="ops-span-4" title="Most repeated conversations" sub="Contacts per conversation, top 8">
        <Bars data={repeat} unit="" onPick={toggle("conv")} picked={pick?.kind === "conv" ? pick.id : null} />
        <Meta n={conv.size} unit="conversations" range="11 Nov 2026" />
      </Card>
      {pick && (
        <Card className="ops-span-12" title={"Rows: " + (pick.kind === "conv" ? conv.get(pick.id)?.label : pick.id)} sub={drill.length + " interactions"} right={<Btn size="sm" kind="ghost" onClick={() => setPick(null)}>Clear</Btn>} body={false}>
          <Table caption="Sample rows" rows={all ? drill : drill.slice(0, 15)} rowKey={r => r.id}
            cols={[{ key: "t", label: "Time", render: r => r.at.slice(11) }, { key: "c", label: "Channel", render: r => r.channel }, { key: "v", label: "Conversation", render: r => r.label }, { key: "k", label: "Reason", render: r => r.kind }]} />
          {drill.length > 15 && <div style={{ padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}><span className="ops-note">Showing {all ? drill.length : 15} of {drill.length}</span><Btn size="sm" onClick={() => setAll(a => !a)}>{all ? "Show fewer" : "Show all " + drill.length}</Btn></div>}
        </Card>
      )}
      <Card className="ops-span-12" title="Quote aging" sub="Open quotes, calendar days since measurement">
        <Bars data={qAge} unit="days" onPick={(id) => { const q = data.quotes.find(x => x.id === id)!; ops.open({ type: "job", id: q.jobId }); }} />
        <Meta n={qAge.length} unit="open quotes" range="to 12 Nov 2026" note="click a bar to open the job" />
      </Card>
    </Grid>
  );
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

function Delivery() {
  const { data, ui } = useOps();
  const jobs = data.jobs.filter(j => brandMatch(ui.brand, j.brand));
  const measured = jobs.filter(j => j.measuredAt).map(j => ({ j, d: calendarDays(j.enquiryAt, j.measuredAt) }));
  const waiting = jobs.filter(j => j.stage === "awaiting_measure").map(j => ({ j, d: calendarDays(j.enquiryAt) }));
  const dwell = jobs.filter(j => j.releasedAt && j.qcAt).map(j => ({ j, d: workingDaysBetween(j.releasedAt!, j.qcAt) }));
  const fitted = jobs.filter(j => j.fittedAt);
  const weeks = [["2026-10-19", "2026-10-25"], ["2026-10-26", "2026-11-01"], ["2026-11-02", "2026-11-08"], ["2026-11-09", "2026-11-15"]];
  const through = weeks.map(([a, b]) => ({ id: a, label: "w/c " + fmtShortDate(a), value: fitted.filter(j => j.fittedAt!.slice(0, 10) >= a && j.fittedAt!.slice(0, 10) <= b).length }));
  const [pick, setPick] = useState<string | null>(null);
  const range = (xs: { j: Job }[], key: "enquiryAt" | "measuredAt" | "releasedAt") => xs.length ? fmtShortDate(xs.map(x => x.j[key]!).sort()[0]) + " to " + fmtShortDate(xs.map(x => x.j[key]!).sort().pop()!) : "none";
  return (
    <Grid>
      <Card className="ops-span-6" title="Measuring wait" sub="Calendar days from enquiry to measurement" right={<DemoPill />}>
        <div className="ops-stats" style={{ marginBottom: 12 }}>
          <div className="ops-stat"><div className="k">Median, measured jobs</div><div className="v">{median(measured.map(x => x.d))} d</div><div className="s">n = {measured.length}</div></div>
          <div className="ops-stat"><div className="k">Still waiting now</div><div className="v">{waiting.length}</div><div className="s">longest {Math.max(0, ...waiting.map(x => x.d))} d</div></div>
        </div>
        <Bars data={measured.sort((a, b) => b.d - a.d).slice(0, 10).map(x => ({ id: x.j.id, label: x.j.id + " " + customerOf(data, x.j).name, value: x.d, tone: x.d > 14 ? "var(--bad)" : "var(--slate,#52748A)" }))} unit="d" onPick={id => ops.open({ type: "job", id })} />
        <Meta n={measured.length} unit="measured jobs" range={"enquiries " + range(measured, "enquiryAt")} note="10 longest shown; click to open" />
      </Card>
      <Card className="ops-span-6" title="Production dwell" sub="Working days from release to quality check">
        <div className="ops-stats" style={{ marginBottom: 12 }}>
          <div className="ops-stat"><div className="k">Median dwell</div><div className="v">{median(dwell.map(x => x.d))} wd</div><div className="s">n = {dwell.length}</div></div>
          <div className="ops-stat"><div className="k">Paid, waiting release</div><div className="v">{jobs.filter(j => j.prodState === "waiting_release").length}</div><div className="s">Not counted in dwell until released</div></div>
        </div>
        <Bars data={dwell.sort((a, b) => b.d - a.d).map(x => ({ id: x.j.id, label: x.j.id + " " + customerOf(data, x.j).name, value: x.d }))} unit="wd" onPick={id => ops.open({ type: "job", id })} />
        <Meta n={dwell.length} unit="jobs with release and QC" range={"released " + range(dwell, "releasedAt")} note="reported pattern is 5 to 6 working days, not an SLA" />
      </Card>
      <Card className="ops-span-12" title="Fitting throughput" sub="Fittings completed per week">
        <Bars data={through} unit="fittings" onPick={id => setPick(p => (p === id ? null : id))} picked={pick} />
        <Meta n={fitted.length} unit="completed fittings" range="19 Oct to 15 Nov 2026" note="this week runs to the scenario date" />
        {pick && <JobRows jobs={fitted.filter(j => { const w = weeks.find(x => x[0] === pick)!; return j.fittedAt!.slice(0, 10) >= w[0] && j.fittedAt!.slice(0, 10) <= w[1]; })} title={"Fitted w/c " + fmtShortDate(pick)} onClear={() => setPick(null)} />}
      </Card>
    </Grid>
  );
}

function Cash() {
  const { data, ui } = useOps();
  const L = ledgerTotals(data, ui.brand);
  const inv = data.invoices.filter(i => brandMatch(ui.brand, getJob(data, i.jobId)!.brand));
  const [pick, setPick] = useState<string | null>(null);
  const pre = preInvoiceDeposits(data, ui.brand);
  const openQuotes = data.quotes.filter(q => (q.status === "sent" || q.status === "awaiting_approval" || q.status === "draft") && q.lines.length && brandMatch(ui.brand, getJob(data, q.jobId)!.brand));
  const drill = pick === "invoiced" ? inv : pick === "paid" ? inv.filter(i => invoiceStatus(data, i).paid > 0) : pick === "outstanding" ? inv.filter(i => invoiceStatus(data, i).outstanding > 0) : pick === "overdue" ? inv.filter(i => invoiceStatus(data, i).overdue > 0) : [];
  return (
    <Grid>
      <Card className="ops-span-7" title="Sample ledger" sub={"Gross demo amounts, " + L.count + " invoices"} right={<DemoPill>Xero mock</DemoPill>}>
        <Bars data={[
          { id: "invoiced", label: "Invoiced", value: L.invoiced, display: money(L.invoiced) },
          { id: "paid", label: "Paid", value: L.paid, display: money(L.paid), tone: "var(--ok)" },
          { id: "outstanding", label: "Outstanding", value: L.outstanding, display: money(L.outstanding), tone: "var(--warn)" },
          { id: "overdue", label: "Overdue", value: L.overdue, display: money(L.overdue), tone: "var(--bad)" }
        ]} onPick={id => setPick(p => (p === id ? null : id))} picked={pick} />
        <Meta n={L.count} unit="invoices" range="issued 22 Oct to 30 Oct 2026" note={money(L.invoiced) + " − " + money(L.paid) + " = " + money(L.outstanding)} />
        {pick && (
          <div style={{ marginTop: 12 }}>
            <Table caption="Invoices" rows={drill} rowKey={i => i.id} onRow={i => ops.open({ type: "invoice", id: i.id })} empty={<Empty text="None." />}
              cols={[{ key: "i", label: "Invoice", render: i => i.id }, { key: "c", label: "Customer", render: i => customerOf(data, getJob(data, i.jobId)!).name },
                { key: "t", label: "Invoiced", num: true, render: i => money(i.totalCents) }, { key: "p", label: "Paid", num: true, render: i => money(invoiceStatus(data, i).paid) },
                { key: "o", label: "Outstanding", num: true, render: i => money(invoiceStatus(data, i).outstanding) }]} />
          </div>
        )}
      </Card>
      <Card className="ops-span-5" title="Kept apart from the ledger" sub="So nothing is called revenue or counted twice">
        <div className="ops-stats">
          <button type="button" className="ops-stat" onClick={() => ops.open({ type: "job", id: pre[0]?.jobId || "" })} disabled={!pre.length}><div className="k">Deposits held before invoicing</div><div className="v">{money(pre.reduce((n, p) => n + p.amountCents, 0))}</div><div className="s">{pre.length} payments against accepted quotes</div></button>
          <div className="ops-stat"><div className="k">Open quote value</div><div className="v">{money(openQuotes.reduce((n, q) => n + quoteTotal(q), 0))}</div><div className="s">{openQuotes.length} quotes, not accepted: pipeline, not revenue</div></div>
          <div className="ops-stat"><div className="k">Unmatched card payments</div><div className="v">{money(data.payments.filter(p => p.status === "unmatched").reduce((n, p) => n + p.amountCents, 0))}</div><div className="s">Counted nowhere until allocated</div></div>
        </div>
        <div style={{ marginTop: 12 }}><Btn onClick={() => ops.open({ type: "invoice", id: "INV-503" })}>Open the overdue invoice</Btn></div>
      </Card>
      <Card className="ops-span-12" title="Overdue" sub="Days past due at 12 Nov 2026" body={false}>
        <Table caption="Overdue invoices" rows={inv.filter(i => invoiceStatus(data, i).overdueDays)} rowKey={i => i.id} onRow={i => ops.open({ type: "invoice", id: i.id })} empty={<Empty text="Nothing overdue." />}
          cols={[{ key: "i", label: "Invoice", render: i => i.id }, { key: "c", label: "Customer", render: i => customerOf(data, getJob(data, i.jobId)!).name },
            { key: "d", label: "Due", render: i => i.dueNote }, { key: "od", label: "Days overdue", num: true, render: i => invoiceStatus(data, i).overdueDays },
            { key: "o", label: "Outstanding", num: true, render: i => money(invoiceStatus(data, i).outstanding) },
            { key: "q", label: "Quote", render: i => quoteOf(data, i.jobId)?.id }]} />
      </Card>
    </Grid>
  );
}

export { ms, SCENARIO_NOW };
