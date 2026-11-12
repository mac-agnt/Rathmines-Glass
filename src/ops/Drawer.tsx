/* The canonical record view. Every module opens records here, so a job, a
   customer or a supplier is the same object wherever it is clicked. */
import { useEffect, useRef } from "react";
import type { EntityRef, Job } from "./types";
import { ops, useOps, go } from "./store";
import { PERSON, SUPPLIERS, quoteTotal, BRANDS, CONTACT_SAMPLE } from "./fixtures";
import {
  byId, customerOf, siteOf, getJob, getCustomer, jobHealth, jobValue, quoteOf, invoiceOf, invoiceStatus, depositStatus, revisionsOf,
  currentRevision, releaseGates, supplierGates, supplierName, personName, jobTimeline, openTasksFor, QUOTE_STATUS, refJob, customerBalance, STAGE_LABEL
} from "./selectors";
import { fmtDate, fmtDateTime, money, relAge } from "./time";
import { Badge, BrandBadge, Btn, Callout, Gates, HealthBadge, Icon, ICON, KV, RefLink, Section, StageBadge, Table } from "./ui";

export default function Drawer() {
  const { data, ui } = useOps();
  const ref = useRef<HTMLDivElement>(null);
  const r = ui.drawer;
  useEffect(() => {
    if (!r) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !ui.modal) ops.close(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [r?.type, r?.id, !!ui.modal]);
  if (!r) return null;
  let body: JSX.Element | null = null;
  let resolved: EntityRef = r;
  if (!["customer", "supplier", "person", "invoice", "payment"].includes(r.type)) {
    const jid = refJob(data, r);
    if (jid) resolved = { type: "job", id: jid };
  }
  if (resolved.type === "job") body = <JobView job={getJob(data, resolved.id)!} />;
  else if (resolved.type === "customer") body = <CustomerView id={resolved.id} />;
  else if (resolved.type === "supplier") body = <SupplierView id={resolved.id} />;
  else if (resolved.type === "person") body = <PersonView id={resolved.id} />;
  else if (resolved.type === "invoice") body = <InvoiceView id={resolved.id} />;
  else if (resolved.type === "payment") body = <PaymentView id={resolved.id} />;
  return (
    <>
      <div className="ops-scrim" onClick={() => ops.close()} />
      <aside className="ops-drawer" role="dialog" aria-modal="true" aria-label="Record detail" tabIndex={-1} ref={ref}>
        {body || <div style={{ padding: 20 }}>Record not found.</div>}
      </aside>
    </>
  );
}

function Head({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="ops-drawer-head">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 500 }}>{kicker}</div>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px", marginTop: 3, color: "var(--ink)" }}>{title}</div>
        </div>
        <Btn kind="ghost" size="sm" onClick={() => ops.close()} title="Close (Esc)" icon={ICON.x} />
      </div>
      {children && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{children}</div>}
    </div>
  );
}

