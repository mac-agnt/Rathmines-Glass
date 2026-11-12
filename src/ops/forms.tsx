/* Every form in the demo. Each one validates, offers Cancel, and writes through
   a store action, so the change shows up in every module and in Activity. */
import { useMemo, useState } from "react";
import type { BrandId, Opening, PersonId, Priority, QuoteLine, TeamName, VisitKind, Zone } from "./types";
import { ops, useOps } from "./store";
import { PEOPLE, BRANDS, BRAND_IDS, quoteTotal } from "./fixtures";
import {
  byId, currentRevision, depositStatus, findSlots, getJob, customerOf, personName, validateVisit, quoteOf, FIELD_CREW, invoiceOf, invoiceStatus
} from "./selectors";
import { SCENARIO_DATE, fmtDate, hhmm, minutes, money, fmtDay } from "./time";
import { Btn, Callout, Field, Modal, Badge, Icon, ICON } from "./ui";

export function ModalHost() {
  const { ui } = useOps();
  const m = ui.modal;
  if (!m) return null;
  const close = () => ops.closeModal();
  switch (m.kind) {
    case "measure": return <MeasureForm jobId={m.id!} onClose={close} />;
    case "quote": return <QuoteForm quoteId={m.id!} onClose={close} />;
    case "book-measure": return <BookForm jobId={m.id!} kind="measure" onClose={close} />;
    case "book-fit": return <BookForm jobId={m.id!} kind="fit" onClose={close} />;
    case "move": return <BookForm visitId={m.id!} onClose={close} />;
    case "log-call": return <LogCallForm onClose={close} />;
    case "convert": return <ConvertForm interactionId={m.id!} onClose={close} />;
    case "deposit": return <DepositForm jobId={m.id!} onClose={close} />;
    case "allocate": return <AllocateForm paymentId={m.id!} onClose={close} />;
    case "task": return <TaskForm jobId={m.id} onClose={close} />;
    case "callback": return <CallbackForm id={m.id!} onClose={close} />;
    case "draft": return <DraftForm jobId={m.id!} onClose={close} />;
    case "fit-complete": return <FitForm jobId={m.id!} onClose={close} />;
    case "review": return <ReviewForm revId={m.id!} onClose={close} />;
    case "reject": return <RejectForm approvalId={m.id!} onClose={close} />;
    case "reset": return <ResetForm onClose={close} />;
  }
  return null;
}

const fieldPeople = PEOPLE.filter(p => FIELD_CREW.includes(p.id));

/* ── measurement ─────────────────────────────────────────────────────── */

