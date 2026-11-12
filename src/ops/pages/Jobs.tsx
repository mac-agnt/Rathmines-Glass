import { useMemo, useState } from "react";
import type { Job, PersonId, Stage } from "../types";
import { ops, useOps } from "../store";
import { PEOPLE, PERSON } from "../fixtures";
import {
  ACTIVE_STAGES, STAGES, STAGE_LABEL, brandMatch, customerOf, siteOf, currentRevision, getJob, jobHealth, jobValue, personName, revisionsOf,
  stageAgeDays, FIELD_CREW, dayVisits
} from "../selectors";
import { SCENARIO_DATE, addDays, fmtDate, fmtDateTime, money } from "../time";
import { Badge, BrandBadge, Btn, Callout, Card, Chips, DemoPill, Empty, HealthBadge, Icon, ICON, KV, Page, PageHead, RefLink, Search, Stat, Table } from "../ui";

export const REWORK_ESTIMATE: Record<string, { cents: number; note: string }> = {
  "RG-2606": { cents: 42000, note: "Estimated avoidable rework if the unit were made at 826 mm: replacement unit, second visit and disposal. Estimate only, not a realised saving." }
};

export default function Jobs({ tab }: { tab: string }) {
  if (tab === "all") return <AllJobs />;
  if (tab === "field") return <FieldView />;
  if (tab === "quality") return <Quality />;
  return <Pipeline />;
}

function JobCard({ j }: { j: Job }) {
  const { data } = useOps();
  const h = jobHealth(data, j);
  return (
    <button type="button" className="ops-jobcard" onClick={() => ops.open({ type: "job", id: j.id })} aria-label={j.id + " " + customerOf(data, j).name + ", " + h.label}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{j.id}</span>
        <BrandBadge brand={j.brand} />
        {j.emergency && <Badge tone="bad">Emergency</Badge>}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6, color: "var(--ink)" }}>{customerOf(data, j).name}</div>
      <div className="ops-note" style={{ marginTop: 2 }}>{j.title}</div>
      <div style={{ marginTop: 8 }}><HealthBadge h={h} reason /></div>
      <div style={{ fontSize: 12, color: "var(--body)", marginTop: 8, lineHeight: 1.4 }}><strong style={{ fontWeight: 500 }}>Next:</strong> {j.nextAction}</div>
      <div className="ops-note" style={{ marginTop: 3 }}>{personName(j.nextOwnerId)} · {fmtDateTime(j.nextDue)} · {stageAgeDays(j, data)} d in stage</div>
    </button>
  );
}

function Pipeline() {
  const { data, ui } = useOps();
  const jobs = data.jobs.filter(j => brandMatch(ui.brand, j.brand));
  const active = jobs.filter(j => j.stage !== "completed");
  const tones = { bad: active.filter(j => jobHealth(data, j).tone === "bad").length, warn: active.filter(j => jobHealth(data, j).tone === "warn").length };
  return (
    <Page>
      <PageHead title="Job pipeline" sub="Stage says where a job is. Health says whether it is on track, and why. They are separate on purpose."
        right={<><DemoPill /><Btn icon={ICON.plus} onClick={() => ops.openModal("log-call")}>New enquiry</Btn></>} />
      <div className="ops-stats" style={{ marginBottom: 16 }}>
        <Stat k="Active jobs" v={active.length} s={"Completed (historical): " + jobs.filter(j => j.stage === "completed").length} />
        <Stat k="Red: overdue or blocked" v={tones.bad} tone="bad" />
        <Stat k="Amber: due soon or dependency" v={tones.warn} tone="warn" />
        <Stat k="Green: on track" v={active.length - tones.bad - tones.warn} tone="ok" />
      </div>
      <div className="ops-kanban" style={{ gridTemplateColumns: "repeat(5,minmax(196px,1fr))" }}>
        {ACTIVE_STAGES.map(s => {
          const list = active.filter(j => j.stage === s).sort((a, b) => stageAgeDays(b, data) - stageAgeDays(a, data));
          return (
            <section key={s} className="ops-col" aria-label={STAGE_LABEL[s]}>
              <div className="ops-col-head">{STAGE_LABEL[s]}<span className="n">{list.length}{list.length ? " · oldest " + stageAgeDays(list[0], data) + " d" : ""}</span></div>
              {list.length ? list.map(j => <JobCard key={j.id} j={j} />) : <div className="ops-note" style={{ padding: 6 }}>No jobs for this brand.</div>}
            </section>
          );
        })}
      </div>
    </Page>
  );
}