function JobView({ job }: { job: Job }) {
  const { data } = useOps();
  const c = customerOf(data, job), s = siteOf(data, job);
  const h = jobHealth(data, job);
  const val = jobValue(data, job);
  const q = quoteOf(data, job.id), inv = invoiceOf(data, job.id);
  const dep = depositStatus(data, job);
  const revs = revisionsOf(data, job.id);
  const cur = currentRevision(data, job.id);
  const po = data.productionOrders.filter(p => p.jobId === job.id);
  const wts = data.workshopTasks.filter(t => t.jobId === job.id);
  const sos = data.supplierOrders.filter(x => x.jobId === job.id);
  const visits = data.visits.filter(v => v.jobId === job.id).sort((a, b) => (a.date + a.start < b.date + b.start ? 1 : -1));
  const tasks = openTasksFor(data, job.id);
  const approvals = data.approvals.filter(a => a.jobId === job.id && a.status === "pending");
  const gates = job.stage === "production" && job.prodState === "waiting_release" ? releaseGates(data, job) : null;
  const unmatched = dep.unmatched[0];
  const bookedFit = visits.find(v => v.kind === "fit" && v.status === "booked");
  const pendingRev = revs.find(r => r.status === "submitted");
  const actions: JSX.Element[] = [];
  if (job.stage === "awaiting_measure") {
    actions.push(<Btn key="m" kind="primary" icon={ICON.ruler} onClick={() => ops.openModal("measure", job.id)}>Submit measurements</Btn>);
    if (!job.emergency) actions.push(<Btn key="b" icon={ICON.clock} onClick={() => ops.openModal("book-measure", job.id)}>Book measure</Btn>);
    if (job.emergency) actions.push(<Btn key="e" onClick={() => { ops.close(); go("Schedule", "emergencies"); }}>Open emergency proposal</Btn>);
  }
  if (job.stage === "awaiting_quote" && q) {
    if (q.status === "measured_awaiting_price" || q.status === "draft") actions.push(<Btn key="q" kind="primary" onClick={() => ops.openModal("quote", q.id)}>{q.lines.length ? "Edit quote" : "Price quote"}</Btn>);
    if (q.status === "draft" && q.lines.length) actions.push(<Btn key="s" onClick={() => ops.submitQuote(q.id)} disabled={!!job.qualityHold}>Submit for approval</Btn>);
    if (q.status === "awaiting_approval") actions.push(<Btn key="a" kind="primary" onClick={() => ops.approveQuote(q.id)} disabled={!!job.qualityHold}>Approve and send (demo)</Btn>);
    if (q.status === "sent") actions.push(<Btn key="ac" kind="primary" onClick={() => ops.acceptQuote(q.id)}>Record acceptance</Btn>);
  }
  if (pendingRev) actions.push(<Btn key="rv" onClick={() => ops.openModal("review", pendingRev.id)}>Independent check</Btn>);
  if (job.stage !== "awaiting_measure" && job.stage !== "completed" && job.stage !== "ready_to_fit") actions.push(<Btn key="rm" icon={ICON.ruler} onClick={() => ops.openModal("measure", job.id)}>Revise measurements</Btn>);
  if (job.stage === "awaiting_deposit") actions.push(<Btn key="d" kind="primary" onClick={() => ops.openModal("deposit", job.id)}>Record deposit</Btn>);
  if (unmatched) actions.push(<Btn key="al" kind="primary" onClick={() => ops.openModal("allocate", unmatched.id)}>Allocate {unmatched.externalRef}</Btn>);
  if (gates) actions.push(<Btn key="r" kind="primary" disabled={!gates.every(g => g.ok)} onClick={() => ops.releaseProduction(job.id)}>Release to workshop</Btn>);
  if (job.stage === "ready_to_fit" && !bookedFit) actions.push(<Btn key="bf" kind="primary" onClick={() => ops.openModal("book-fit", job.id)}>Book fitting</Btn>);
  if (job.stage === "ready_to_fit" && bookedFit) actions.push(<Btn key="cf" kind="primary" onClick={() => ops.openModal("fit-complete", job.id)}>Complete fitting</Btn>);
  if (inv && invoiceStatus(data, inv).outstanding > 0 && job.stage === "completed") actions.push(<Btn key="pb" kind="primary" onClick={() => ops.recordBalance(inv.id)}>Record balance payment (demo)</Btn>);
  actions.push(<Btn key="dr" icon={ICON.mail} onClick={() => ops.openModal("draft", job.id)}>Draft customer update</Btn>);
  actions.push(<Btn key="t" icon={ICON.plus} onClick={() => ops.openModal("task", job.id)}>Add task</Btn>);

  return (
    <>
      <Head kicker={job.id + " · " + job.service} title={c.name}>
        <BrandBadge brand={job.brand} full />
        <StageBadge stage={job.stage} />
        {job.prodState && <Badge tone="neutral" icon={false}>{job.prodState === "waiting_release" ? "Waiting release" : "In progress"}</Badge>}
        {job.emergency && <Badge tone="bad">Emergency</Badge>}
        <HealthBadge h={h} />
      </Head>
      <div className="ops-drawer-body">
        <div className="ops-card" style={{ padding: "14px 16px", background: "var(--surface-2)" }}>
          <KV items={[
            ["Owner", personName(job.ownerId)],
            ["What happens next", <span key="n"><strong style={{ fontWeight: 500 }}>{job.nextAction}</strong><span className="ops-note"> · {personName(job.nextOwnerId)}, {fmtDateTime(job.nextDue)}</span></span>],
            ["What is stopping it", h.tone === "ok" ? "Nothing. " + h.reason : h.reason]
          ]} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>{actions}</div>
        {job.qualityHold && <div style={{ marginTop: 12 }}><Callout tone="warn">Quality hold: {job.qualityHold}</Callout></div>}

        <Section title="Customer and site">
          <KV items={[
            ["Customer", <RefLink key="c" r={{ type: "customer", id: c.id }}>{c.name}</RefLink>],
            ["Contact", c.contact + " · " + c.phone],
            ["Site", s.address + ", " + s.locality],
            ["Access", s.access || "Not recorded"],
            ["Job", job.title],
            ["Enquiry", fmtDateTime(job.enquiryAt) + " (" + relAge(job.enquiryAt) + ")"]
          ]} />
        </Section>

        <Section title="Money">
          <KV items={[
            [val.label, <strong key="v" style={{ fontWeight: 600 }}>{money(val.cents)}</strong>],
            ["Quote", q ? <span key="q">{q.id} · {QUOTE_STATUS[q.status]} · <span className="ops-note">{q.xeroRef}</span></span> : "Not started"],
            ["Deposit (50%)", dep.required ? money(dep.allocated) + " of " + money(dep.required) + (dep.eligible ? " · met" : " · not met") : "Due on acceptance"],
            ["Invoice", inv ? <RefLink key="i" r={{ type: "invoice", id: inv.id }}>{inv.id} · {money(invoiceStatus(data, inv).outstanding)} outstanding</RefLink> : "Not invoiced in this sample"]
          ]} />
          {q && q.lines.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <Table caption="Quote lines" rows={q.lines.map((l, i) => ({ ...l, i }))} rowKey={l => String(l.i)} cols={[
                { key: "d", label: "Line", render: l => l.desc },
                { key: "q", label: "Qty", num: true, render: l => l.qty },
                { key: "u", label: "Unit", num: true, render: l => money(l.unitCents) },
                { key: "t", label: "Total", num: true, render: l => money(l.qty * l.unitCents) }
              ]} />
              <div className="ops-note" style={{ textAlign: "right", marginTop: 6 }}>Total {money(quoteTotal(q))}. Gross demo amounts, not a VAT calculation.</div>
            </div>
          )}
        </Section>

        <Section title="Measurements">
          {cur ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                <Badge tone={cur.status === "approved" ? "ok" : cur.status === "rejected" ? "bad" : "warn"}>Rev {cur.rev} {cur.status === "submitted" ? "awaiting check" : cur.status}</Badge>
                <span className="ops-note">{cur.glassType} · {cur.spec}</span>
              </div>
              <Table caption="Current openings" rows={cur.openings.map((o, i) => ({ ...o, i }))} rowKey={o => String(o.i)} cols={[
                { key: "l", label: "Opening", render: o => <span className="strong">{o.label}</span> },
                { key: "q", label: "Qty", num: true, render: o => o.qty },
                { key: "w", label: "Width (mm)", num: true, render: o => o.widthMm },
                { key: "h", label: "Height (mm)", num: true, render: o => o.heightMm }
              ]} />
              <div className="ops-photos" style={{ marginTop: 10 }}>
                {cur.photos.map((p, i) => <div key={i} className="ops-ph">{p.startsWith("blob:") ? <img src={p} alt={"Site photo " + (i + 1)} /> : p}</div>)}
              </div>
              <div className="ops-note" style={{ marginTop: 8 }}>{cur.access}{cur.ladder ? " · ladder" : ""} · {cur.glaziers} glazier{cur.glaziers > 1 ? "s" : ""}{cur.notes ? " · " + cur.notes : ""}</div>
            </>
          ) : <div className="ops-note">Not measured yet. {job.visitMins} min visit, {job.crewSize} {job.crewSize > 1 ? "people" : "person"}, equipment: {job.equipment.join(", ") || "none listed"}.</div>}
          {revs.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <Table caption="Revision history" rows={revs} rowKey={r => r.id} cols={[
                { key: "r", label: "Rev", render: r => "Rev " + r.rev },
                { key: "d", label: "Dimensions", render: r => r.openings.map(o => "W " + o.widthMm + " x H " + o.heightMm).join("; ") },
                { key: "b", label: "Measured", render: r => personName(r.measuredBy) + ", " + fmtDateTime(r.measuredAt) },
                { key: "s", label: "Status", render: r => <span>{r.status}{r.reviewerId && r.reviewedAt ? " by " + personName(r.reviewerId) : r.reviewerId ? " (check: " + personName(r.reviewerId) + ")" : ""}{r.reason ? <div className="ops-note">{r.reason}</div> : null}</span> }
              ]} />
            </div>
          )}
        </Section>

        {(po.length > 0 || sos.length > 0 || gates) && (
          <Section title="Manufacturing route">
            {gates && <div style={{ marginBottom: 12 }}><Gates gates={gates} /></div>}
            {po.map(p => (
              <div key={p.id} className="ops-note" style={{ marginBottom: 6 }}>
                {p.id} · {p.route === "supplier" ? "Supplier fulfilment" : "In-house workshop"} · {p.status.replace("_", " ")} · spec rev {p.specRev} · owner {personName(p.ownerId)}
                {p.releasedAt ? " · released " + fmtDateTime(p.releasedAt) + " by " + personName(p.releasedBy) : ""}{p.blocker ? " · " + p.blocker : ""}
              </div>
            ))}
            {wts.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 10px" }}>
                {wts.map(t => <Badge key={t.id} tone={t.status === "done" ? "ok" : t.status === "doing" ? "accent" : "neutral"}>{t.step}: {t.status} · {personName(t.ownerId)}</Badge>)}
              </div>
            )}
            {sos.map(so => (
              <div key={so.id} style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}><RefLink r={{ type: "supplier", id: so.supplierId }}>{supplierName(so.supplierId)}</RefLink> · {so.id} · ref {so.supplierRef} · spec rev {so.specRev}</div>
                <Gates gates={supplierGates(so)} />
              </div>
            ))}
          </Section>
        )}

        <Section title="Visits">
          {visits.length ? visits.map(v => (
            <div key={v.id} className="ops-row">
              <div className="main"><div className="t">{v.kind} · {fmtDate(v.date)} {v.start} to {v.end}</div><div className="m">{v.crew.map(personName).join(", ")} · {v.status}{v.note ? " · " + v.note : ""}</div></div>
              {v.status === "booked" && <Btn size="sm" onClick={() => ops.openModal("move", v.id)}>Move</Btn>}
            </div>
          )) : <div className="ops-note">No visits yet.</div>}
        </Section>

        {(job.promises.length > 0 || tasks.length > 0 || approvals.length > 0) && (
          <Section title="Commitments, tasks and approvals">
            {job.promises.map((p, i) => <div key={i} className="ops-row"><div className="main"><div className="t">{p.text}</div><div className="m">Due {fmtDateTime(p.due)}{p.resolved ? " · resolved" : ""}</div></div></div>)}
            {tasks.map(t => <div key={t.id} className="ops-row"><div className="main"><div className="t">{t.title}</div><div className="m">{personName(t.ownerId)} · due {fmtDateTime(t.due)} · {t.priority}</div></div><Btn size="sm" onClick={() => ops.setTaskDone(t.id, true)}>Done</Btn></div>)}
            {approvals.map(a => <div key={a.id} className="ops-row"><div className="main"><div className="t">{a.title}</div><div className="m">Approver {personName(a.approverId)} · requested by {a.requestedBy}</div></div><Btn size="sm" onClick={() => { ops.close(); go("Work", "approvals"); }}>Review</Btn></div>)}
          </Section>
        )}

        <Section title="Timeline">
          <div className="ops-timeline">
            {jobTimeline(data, job.id).map((t, i) => <div key={i} className="ops-tl"><div className="when">{fmtDateTime(t.at)}</div><div><div className="what">{t.text}</div><div className="who">{t.who}</div></div></div>)}
          </div>
        </Section>
      </div>
    </>
  );
}