function MeasureForm({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data } = useOps();
  const job = getJob(data, jobId)!;
  const cur = currentRevision(data, jobId);
  const heritage = /heritage/i.test(job.service);
  const needsPhoto = job.emergency || /shopfront/i.test(job.service);
  const [openings, setOpenings] = useState<Opening[]>(cur ? cur.openings.map(o => ({ ...o })) : [{ label: "", qty: 1, widthMm: 0, heightMm: 0 }]);
  const [glassType, setGlassType] = useState(cur?.glassType || (job.service === "Mirrors" ? "Silver mirror" : "Double-glazed unit"));
  const [spec, setSpec] = useState(cur?.spec || "");
  const [access, setAccess] = useState(cur?.access || (job.equipment.includes("Step ladder") ? "Ladder access" : "Ground level"));
  const [ladder, setLadder] = useState(cur ? cur.ladder : job.equipment.includes("Step ladder"));
  const [glaziers, setGlaziers] = useState(job.crewSize || 1);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [by, setBy] = useState<PersonId>(cur?.measuredBy || "aoife");
  const [reviewer, setReviewer] = useState<PersonId>(cur?.measuredBy === "aoife" ? "phil" : "aoife");
  const upd = (i: number, patch: Partial<Opening>) => setOpenings(o => o.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const submit = () => {
    if (ops.submitMeasurement(jobId, { openings, glassType, spec, photos, access, ladder, glaziers, notes, measuredBy: by, reviewerId: reviewer })) onClose();
  };
  return (
    <Modal title={(cur ? "Revise measurements, rev " + (cur.rev + 1) : "Submit measurements") + " for " + job.id} onClose={onClose}
      sub={customerOf(data, job).name + " · " + job.service + ". Specialist specifications need human review; this form does not give engineering approval."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={submit}>Submit for independent check</Btn></>}>
      <div className="ops-form">
        <div className="full">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--body)", marginBottom: 6 }}>Openings (millimetres)</div>
          {openings.map((o, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 64px minmax(0,1fr) minmax(0,1fr) 30px", gap: 8, marginBottom: 8, alignItems: "end" }}>
              <Field label={i ? "" : "Opening identifier"}><input className="ops-input" aria-label={"Opening " + (i + 1) + " identifier"} value={o.label} onChange={e => upd(i, { label: e.target.value })} placeholder="e.g. Kitchen side window" /></Field>
              <Field label={i ? "" : "Qty"}><input className="ops-input" aria-label={"Opening " + (i + 1) + " quantity"} type="number" min={1} value={o.qty || ""} onChange={e => upd(i, { qty: Number(e.target.value) })} /></Field>
              <Field label={i ? "" : "Width (mm)"}><input className="ops-input" aria-label={"Opening " + (i + 1) + " width in millimetres"} type="number" value={o.widthMm || ""} onChange={e => upd(i, { widthMm: Number(e.target.value) })} /></Field>
              <Field label={i ? "" : "Height (mm)"}><input className="ops-input" aria-label={"Opening " + (i + 1) + " height in millimetres"} type="number" value={o.heightMm || ""} onChange={e => upd(i, { heightMm: Number(e.target.value) })} /></Field>
              <button type="button" className="ops-btn ghost sm" aria-label={"Remove opening " + (i + 1)} disabled={openings.length < 2} onClick={() => setOpenings(x => x.filter((_, k) => k !== i))}><Icon d={ICON.x} size={12} /></button>
            </div>
          ))}
          <Btn size="sm" icon={ICON.plus} onClick={() => setOpenings(x => x.concat([{ label: "", qty: 1, widthMm: 0, heightMm: 0 }]))}>Add opening</Btn>
        </div>
        <Field label="Glass type"><input className="ops-input" value={glassType} onChange={e => setGlassType(e.target.value)} /></Field>
        <Field label="Thickness / specification"><input className="ops-input" value={spec} onChange={e => setSpec(e.target.value)} placeholder="e.g. 4-16-4 low-E, toughened inner" /></Field>
        <Field label="Access"><input className="ops-input" value={access} onChange={e => setAccess(e.target.value)} /></Field>
        <Field label="Glaziers needed to fit"><input className="ops-input" type="number" min={1} max={4} value={glaziers} onChange={e => setGlaziers(Number(e.target.value))} /></Field>
        <label className="ops-check full"><input type="checkbox" checked={ladder} onChange={e => setLadder(e.target.checked)} />Ladder required</label>
        <Field label={heritage ? "Notes (required: sash profile depth)" : "Notes"} full><textarea className="ops-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        <Field label={needsPhoto ? "Photos (required for shopfront and emergency work)" : "Photos"} full hint="Local preview only. Nothing is uploaded to a server.">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label className="ops-btn sm" style={{ cursor: "pointer" }}>
              <Icon d={ICON.camera} size={13} />Choose photo
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setPhotos(p => p.concat([URL.createObjectURL(f)])); e.target.value = ""; }} />
            </label>
            <Btn size="sm" onClick={() => setPhotos(p => p.concat(["Sample site photo " + (p.length + 1)]))}>Add sample photo</Btn>
            {photos.map((p, i) => <span key={i} className="ops-ph" style={{ width: 72, aspectRatio: "4/3" }}>{p.startsWith("blob:") ? <img src={p} alt={"Site photo " + (i + 1)} /> : p}</span>)}
          </div>
        </Field>
        <Field label="Measured by">
          <select className="ops-input" value={by} onChange={e => setBy(e.target.value as PersonId)}>{fieldPeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
        <Field label="Independent reviewer" error={reviewer === by ? "Reviewer must differ from the measurer" : undefined}>
          <select className="ops-input" value={reviewer} onChange={e => setReviewer(e.target.value as PersonId)}>{fieldPeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
      </div>
    </Modal>
  );
}