function AllJobs() {
  const { data, ui } = useOps();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<"active" | Stage | "all">("active");
  const [health, setHealth] = useState<"any" | "bad" | "warn" | "ok">("any");
  const rows = useMemo(() => data.jobs.filter(j => brandMatch(ui.brand, j.brand))
    .filter(j => stage === "all" || (stage === "active" ? j.stage !== "completed" : j.stage === stage))
    .filter(j => health === "any" || jobHealth(data, j).tone === health)
    .filter(j => !q || (j.id + " " + customerOf(data, j).name + " " + j.title + " " + siteOf(data, j).locality + " " + personName(j.ownerId)).toLowerCase().includes(q.toLowerCase())), [data, ui.brand, stage, health, q]);
  const reset = () => { setQ(""); setStage("active"); setHealth("any"); };
  return (
    <Page>
      <PageHead title="All jobs" sub={"Showing " + rows.length + " of " + data.jobs.filter(j => brandMatch(ui.brand, j.brand)).length + " jobs. Every row opens the full job record: customer, site, dimensions, quote, deposit, route, promises and timeline."}
        right={<Search value={q} onChange={setQ} placeholder="Search ID, customer, area, owner" />} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Chips label="Stage" value={stage} onChange={setStage} options={[{ id: "active", label: "Active" } as { id: typeof stage; label: string }].concat(STAGES.map(s => ({ id: s.id, label: s.label }))).concat([{ id: "all", label: "Everything" }])} />
        <Chips label="Health" value={health} onChange={setHealth} options={[{ id: "any", label: "Any health" }, { id: "bad", label: "Red" }, { id: "warn", label: "Amber" }, { id: "ok", label: "Green" }]} />
      </div>
      <Card body={false}>
        <Table<Job> caption="Jobs" rows={rows} rowKey={j => j.id} onRow={j => ops.open({ type: "job", id: j.id })} initialSort={{ key: "id", dir: 1 }}
          empty={<Empty text="No jobs match these filters." action={<Btn onClick={reset}>Reset filters</Btn>} />}
          cols={[
            { key: "id", label: "Job", sort: j => j.id, render: j => <span className="strong">{j.id}</span> },
            { key: "c", label: "Customer", sort: j => customerOf(data, j).name, render: j => <div><div className="strong">{customerOf(data, j).name}</div><div className="ops-note">{siteOf(data, j).locality}</div></div> },
            { key: "b", label: "Brand", sort: j => j.brand, render: j => <BrandBadge brand={j.brand} /> },
            { key: "s", label: "Stage", sort: j => ACTIVE_STAGES.indexOf(j.stage), render: j => <span>{STAGE_LABEL[j.stage]}{j.prodState ? <div className="ops-note">{j.prodState === "waiting_release" ? "Waiting release" : "In progress"}</div> : null}</span> },
            { key: "h", label: "Health", sort: j => ["bad", "warn", "ok"].indexOf(jobHealth(data, j).tone), render: j => <HealthBadge h={jobHealth(data, j)} reason /> },
            { key: "v", label: "Value", num: true, sort: j => jobValue(data, j).cents, render: j => <span>{money(jobValue(data, j).cents)}<div className="ops-note">{jobValue(data, j).label}</div></span> },
            { key: "o", label: "Owner", sort: j => personName(j.ownerId), render: j => personName(j.ownerId) },
            { key: "n", label: "Next action", sort: j => j.nextDue, render: j => <div style={{ minWidth: 180 }}>{j.nextAction}<div className="ops-note">{personName(j.nextOwnerId)} · {fmtDateTime(j.nextDue)}</div></div> },
            { key: "a", label: "Days in stage", num: true, sort: j => stageAgeDays(j, data), render: j => stageAgeDays(j, data) }
          ]} />
      </Card>
    </Page>
  );
}