function CustomerView({ id }: { id: string }) {
  const { data } = useOps();
  const c = getCustomer(data, id)!;
  const jobs = data.jobs.filter(j => j.customerId === id);
  const sites = data.sites.filter(s => s.customerId === id);
  const contacts = data.interactions.filter(i => i.customerId === id || (i.jobId && jobs.some(j => j.id === i.jobId)));
  const callbacks = data.callbacks.filter(cb => cb.customerId === id);
  const sample = CONTACT_SAMPLE.filter(r => jobs.some(j => r.label.includes(j.id)));
  const bal = customerBalance(data, id);
  return (
    <>
      <Head kicker={"Customer · " + c.kind} title={c.name}>{Array.from(new Set(jobs.map(j => j.brand))).map(b => <BrandBadge key={b} brand={b} full />)}</Head>
      <div className="ops-drawer-body">
        <KV items={[["Contact", c.contact], ["Phone", c.phone], ["Email", c.email], ["Outstanding balance", bal ? money(bal) : "None in the sample ledger"]]} />
        <div className="ops-note" style={{ marginTop: 8 }}>Fictional demo customer. Contact details use reserved example values.</div>
        <Section title="Sites">{sites.map(s => <div key={s.id} className="ops-row"><Icon d={ICON.pin} /><div className="main"><div className="t">{s.address}, {s.locality}</div><div className="m">{s.access || "No access notes"}</div></div></div>)}</Section>
        <Section title="Jobs">
          {jobs.map(j => (
            <button key={j.id} type="button" className="ops-row" onClick={() => ops.open({ type: "job", id: j.id })}>
              <div className="main"><div className="t">{j.id} · {j.title}</div><div className="m">{STAGE_LABEL[j.stage]} · next: {j.nextAction}</div></div>
              <HealthBadge h={jobHealth(data, j)} />
            </button>
          ))}
        </Section>
        <Section title="Contact history">
          {callbacks.map(cb => <div key={cb.id} className="ops-row"><Icon d={ICON.phone} /><div className="main"><div className="t">Callback: {cb.reason}</div><div className="m">Due {fmtDateTime(cb.due)} · {cb.status === "done" ? "done: " + cb.outcome : "open"} · {personName(cb.ownerId)}</div></div></div>)}
          {contacts.map(i => <div key={i.id} className="ops-row"><Icon d={i.channel === "Email" ? ICON.mail : i.channel === "Phone" ? ICON.phone : ICON.note} /><div className="main"><div className="t">{i.summary}</div><div className="m">{i.channel} · {fmtDateTime(i.at)} · {i.status.replace("_", " ")}</div></div></div>)}
          {sample.length > 0 && <div className="ops-note" style={{ marginTop: 8 }}>{sample.length} contacts in the 11 Nov sample (fictional rows sized to reported volume).</div>}
          {!callbacks.length && !contacts.length && !sample.length && <div className="ops-note">No contact history in the demo.</div>}
        </Section>
      </div>
    </>
  );
}