function ReviewForm({ revId, onClose }: { revId: string; onClose: () => void }) {
  const { data } = useOps();
  const r = byId(data.revisions, revId)!;
  const prev = data.revisions.filter(x => x.jobId === r.jobId && x.rev < r.rev).sort((a, b) => b.rev - a.rev)[0];
  const [reviewer, setReviewer] = useState<PersonId>(r.reviewerId || "aoife");
  const [reason, setReason] = useState("");
  const act = (approve: boolean) => { if (ops.reviewRevision(revId, reviewer, approve, reason)) onClose(); };
  return (
    <Modal title={"Independent check: " + r.jobId + " rev " + r.rev} onClose={onClose} sub={"Measured by " + personName(r.measuredBy) + ". The reviewer must be someone else."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="danger" onClick={() => act(false)}>Reject</Btn><Btn kind="primary" onClick={() => act(true)}>Approve revision</Btn></>}>
      <table className="ops-table">
        <thead><tr><th>Opening</th><th className="num">Qty</th><th className="num">Width (mm)</th><th className="num">Height (mm)</th>{prev && <th>Change from rev {prev.rev}</th>}</tr></thead>
        <tbody>
          {r.openings.map((o, i) => {
            const p = prev?.openings[i];
            const dw = p ? o.widthMm - p.widthMm : 0, dh = p ? o.heightMm - p.heightMm : 0;
            return (
              <tr key={i}><td className="strong">{o.label}</td><td className="num">{o.qty}</td><td className="num">{o.widthMm}</td><td className="num">{o.heightMm}</td>
                {prev && <td>{dw || dh ? <Badge tone="warn">{dw ? "Width " + (dw > 0 ? "+" : "") + dw + " mm" : ""}{dw && dh ? ", " : ""}{dh ? "Height " + (dh > 0 ? "+" : "") + dh + " mm" : ""}</Badge> : "No change"}</td>}</tr>
            );
          })}
        </tbody>
      </table>
      <div className="ops-form" style={{ marginTop: 14 }}>
        <Field label="Reviewer" error={reviewer === r.measuredBy ? "Independent check: cannot be " + personName(r.measuredBy) : undefined}>
          <select className="ops-input" value={reviewer} onChange={e => setReviewer(e.target.value as PersonId)}>{fieldPeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
        <Field label="Reason (required to reject)"><input className="ops-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Re-measured to rebate, confirmed" /></Field>
      </div>
    </Modal>
  );
}

/* ── quote ───────────────────────────────────────────────────────────── */

function QuoteForm({ quoteId, onClose }: { quoteId: string; onClose: () => void }) {
  const { data } = useOps();
  const q = byId(data.quotes, quoteId)!;
  const job = getJob(data, q.jobId)!;
  const [lines, setLines] = useState<{ desc: string; qty: string; unit: string }[]>(
    q.lines.length ? q.lines.map(l => ({ desc: l.desc, qty: String(l.qty), unit: String(l.unitCents / 100) })) : [{ desc: "", qty: "1", unit: "" }]);
  const parsed: QuoteLine[] = lines.map(l => ({ desc: l.desc, qty: Number(l.qty), unitCents: Math.round(Number(l.unit) * 100) }));
  const total = parsed.reduce((n, l) => n + (l.qty > 0 && l.unitCents > 0 ? l.qty * l.unitCents : 0), 0);
  const save = (andSubmit: boolean) => {
    if (!ops.saveQuoteLines(quoteId, parsed)) return;
    if (andSubmit) ops.submitQuote(quoteId);
    onClose();
  };
  return (
    <Modal title={"Quote " + q.id + " · " + customerOf(data, job).name} onClose={onClose} sub={"Xero reference " + q.xeroRef + ". Amounts are gross customer amounts for the demo, not a VAT calculation."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={() => save(false)}>Save draft</Btn><Btn kind="primary" onClick={() => save(true)} disabled={!!job.qualityHold}>Save and submit for approval</Btn></>}>
      {job.qualityHold && <div style={{ marginBottom: 12 }}><Callout tone="warn">Quality hold: {job.qualityHold} You can save a draft, but it cannot go for approval.</Callout></div>}
      {lines.map((l, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,3fr) 70px minmax(0,1fr) 30px", gap: 8, marginBottom: 8, alignItems: "end" }}>
          <Field label={i ? "" : "Description"}><input className="ops-input" aria-label={"Line " + (i + 1) + " description"} value={l.desc} onChange={e => setLines(x => x.map((y, k) => (k === i ? { ...y, desc: e.target.value } : y)))} /></Field>
          <Field label={i ? "" : "Qty"}><input className="ops-input" aria-label={"Line " + (i + 1) + " quantity"} type="number" min={1} value={l.qty} onChange={e => setLines(x => x.map((y, k) => (k === i ? { ...y, qty: e.target.value } : y)))} /></Field>
          <Field label={i ? "" : "Unit price (€)"}><input className="ops-input" aria-label={"Line " + (i + 1) + " unit price in euro"} type="number" min={0} value={l.unit} onChange={e => setLines(x => x.map((y, k) => (k === i ? { ...y, unit: e.target.value } : y)))} /></Field>
          <button type="button" className="ops-btn ghost sm" aria-label={"Remove line " + (i + 1)} disabled={lines.length < 2} onClick={() => setLines(x => x.filter((_, k) => k !== i))}><Icon d={ICON.x} size={12} /></button>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <Btn size="sm" icon={ICON.plus} onClick={() => setLines(x => x.concat([{ desc: "", qty: "1", unit: "" }]))}>Add line</Btn>
        <span style={{ marginLeft: "auto", fontSize: 14 }}>Total <strong style={{ fontVariantNumeric: "tabular-nums" }}>{money(total)}</strong></span>
      </div>
      <div className="ops-note" style={{ marginTop: 8 }}>Deposit on acceptance: {money(Math.round(total / 2))} (50%). Pricing is a human decision; Pulse never sets prices on its own.</div>
    </Modal>
  );
}

/* ── booking and moving visits ───────────────────────────────────────── */

function BookForm({ jobId, kind, visitId, onClose }: { jobId?: string; kind?: VisitKind; visitId?: string; onClose: () => void }) {
  const { data } = useOps();
  const visit = visitId ? byId(data.visits, visitId) : undefined;
  const jid = visit ? visit.jobId : jobId!;
  const job = getJob(data, jid)!;
  const k: VisitKind = visit ? visit.kind : kind!;
  const slots = useMemo(() => (visit ? [] : findSlots(data, jid, 4)), [data, jid, visit]);
  const first = visit || slots[0];
  const [date, setDate] = useState(first?.date || SCENARIO_DATE);
  const [start, setStart] = useState(first?.start || "09:00");
  const [len, setLen] = useState(visit ? minutes(visit.end) - minutes(visit.start) : job.visitMins || 60);
  const [crew, setCrew] = useState<PersonId[]>(first?.crew || []);
  const end = hhmm(minutes(start) + len);
  const chk = validateVisit(data, { jobId: jid, date, start, end, crew }, { exclude: visit ? [visit.id] : [] });
  const blockedFit = k === "fit" && job.stage !== "ready_to_fit";
  const save = () => {
    const ok = visit ? ops.moveVisit(visit.id, { date, start, end, crew }) : ops.bookVisit(jid, { date, start, end, crew }, k);
    if (ok) onClose();
  };
  return (
    <Modal title={(visit ? "Move " + visit.kind + " visit" : "Book " + (k === "fit" ? "fitting" : "measuring visit")) + " · " + job.id} onClose={onClose}
      sub={customerOf(data, job).name + " · needs " + job.crewSize + (job.crewSize > 1 ? " people" : " person") + ", " + job.visitMins + " min" + (job.skills.length ? ", skill: " + job.skills.join(", ") : "") + ". Booking never notifies the customer."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save} disabled={!chk.ok || blockedFit}>{visit ? "Move visit" : "Book visit"}</Btn></>}>
      {blockedFit && <div style={{ marginBottom: 12 }}><Callout tone="bad">{job.id} is not ready to fit. {job.fulfilment === "supplier" ? "The supplier unit must be received and quality checked first." : "Workshop QC is not complete."}</Callout></div>}
      {!visit && (
        <>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--body)", marginBottom: 8 }}>Next valid slots (working hours, booked visits, skills, crew size and travel)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {slots.length ? slots.map((s, i) => {
              const on = s.date === date && s.start === start && s.crew.join() === crew.join();
              return (
                <button key={i} type="button" className={"ops-chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => { setDate(s.date); setStart(s.start); setCrew(s.crew); setLen(minutes(s.end) - minutes(s.start)); }}>
                  {fmtDay(s.date)} {s.start} to {s.end} · {s.crew.map(personName).join(" + ")}
                </button>
              );
            }) : <span className="ops-note">No valid slot in the next 8 working days. Use manual entry below.</span>}
          </div>
        </>
      )}
      <div className="ops-form">
        <Field label="Date"><input className="ops-input" type="date" value={date} min={SCENARIO_DATE} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Start"><input className="ops-input" type="time" step={900} value={start} onChange={e => setStart(e.target.value)} /></Field>
        <Field label="Duration (minutes)"><input className="ops-input" type="number" min={30} step={15} value={len} onChange={e => setLen(Number(e.target.value))} /></Field>
        <Field label="Ends"><input className="ops-input" value={end} readOnly aria-readonly="true" /></Field>
        <div className="full">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--body)", marginBottom: 6 }}>Crew</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {fieldPeople.map(p => (
              <label key={p.id} className="ops-check"><input type="checkbox" checked={crew.includes(p.id)} onChange={e => setCrew(c => (e.target.checked ? c.concat([p.id]) : c.filter(x => x !== p.id)))} />{p.name}<span className="ops-note">{p.skills.join(", ")}</span></label>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        {chk.ok
          ? <Callout tone="ok">Valid: {fmtDate(date)} {start} to {end}, inside 08:00 to 17:00, no double booking.{chk.notes.length ? " " + chk.notes.join(". ") + "." : ""}</Callout>
          : <Callout tone="bad">{chk.issues.join(". ")}.</Callout>}
      </div>
    </Modal>
  );
}