function FieldView() {
  const { data, ui } = useOps();
  const fieldIds = FIELD_CREW as PersonId[];
  const [pid, setPid] = useState<PersonId>(fieldIds.includes(ui.viewAs) ? ui.viewAs : "phil");
  const [day, setDay] = useState(SCENARIO_DATE);
  const visits = dayVisits(data, day).filter(v => v.crew.includes(pid));
  const [sel, setSel] = useState<string | null>(null);
  const cur = visits.find(v => v.id === sel) || visits.find(v => v.status === "booked") || visits[0];
  const p = PERSON[pid];
  return (
    <Page>
      <div className="ops-phone">
        <PageHead title={"My day · " + p.name} sub={p.role + ". Today's jobs, the job pack and the measurement form, without phoning the office."} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <select className="ops-input" aria-label="Field person" value={pid} onChange={e => { setPid(e.target.value as PersonId); setSel(null); }} style={{ flex: "1 1 150px" }}>
            {PEOPLE.filter(x => fieldIds.includes(x.id)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <Chips label="Day" value={day} onChange={d => { setDay(d); setSel(null); }} options={[{ id: SCENARIO_DATE, label: "Today" }, { id: addDays(SCENARIO_DATE, 1), label: "Tomorrow" }]} />
        </div>
        {!visits.length && <Card><Empty text={personName(pid) + " has no visits " + (day === SCENARIO_DATE ? "today" : "tomorrow") + "."} action={<Btn onClick={() => setDay(day === SCENARIO_DATE ? addDays(SCENARIO_DATE, 1) : SCENARIO_DATE)}>Check {day === SCENARIO_DATE ? "tomorrow" : "today"}</Btn>} /></Card>}
        {visits.map(v => {
          const j = getJob(data, v.jobId)!;
          return (
            <button key={v.id} type="button" className={"ops-visitcard" + (cur?.id === v.id ? " active" : "")} onClick={() => setSel(v.id)}
              style={{ all: "unset", boxSizing: "border-box", display: "block", width: "100%", cursor: "pointer", padding: "14px 16px", marginTop: 10, border: "1px solid " + (cur?.id === v.id ? "var(--accent-line)" : "var(--border)"), borderRadius: 16, background: "var(--surface)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{v.start} to {v.end}</span>
                <Badge tone={v.kind === "emergency" ? "bad" : v.kind === "fit" ? "navy" : "accent"} icon={false}>{v.kind}</Badge>
                {v.status === "completed" && <Badge tone="ok">Done</Badge>}
              </div>
              <div style={{ fontSize: 14, marginTop: 6, color: "var(--ink)" }}>{customerOf(data, j).name}</div>
              <div className="ops-note">{siteOf(data, j).address}, {siteOf(data, j).locality}</div>
            </button>
          );
        })}
        {cur && <JobPack visitId={cur.id} />}
      </div>
    </Page>
  );
}

function JobPack({ visitId }: { visitId: string }) {
  const { data } = useOps();
  const v = data.visits.find(x => x.id === visitId)!;
  const j = getJob(data, v.jobId)!;
  const c = customerOf(data, j), s = siteOf(data, j);
  const rev = currentRevision(data, j.id);
  const contacts = data.interactions.filter(i => i.jobId === j.id).slice(-3).reverse();
  return (
    <Card title={"Job pack · " + j.id} sub={j.service} style={{ marginTop: 14 }}>
      <KV items={[
        ["Customer", c.contact + " (" + c.name + ")"],
        ["Phone", c.phone],
        ["Address", s.address + ", " + s.locality],
        ["Access", s.access || "Not recorded"],
        ["Crew", v.crew.map(personName).join(", ")],
        ["Equipment", j.equipment.join(", ") || "Standard kit"],
        ["Task", j.title]
      ]} />
      {v.note && <div style={{ marginTop: 10 }}><Callout>{v.note}</Callout></div>}
      {rev ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", marginBottom: 6 }}>Specification · rev {rev.rev} ({rev.status === "submitted" ? "awaiting check" : rev.status})</div>
          {rev.openings.map((o, i) => (
            <div key={i} className="ops-row"><Icon d={ICON.ruler} /><div className="main"><div className="t">{o.label} × {o.qty}</div><div className="m">Width {o.widthMm} mm · Height {o.heightMm} mm</div></div></div>
          ))}
          <div className="ops-note">{rev.glassType} · {rev.spec}</div>
          <div className="ops-photos" style={{ marginTop: 10 }}>{rev.photos.map((p, i) => <div key={i} className="ops-ph">{p.startsWith("blob:") ? <img src={p} alt="" /> : p}</div>)}</div>
        </div>
      ) : <div className="ops-note" style={{ marginTop: 12 }}>Not measured yet. Use the form below on site.</div>}
      {contacts.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", marginBottom: 4 }}>Recent contact</div>
          {contacts.map(i => <div key={i.id} className="ops-row"><Icon d={i.channel === "Email" ? ICON.mail : ICON.phone} /><div className="main"><div className="t" style={{ fontWeight: 400 }}>{i.summary}</div><div className="m">{fmtDateTime(i.at)}</div></div></div>)}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {(v.kind === "measure" || v.kind === "emergency" || v.kind === "check") && v.status === "booked" && <Btn kind="primary" icon={ICON.ruler} onClick={() => ops.openModal("measure", j.id)}>{rev ? "Submit revised measurements" : "Open measurement form"}</Btn>}
        {v.kind === "check" && rev?.status === "submitted" && <Btn onClick={() => ops.openModal("review", rev.id)}>Record independent check</Btn>}
        {v.kind === "fit" && v.status === "booked" && j.stage === "ready_to_fit" && <Btn kind="primary" icon={ICON.check} onClick={() => ops.openModal("fit-complete", j.id)}>Complete fitting</Btn>}
        <Btn onClick={() => ops.open({ type: "job", id: j.id })}>Full job record</Btn>
      </div>
    </Card>
  );
}

function Quality() {
  const { data, ui } = useOps();
  const jobs = data.jobs.filter(j => brandMatch(ui.brand, j.brand) && j.stage !== "completed");
  const missing = jobs.filter(j => j.stage !== "awaiting_measure" && (!currentRevision(data, j.id) || currentRevision(data, j.id)!.openings.some(o => !o.widthMm || !o.heightMm)));
  const unsigned = data.revisions.filter(r => r.status === "submitted" && brandMatch(ui.brand, getJob(data, r.jobId)!.brand));
  const corrections = data.revisions.filter(r => (r.rev > 1 || r.status === "rejected") && brandMatch(ui.brand, getJob(data, r.jobId)!.brand)).sort((a, b) => (a.measuredAt < b.measuredAt ? 1 : -1));
  const history = data.revisions.filter(r => brandMatch(ui.brand, getJob(data, r.jobId)!.brand) && revisionsOf(data, r.jobId).length > 1).sort((a, b) => (a.jobId + a.rev < b.jobId + b.rev ? -1 : 1));
  return (
    <Page>
      <PageHead title="Quality" sub="Structured checks before anything is made. A revised measurement needs an independent check by someone other than the measurer, and production stays blocked until it passes." right={<DemoPill />} />
      <div className="ops-stats" style={{ marginBottom: 16 }}>
        <Stat k="Unsigned specifications" v={unsigned.length} tone={unsigned.length ? "warn" : "ok"} s="Awaiting independent or specialist check" />
        <Stat k="Missing dimensions" v={missing.length} tone={missing.length ? "bad" : "ok"} s="Past measuring without a complete revision" />
        <Stat k="Corrections and remeasures" v={corrections.length} s="Revisions after the first" />
        <Stat k="Estimated avoidable rework" v={money(Object.entries(REWORK_ESTIMATE).filter(([id]) => jobs.some(j => j.id === id)).reduce((n, [, x]) => n + x.cents, 0))} s="Estimate on open holds. Not realised savings." />
      </div>
      <div className="ops-grid">
        <Card className="ops-span-7" title="Unsigned specifications" sub="Nothing is released until these are approved">
          {unsigned.length ? unsigned.map(r => {
            const j = getJob(data, r.jobId)!;
            const prev = revisionsOf(data, r.jobId).find(x => x.rev === r.rev - 1);
            return (
              <div key={r.id} className="ops-row" style={{ alignItems: "flex-start" }}>
                <div className="main">
                  <div className="t"><RefLink r={{ type: "job", id: j.id }}>{j.id}</RefLink> {customerOf(data, j).name} · rev {r.rev}</div>
                  <div className="m">{r.openings.map(o => o.label + ": W " + o.widthMm + " x H " + o.heightMm + " mm").join("; ")}</div>
                  {prev && <div className="m" style={{ color: "var(--warn)" }}>Changed from rev {prev.rev}: {prev.openings.map(o => "W " + o.widthMm + " x H " + o.heightMm).join("; ")}. {prev.reason}</div>}
                  <div className="m">Measured by {personName(r.measuredBy)} {fmtDateTime(r.measuredAt)} · check: {personName(r.reviewerId)}{r.specialistReview ? " (specialist heritage review)" : ""}</div>
                  {REWORK_ESTIMATE[j.id] && <div className="m">Estimated avoidable rework {money(REWORK_ESTIMATE[j.id].cents)}. {REWORK_ESTIMATE[j.id].note}</div>}
                </div>
                <Btn size="sm" kind="primary" onClick={() => ops.openModal("review", r.id)}>Check</Btn>
              </div>
            );
          }) : <Empty text="Every current specification is signed off." />}
        </Card>
        <Card className="ops-span-5" title="Missing dimensions">
          {missing.length ? missing.map(j => <button key={j.id} type="button" className="ops-row" onClick={() => ops.open({ type: "job", id: j.id })}><div className="main"><div className="t">{j.id} {customerOf(data, j).name}</div><div className="m">{STAGE_LABEL[j.stage]}</div></div></button>)
            : <Empty text="No job past measuring is missing a width or height." />}
          <div className="ops-note" style={{ marginTop: 10 }}>Checked against the current revision: every opening needs an identifier, quantity, width and height in millimetres.</div>
        </Card>
        <Card className="ops-span-12" title="Corrections and remake requests" sub="Kept with who measured, who approved and why" body={false}>
          <Table caption="Revision history" rows={history} rowKey={r => r.id} onRow={r => ops.open({ type: "job", id: r.jobId })}
            empty={<Empty text="No corrections recorded." />}
            cols={[
              { key: "j", label: "Job", render: r => <span className="strong">{r.jobId}</span> },
              { key: "r", label: "Rev", render: r => "Rev " + r.rev },
              { key: "d", label: "Dimensions", render: r => r.openings.map(o => o.label + ": W " + o.widthMm + " x H " + o.heightMm + " mm").join("; ") },
              { key: "m", label: "Measured by", render: r => personName(r.measuredBy) + ", " + fmtDate(r.measuredAt) },
              { key: "s", label: "Status", render: r => <Badge tone={r.status === "approved" ? "ok" : r.status === "submitted" ? "warn" : r.status === "rejected" ? "bad" : "neutral"}>{r.status === "submitted" ? "Awaiting check" : r.status}</Badge> },
              { key: "a", label: "Approved by / reason", render: r => <span>{r.reviewedAt ? personName(r.reviewerId) + ", " + fmtDate(r.reviewedAt) : r.reviewerId ? "Assigned: " + personName(r.reviewerId) : ""}{r.reason ? <div className="ops-note">{r.reason}</div> : null}</span> }
            ]} />
        </Card>
      </div>
    </Page>
  );
}