function SupplierView({ id }: { id: string }) {
  const { data } = useOps();
  const s = SUPPLIERS.find(x => x.id === id)!;
  const orders = data.supplierOrders.filter(o => o.supplierId === id);
  return (
    <>
      <Head kicker="Supplier" title={s.name}><Badge tone="neutral" icon={false}>Fictional record</Badge></Head>
      <div className="ops-drawer-body">
        <KV items={[["Speciality", s.speciality], ["Contact", s.contact], ["Email", s.email], ["Provenance", s.provenance]]} />
        <Section title="Orders">
          {orders.map(o => (
            <button key={o.id} type="button" className="ops-row" onClick={() => ops.open({ type: "job", id: o.jobId })}>
              <div className="main"><div className="t">{o.id} · {o.jobId} {customerOf(data, getJob(data, o.jobId)!).name}</div>
                <div className="m">Ordered {fmtDate(o.orderedAt)} · expected {fmtDate(o.expected)} · spec rev {o.specRev} · {o.acknowledged ? "acknowledged" : "not acknowledged"} · {o.received ? "received" : "not received"}</div></div>
            </button>
          ))}
        </Section>
      </div>
    </>
  );
}

function PersonView({ id }: { id: string }) {
  const { data } = useOps();
  const p = PERSON[id as keyof typeof PERSON];
  if (!p) return <div style={{ padding: 20 }}>Unknown person.</div>;
  const owned = data.jobs.filter(j => j.stage !== "completed" && (j.ownerId === p.id || j.nextOwnerId === p.id));
  const tasks = data.tasks.filter(t => t.ownerId === p.id && t.status === "open");
  const visits = data.visits.filter(v => v.status === "booked" && v.crew.includes(p.id));
  return (
    <>
      <Head kicker={"Demonstration user · " + p.team} title={p.name}><Badge tone="navy">{p.role}</Badge></Head>
      <div className="ops-drawer-body">
        <KV items={[["Email", p.email], ["Skills", p.skills.join(", ") || "Office"], ["Provenance", p.provenance]]} />
        <Section title={"Jobs where they own the next step (" + owned.length + ")"}>
          {owned.map(j => <button key={j.id} type="button" className="ops-row" onClick={() => ops.open({ type: "job", id: j.id })}><div className="main"><div className="t">{j.id} {customerOf(data, j).name}</div><div className="m">{j.nextAction} · {fmtDateTime(j.nextDue)}</div></div></button>)}
        </Section>
        <Section title={"Open tasks (" + tasks.length + ")"}>{tasks.map(t => <div key={t.id} className="ops-row"><div className="main"><div className="t">{t.title}</div><div className="m">Due {fmtDateTime(t.due)}</div></div></div>)}</Section>
        <Section title={"Booked visits (" + visits.length + ")"}>{visits.map(v => <div key={v.id} className="ops-row"><div className="main"><div className="t">{v.kind} · {v.jobId}</div><div className="m">{fmtDate(v.date)} {v.start} to {v.end}</div></div></div>)}</Section>
      </div>
    </>
  );
}