/* ── enquiries ───────────────────────────────────────────────────────── */

function LogCallForm({ onClose }: { onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [phone, setPhone] = useState("");
  const [brand, setBrand] = useState<BrandId>("RG");
  const [channel, setChannel] = useState<"Phone" | "Email" | "Manual">("Phone");
  const [summary, setSummary] = useState("");
  const [smashed, setSmashed] = useState(false);
  const [security, setSecurity] = useState(false);
  const save = () => { if (ops.logCall({ from, phone, brand, channel, summary, smashedOrMissing: smashed, securityRisk: security })) onClose(); };
  return (
    <Modal title="Log a call or message" onClose={onClose} sub="Creates a draft enquiry in the inbox. No telephony or email provider is connected."
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Create draft enquiry</Btn></>}>
      <div className="ops-form">
        <Field label="Caller or sender"><input className="ops-input" value={from} onChange={e => setFrom(e.target.value)} placeholder="Name" /></Field>
        <Field label="Phone" hint="Used to suggest duplicates"><input className="ops-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="087 555 0101" /></Field>
        <Field label="Brand they contacted"><select className="ops-input" value={brand} onChange={e => setBrand(e.target.value as BrandId)}>{BRAND_IDS.map(b => <option key={b} value={b}>{BRANDS[b].name}</option>)}</select></Field>
        <Field label="Channel"><select className="ops-input" value={channel} onChange={e => setChannel(e.target.value as "Phone")}><option>Phone</option><option>Email</option><option>Manual</option></select></Field>
        <Field label="Summary" full><textarea className="ops-input" rows={3} value={summary} onChange={e => setSummary(e.target.value)} placeholder="What do they need?" /></Field>
        <div className="full">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--body)", marginBottom: 6 }}>Emergency check</div>
          <label className="ops-check"><input type="checkbox" checked={smashed} onChange={e => setSmashed(e.target.checked)} />Glass completely smashed or missing</label>
          <label className="ops-check" style={{ marginTop: 6 }}><input type="checkbox" checked={security} onChange={e => setSecurity(e.target.checked)} />Premises unsecured or a safety risk</label>
          <div className="ops-note" style={{ marginTop: 6 }}>Both must be true for emergency priority. A small crack with the pane intact is standard priority.</div>
        </div>
      </div>
    </Modal>
  );
}

function ConvertForm({ interactionId, onClose }: { interactionId: string; onClose: () => void }) {
  const { data } = useOps();
  const it = byId(data.interactions, interactionId)!;
  const [name, setName] = useState(it.from.replace(/\s*\(.*\)$/, ""));
  const [locality, setLocality] = useState("");
  const [zone, setZone] = useState<Zone>("D6");
  const [service, setService] = useState(it.brand === "MD" ? "Mirrors" : it.brand === "SG" ? "Heritage slim glazing" : "Double glazing");
  const [title, setTitle] = useState(it.summary);
  const save = () => { const id = ops.convertInteraction(interactionId, { name, locality, zone, service, title }); if (id) { onClose(); ops.open({ type: "job", id }); } };
  return (
    <Modal title={"Create enquiry from " + it.id} onClose={onClose} sub={"Adds a job in Awaiting measure, owned by the Office coordinator."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Create enquiry</Btn></>}>
      <div className="ops-form">
        <Field label="Customer name"><input className="ops-input" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Locality"><input className="ops-input" value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g. Ranelagh, Dublin 6" /></Field>
        <Field label="Travel area"><select className="ops-input" value={zone} onChange={e => setZone(e.target.value as Zone)}>{(["D6", "D8", "D12", "D14", "D24", "D4"] as Zone[]).map(z => <option key={z}>{z}</option>)}</select></Field>
        <Field label="Service"><select className="ops-input" value={service} onChange={e => setService(e.target.value)}>{["Double glazing", "Mirrors", "Heritage slim glazing", "Emergency glazing", "Specialist glass", "Stained glass"].map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Description" full><input className="ops-input" value={title} onChange={e => setTitle(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function CallbackForm({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useOps();
  const cb = byId(data.callbacks, id)!;
  const [outcome, setOutcome] = useState("");
  return (
    <Modal title={"Complete callback · " + cb.customerName} onClose={onClose} sub={cb.reason}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { if (ops.completeCallback(id, outcome)) onClose(); }}>Mark complete</Btn></>}>
      <Field label="Outcome" hint="Optional. Logged against the job and in Activity."><textarea className="ops-input" rows={3} value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g. Offered Fri 08:30 with Phil, customer accepted" /></Field>
    </Modal>
  );
}