function InvoiceView({ id }: { id: string }) {
  const { data } = useOps();
  const inv = byId(data.invoices, id)!;
  const s = invoiceStatus(data, inv);
  const j = getJob(data, inv.jobId)!;
  const pays = data.payments.filter(p => p.invoiceId === id);
  return (
    <>
      <Head kicker={"Invoice · " + inv.xeroRef} title={inv.id + " · " + customerOf(data, j).name}>
        <BrandBadge brand={j.brand} full />
        {s.overdueDays ? <Badge tone="bad">{s.overdueDays} days overdue</Badge> : s.outstanding ? <Badge tone="warn">Outstanding</Badge> : <Badge tone="ok">Paid</Badge>}
      </Head>
      <div className="ops-drawer-body">
        <KV items={[["Job", <RefLink key="j" r={{ type: "job", id: j.id }}>{j.id} {j.title}</RefLink>], ["Invoiced", money(inv.totalCents)], ["Paid", money(s.paid)], ["Outstanding", money(s.outstanding)], ["Due", inv.dueNote], ["Issued", fmtDate(inv.issuedAt)]]} />
        <div className="ops-note" style={{ marginTop: 8 }}>Gross customer amounts for this demo, not a VAT calculation. Xero reference is a mock.</div>
        {s.outstanding > 0 && <div style={{ marginTop: 12 }}><Btn kind="primary" onClick={() => ops.recordBalance(inv.id)}>Record balance payment (demo)</Btn></div>}
        <Section title="Allocated payments">
          {pays.map(p => <div key={p.id} className="ops-row"><div className="main"><div className="t">{money(p.amountCents)} · {p.kind}</div><div className="m">{p.source} {p.externalRef} · {fmtDateTime(p.at)}</div></div></div>)}
        </Section>
      </div>
    </>
  );
}

function PaymentView({ id }: { id: string }) {
  const { data } = useOps();
  const p = byId(data.payments, id)!;
  return (
    <>
      <Head kicker={p.source + " event"} title={p.externalRef + " · " + money(p.amountCents)}>
        {p.status === "unmatched" ? <Badge tone="warn">Unmatched, in review</Badge> : <Badge tone="ok">Allocated</Badge>}
      </Head>
      <div className="ops-drawer-body">
        <KV items={[["Received", fmtDateTime(p.at)], ["Payer reference", p.payerRef], ["Allocated to", p.invoiceId || p.quoteId || "Nothing yet"], ["Job", p.jobId ? <RefLink key="j" r={{ type: "job", id: p.jobId }}>{p.jobId}</RefLink> : p.suggestedJobId ? "Suggested " + p.suggestedJobId : "Unknown"]]} />
        {p.status === "unmatched" && <div style={{ marginTop: 12 }}><Btn kind="primary" onClick={() => ops.openModal("allocate", p.id)}>Allocate payment</Btn></div>}
        <div className="ops-note" style={{ marginTop: 10 }}>Simulated card event. No money moved; Pulse never initiates payments or refunds.</div>
      </div>
    </>
  );
}

export { BRANDS };