/* ── money ───────────────────────────────────────────────────────────── */

function DepositForm({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data } = useOps();
  const job = getJob(data, jobId)!;
  const dep = depositStatus(data, job);
  const [amount, setAmount] = useState(String(Math.max(0, dep.required - dep.allocated) / 100));
  const [source, setSource] = useState<"Square" | "Bank transfer">("Square");
  return (
    <Modal title={"Record deposit · " + job.id} onClose={onClose} sub={"Simulated. No card is charged and nothing is written to Square or Xero."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { if (ops.recordDeposit(jobId, Math.round(Number(amount) * 100), source)) onClose(); }}>Record deposit</Btn></>}>
      <div className="ops-form">
        <Field label="Amount (€)" hint={"Required: " + money(dep.required) + " (50% of " + money(dep.total) + "). Already allocated: " + money(dep.allocated)}><input className="ops-input" type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} /></Field>
        <Field label="Source"><select className="ops-input" value={source} onChange={e => setSource(e.target.value as "Square")}><option>Square</option><option>Bank transfer</option></select></Field>
      </div>
    </Modal>
  );
}

function AllocateForm({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const { data } = useOps();
  const p = byId(data.payments, paymentId)!;
  const candidates = data.jobs.filter(j => j.stage !== "completed" && (invoiceOf(data, j.id) || quoteOf(data, j.id)?.status === "accepted"));
  const [jobId, setJobId] = useState(p.suggestedJobId || candidates[0]?.id || "");
  const j = getJob(data, jobId);
  const dep = j ? depositStatus(data, j) : null;
  return (
    <Modal title={"Allocate " + p.externalRef + " (" + money(p.amountCents) + ")"} onClose={onClose} sub={p.source + " event " + fmtDate(p.at) + ", reference \"" + p.payerRef + "\". Allocation is recorded once; re-imports never double-count."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { if (ops.allocatePayment(paymentId, jobId)) onClose(); }}>Allocate</Btn></>}>
      <Field label="Allocate to job" hint={p.suggestedJobId ? "Suggested: " + p.suggestedJobId + " (reference similarity)" : undefined}>
        <select className="ops-input" value={jobId} onChange={e => setJobId(e.target.value)}>
          {candidates.map(c => <option key={c.id} value={c.id}>{c.id} {customerOf(data, c).name}</option>)}
        </select>
      </Field>
      {j && dep && (
        <div style={{ marginTop: 12 }}>
          <Callout tone={dep.allocated + p.amountCents >= dep.required ? "ok" : "warn"}>
            {invoiceOf(data, j.id) ? "Allocates to " + invoiceOf(data, j.id)!.id + "." : "Allocates to accepted quote " + quoteOf(data, j.id)!.id + " as a pre-invoice deposit."}{" "}
            Deposit after allocation: {money(dep.allocated + p.amountCents)} of {money(dep.required)} required.
            {j.stage === "production" && j.prodState === "waiting_release" ? " This clears the deposit gate; release still needs approval." : ""}
          </Callout>
        </div>
      )}
    </Modal>
  );
}

/* ── tasks, drafts, fitting, approvals ───────────────────────────────── */

function TaskForm({ jobId, onClose }: { jobId?: string; onClose: () => void }) {
  const { data } = useOps();
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState<PersonId>("office");
  const [due, setDue] = useState(SCENARIO_DATE + "T17:00");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [team, setTeam] = useState<TeamName>("Office");
  const [ref, setRef] = useState(jobId || "");
  return (
    <Modal title="New task" onClose={onClose} sub="Owner, due time, priority, team and a related record are all required."
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { if (ops.addTask({ title, ownerId: owner, due, priority, team, ref: { type: "job", id: ref } })) onClose(); }}>Create task</Btn></>}>
      <div className="ops-form">
        <Field label="Title" full><input className="ops-input" value={title} onChange={e => setTitle(e.target.value)} /></Field>
        <Field label="Owner"><select className="ops-input" value={owner} onChange={e => { const p = PEOPLE.find(x => x.id === e.target.value)!; setOwner(p.id); setTeam(p.team); }}>{PEOPLE.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Due"><input className="ops-input" type="datetime-local" value={due} onChange={e => setDue(e.target.value)} /></Field>
        <Field label="Priority"><select className="ops-input" value={priority} onChange={e => setPriority(e.target.value as Priority)}><option>High</option><option>Medium</option><option>Low</option></select></Field>
        <Field label="Team"><select className="ops-input" value={team} onChange={e => setTeam(e.target.value as TeamName)}>{["Office", "Field glazing", "Workshop", "Specialist studio"].map(t => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Related job" full error={!ref ? "Choose a job" : undefined}>
          <select className="ops-input" value={ref} onChange={e => setRef(e.target.value)}>
            <option value="">Choose…</option>
            {data.jobs.map(j => <option key={j.id} value={j.id}>{j.id} {customerOf(data, j).name}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function DraftForm({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data } = useOps();
  const j = getJob(data, jobId)!;
  const c = customerOf(data, j);
  const [subject, setSubject] = useState("Update on your " + j.service.toLowerCase());
  const [body, setBody] = useState("Hi " + c.contact.split(" ")[0] + ", a quick update from " + BRANDS[j.brand].name + ": " + j.nextAction.toLowerCase() + ".");
  return (
    <Modal title={"Draft customer update · " + c.name} onClose={onClose} sub="Goes to Work, Approvals for office review. Even when approved it is only marked sent in the demo."
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { if (!body.trim()) return; ops.draftUpdate(jobId, subject, body); onClose(); }}>Create draft</Btn></>}>
      <div className="ops-form">
        <Field label="Subject" full><input className="ops-input" value={subject} onChange={e => setSubject(e.target.value)} /></Field>
        <Field label="Message" full><textarea className="ops-input" rows={5} value={body} onChange={e => setBody(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

const FIT_CHECKS = ["Glass or mirror fitted and sealed", "Fixings and safety checked", "Site cleaned and waste removed", "Customer walkthrough done", "Completion photos taken", "Office completion record confirmed"];

function FitForm({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data } = useOps();
  const j = getJob(data, jobId)!;
  const [checks, setChecks] = useState<boolean[]>(FIT_CHECKS.map(() => false));
  const all = checks.every(Boolean);
  const inv = invoiceOf(data, jobId);
  return (
    <Modal title={"Complete fitting · " + j.id} onClose={onClose} sub={customerOf(data, j).name + ". Field and office both sign; any balance stays outstanding."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!all} onClick={() => { if (ops.completeFitting(jobId)) onClose(); }}>Mark completed</Btn></>}>
      {FIT_CHECKS.map((c, i) => <label key={c} className="ops-check" style={{ marginBottom: 8 }}><input type="checkbox" checked={checks[i]} onChange={e => setChecks(x => x.map((y, k) => (k === i ? e.target.checked : y)))} />{c}</label>)}
      {inv && <div className="ops-note" style={{ marginTop: 6 }}>Balance on {inv.id} after completion: {money(invoiceStatus(data, inv).outstanding)}.</div>}
    </Modal>
  );
}

function RejectForm({ approvalId, onClose }: { approvalId: string; onClose: () => void }) {
  const { data } = useOps();
  const a = byId(data.approvals, approvalId)!;
  const [reason, setReason] = useState("");
  const needs = a.kind === "measurement_correction";
  return (
    <Modal title={"Reject: " + a.title} onClose={onClose} sub={a.kind === "emergency_reschedule" ? "Rejecting leaves every existing booking exactly as it is." : "Nothing changes except this decision."}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="danger" disabled={needs && !reason.trim()} onClick={() => { if (ops.decide(approvalId, false, reason)) onClose(); }}>Reject</Btn></>}>
      <Field label={needs ? "Reason (required)" : "Reason (optional)"}><textarea className="ops-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>
    </Modal>
  );
}

function ResetForm({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Reset the demo?" onClose={onClose} sub="Every local change (bookings, approvals, payments, tasks) is discarded and the 12 Nov 2026, 09:00 scenario is restored. This cannot be undone."
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="danger" onClick={() => { ops.reset(); onClose(); }}>Reset demo</Btn></>}>
      <div className="ops-note">Theme and brand filter are kept.</div>
    </Modal>
  );
}

export { quoteTotal };
