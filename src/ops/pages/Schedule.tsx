import { useMemo, useState } from "react";
import type { PersonId, Visit } from "../types";
import { ops, useOps } from "../store";
import { PERSON } from "../fixtures";
import {
  FIELD_CREW, brandMatch, customerOf, dayVisits, emergencyPreview, findSlots, getJob, personName, siteOf, travelMins, visitZone, weekDates, ZONE_NAME, STAGE_LABEL, byId
} from "../selectors";
import { SCENARIO_DATE, WORK_END, WORK_START, fmtDate, fmtDay, minutes, calendarDays } from "../time";
import { Badge, BrandBadge, Btn, Callout, Card, DemoPill, Empty, Gates, Icon, ICON, KV, Page, PageHead, RefLink, Stat } from "../ui";

export default function Schedule({ tab }: { tab: string }) {
  if (tab === "week") return <Week />;
  if (tab === "availability") return <Availability />;
  if (tab === "emergencies") return <Emergencies />;
  return <Today />;
}

const KIND_LABEL: Record<Visit["kind"], string> = { measure: "Measure", fit: "Fit", emergency: "Emergency", check: "Check" };

function Legend() {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--dim)" }}>
      {(["measure", "fit", "emergency", "check"] as Visit["kind"][]).map(k => (
        <span key={k} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: k === "fit" ? "var(--slate)" : k === "measure" ? "var(--teal)" : k === "emergency" ? "var(--bad)" : "var(--warn)" }} />{KIND_LABEL[k]} visit
        </span>
      ))}
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 12, height: 12, borderRadius: 3, border: "1px dashed var(--border-strong)" }} />Proposed, not booked</span>
    </div>
  );
}

function Today() {
  const { data, ui } = useOps();
  const visits = dayVisits(data, SCENARIO_DATE, ui.brand).filter(v => v.status === "booked");
  const proposals = data.proposals.filter(p => p.status === "pending" && p.date === SCENARIO_DATE);
  const span = minutes(WORK_END) - minutes(WORK_START);
  const pos = (s: string, e: string) => ({ left: ((minutes(s) - minutes(WORK_START)) / span) * 100 + "%", width: ((minutes(e) - minutes(s)) / span) * 100 + "%" });
  return (
    <Page>
      <PageHead title={"Today · " + fmtDate(SCENARIO_DATE)} sub="Who is where, for how long, with travel between jobs. Nothing moves without an explicit move or an approved proposal." right={<DemoPill>Scenario clock 09:00</DemoPill>} />
      {proposals.length > 0 && <div style={{ marginBottom: 14 }}><Callout tone="warn">An emergency proposal would change today's plan. It is shown dashed below and changes nothing until approved. <button type="button" className="ops-link" onClick={() => ops.open({ type: "job", id: proposals[0].jobId })}>{proposals[0].jobId}</button></Callout></div>}
      <Card title="Crew lanes, 08:00 to 17:00" right={<Legend />}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr" }}><span /><div className="ops-tg-hours">{Array.from({ length: 9 }, (_, i) => <span key={i}>{String(8 + i).padStart(2, "0")}:00</span>)}</div></div>
            <div className="ops-timegrid">
              {FIELD_CREW.map(pid => {
                const split = proposals.some(p => p.crew.includes(pid as PersonId));
                const real = split ? { top: 5, bottom: "auto", height: 30 } : {};
                const ghost = { top: 39, bottom: "auto", height: 30 };
                return (
                <div key={pid} className="ops-tg-row">
                  <div className="ops-tg-name">{PERSON[pid].name}<div className="ops-note">{PERSON[pid].role}</div></div>
                  <div className="ops-tg-lane" style={split ? { height: 74 } : undefined}>
                    {visits.filter(v => v.crew.includes(pid)).map(v => {
                      const moving = proposals.some(p => p.displaced.some(x => x.visitId === v.id));
                      return (
                        <button key={v.id} type="button" className={"ops-tg-block k-" + v.kind} style={{ ...pos(v.start, v.end), ...real, opacity: moving ? .55 : 1 }} onClick={() => ops.open({ type: "job", id: v.jobId })}
                          aria-label={KIND_LABEL[v.kind] + " " + v.start + " to " + v.end + ", " + customerOf(data, getJob(data, v.jobId)!).name + (moving ? ", would move if the emergency is approved" : "")}>
                          <strong>{v.start}</strong> {KIND_LABEL[v.kind]} · {customerOf(data, getJob(data, v.jobId)!).name}{moving ? " (would move)" : ""}
                        </button>
                      );
                    })}
                    {proposals.filter(p => p.crew.includes(pid as PersonId)).flatMap(p => [
                      <button key={p.id} type="button" className="ops-tg-block k-emergency ghost" style={{ ...pos(p.start, p.end), ...ghost }} onClick={() => ops.open({ type: "job", id: p.jobId })} aria-label={"Proposed emergency " + p.start + " to " + p.end}>
                        Proposed · {customerOf(data, getJob(data, p.jobId)!).name}
                      </button>,
                      ...p.displaced.map(x => {
                        const v = byId(data.visits, x.visitId)!;
                        return v.crew.includes(pid as PersonId) ? (
                          <button key={p.id + x.visitId} type="button" className="ops-tg-block k-fit ghost" style={{ ...pos(x.toStart, x.toEnd), ...ghost }} onClick={() => ops.open({ type: "job", id: v.jobId })} aria-label={"Proposed new time for " + v.jobId}>
                            Proposed move · {v.jobId}
                          </button>
                        ) : null;
                      })
                    ])}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
      <Card title="Visit list" sub="Duration, crew and travel buffer" style={{ marginTop: 16 }}>
        {visits.length ? visits.map((v, i) => {
          const j = getJob(data, v.jobId)!;
          const prev = visits.slice(0, i).reverse().find(x => x.crew.some(c => v.crew.includes(c)));
          const travel = prev ? travelMins(visitZone(data, prev), visitZone(data, v)) : travelMins("DEPOT", visitZone(data, v));
          return (
            <div key={v.id} className="ops-row">
              <span style={{ width: 112, flex: "none", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v.start} to {v.end}</span>
              <div className="main">
                <div className="t"><Badge tone={v.kind === "emergency" ? "bad" : v.kind === "check" ? "warn" : "neutral"} icon={false}>{KIND_LABEL[v.kind]}</Badge> <RefLink r={{ type: "job", id: j.id }}>{j.id}</RefLink> {customerOf(data, j).name}</div>
                <div className="m">{v.crew.map(personName).join(" + ")} · {minutes(v.end) - minutes(v.start)} min · {siteOf(data, j).locality} · {travel} min travel from {prev ? prev.jobId : "Robinhood"}{v.note ? " · " + v.note : ""}</div>
              </div>
              <Btn size="sm" onClick={() => ops.openModal("move", v.id)}>Move</Btn>
            </div>
          );
        }) : <Empty text="No visits booked today for this brand." />}
      </Card>
    </Page>
  );
}

function Week() {
  const { data, ui } = useOps();
  const days = weekDates(SCENARIO_DATE, 5);
  return (
    <Page>
      <PageHead title="Week" sub="Five working days. Use Move on any visit; the form checks crew, hours and travel before anything changes." right={<Legend />} />
      <div className="ops-week">
        {days.map(d => {
          const vs = dayVisits(data, d, ui.brand).filter(v => v.status !== "cancelled");
          return (
            <section key={d} className={"ops-day" + (d === SCENARIO_DATE ? " today" : "")} aria-label={fmtDay(d)}>
              <h4>{fmtDay(d)}{d !== SCENARIO_DATE && d !== "2026-11-13" ? "" : " · " + fmtDate(d)}</h4>
              <div className="ops-note">{vs.length} visit{vs.length === 1 ? "" : "s"}</div>
              {vs.map(v => {
                const j = getJob(data, v.jobId)!;
                return (
                  <div key={v.id} className={"ops-visit k-" + v.kind} style={{ cursor: "default" }}>
                    <div style={{ fontWeight: 600 }}>{v.start} to {v.end} · {KIND_LABEL[v.kind]}</div>
                    <div>{customerOf(data, j).name}</div>
                    <div className="ops-note">{v.crew.map(personName).join(" + ")}{v.status === "completed" ? " · done" : ""}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <Btn size="sm" kind="ghost" onClick={() => ops.open({ type: "job", id: j.id })}>Open</Btn>
                      {v.status === "booked" && <Btn size="sm" onClick={() => ops.openModal("move", v.id)}>Move</Btn>}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </Page>
  );
}

function Availability() {
  const { data, ui } = useOps();
  const candidates = data.jobs.filter(j => (j.stage === "awaiting_measure" && !j.emergency || j.stage === "ready_to_fit") && brandMatch(ui.brand, j.brand)
    && !data.visits.some(v => v.jobId === j.id && v.status === "booked" && (j.stage === "ready_to_fit" ? v.kind === "fit" : v.kind === "measure")));
  const jobId = candidates.some(j => j.id === ui.availabilityJob) ? ui.availabilityJob : candidates[0]?.id;
  const j = jobId ? getJob(data, jobId) : undefined;
  const slots = useMemo(() => (j ? findSlots(data, j.id, 6, 8) : []), [data, j]);
  const kind = j?.stage === "ready_to_fit" ? "fit" : "measure";
  return (
    <Page>
      <PageHead title="Availability" sub="Offer the next slot that actually works: working hours 08:00 to 17:00, booked visits, required skills, crew size and travel between areas." right={<DemoPill>Travel times are estimates</DemoPill>} />
      <div className="ops-grid">
        <Card className="ops-span-4" title="Needs a slot" sub={candidates.length + " jobs"}>
          {candidates.length ? candidates.map(c => (
            <button key={c.id} type="button" className="ops-row" onClick={() => ops.setAvailabilityJob(c.id)} aria-pressed={c.id === jobId}
              style={c.id === jobId ? { background: "var(--accent-faint)", boxShadow: "inset 0 0 0 1px var(--accent-line)" } : undefined}>
              <div className="main"><div className="t">{c.id} {customerOf(data, c).name}</div><div className="m">{STAGE_LABEL[c.stage]} · {c.stage === "awaiting_measure" ? "waiting " + calendarDays(c.enquiryAt) + " calendar days" : "QC done"}</div></div>
              <BrandBadge brand={c.brand} />
            </button>
          )) : <Empty text="Every measure and fitting is booked for this brand." />}
        </Card>
        <div className="ops-span-8" style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {j ? (
            <>
              <Card title={"Requirements · " + j.id} sub={customerOf(data, j).name}>
                <KV items={[
                  ["Visit", (kind === "fit" ? "Fitting" : "Measure") + ", " + j.visitMins + " min"],
                  ["Crew", j.crewSize + (j.crewSize > 1 ? " people" : " person") + (j.skills.length ? " with " + j.skills.join(", ") : "")],
                  ["Area", siteOf(data, j).locality + " (" + ZONE_NAME[siteOf(data, j).zone] + ", " + travelMins("DEPOT", siteOf(data, j).zone) + " min from Robinhood)"],
                  ["Equipment", j.equipment.join(", ") || "Standard kit"],
                  ["Waiting", calendarDays(j.enquiryAt) + " calendar days since enquiry"]
                ]} />
              </Card>
              <Card title="Next valid slots" sub="Computed from the live schedule, so approving an emergency changes these">
                {slots.length ? slots.map((s, i) => (
                  <div key={i} className="ops-row" style={{ alignItems: "flex-start" }}>
                    <Icon d={ICON.clock} />
                    <div className="main">
                      <div className="t">{fmtDay(s.date)}{s.date !== SCENARIO_DATE ? "" : ""} · {s.start} to {s.end} · {s.crew.map(personName).join(" + ")}</div>
                      <div className="m">{s.notes.length ? s.notes.join(". ") : "First job of the day for this crew; " + travelMins("DEPOT", siteOf(data, j).zone) + " min from Robinhood"}</div>
                    </div>
                    <Btn size="sm" kind={i === 0 ? "primary" : "secondary"} onClick={() => ops.bookVisit(j.id, s, kind)}>Book</Btn>
                  </div>
                )) : <Empty text="No valid slot in the next 8 working days." action={<Btn onClick={() => ops.openModal(kind === "fit" ? "book-fit" : "book-measure", j.id)}>Enter manually</Btn>} />}
                <div className="ops-note" style={{ marginTop: 10 }}>Booking does not message the customer. Draft an update from the job record if you want one reviewed and marked sent in the demo.</div>
              </Card>
            </>
          ) : <Card><Empty text="Pick a job on the left." /></Card>}
        </div>
      </div>
    </Page>
  );
}

function Emergencies() {
  const { data } = useOps();
  const intake = data.interactions.filter(i => i.emergencyChecks);
  return (
    <Page>
      <PageHead title="Emergencies" sub="Emergency means glass completely smashed or missing. A small crack is not automatically an emergency. Every proposal shows its knock-on effect before anyone approves it." right={<DemoPill />} />
      {data.proposals.map(p => <Proposal key={p.id} id={p.id} />)}
      <Card title="Intake triage" sub="Emergency criteria recorded at first contact" style={{ marginTop: 16 }}>
        {intake.map(i => {
          const em = !!i.emergencyChecks?.smashedOrMissing && !!i.emergencyChecks?.securityRisk;
          return (
            <div key={i.id} className="ops-row">
              <div className="main"><div className="t">{i.from} · {i.summary}</div>
                <div className="m">Smashed or missing: {i.emergencyChecks!.smashedOrMissing ? "yes" : "no"} · Unsecured or safety risk: {i.emergencyChecks!.securityRisk ? "yes" : "no"}</div></div>
              {em ? <Badge tone="bad">Emergency priority</Badge> : <Badge tone="neutral" icon={false}>Standard priority</Badge>}
            </div>
          );
        })}
      </Card>
    </Page>
  );
}

function Proposal({ id }: { id: string }) {
  const { data } = useOps();
  const p = byId(data.proposals, id)!;
  const j = getJob(data, p.jobId)!;
  const prev = emergencyPreview(data, p);
  const draft = byId(data.drafts, p.draftId);
  const [body, setBody] = useState(draft?.body || "");
  return (
    <Card title={"Emergency dispatch · " + j.id + " " + customerOf(data, j).name}
      right={p.status === "pending" ? <Badge tone="warn">Awaiting office approval</Badge> : p.status === "approved" ? <Badge tone="ok">Approved</Badge> : <Badge tone="neutral">Rejected, schedule unchanged</Badge>}>
      <div className="ops-grid">
        <div className="ops-span-6">
          <KV items={[
            ["Priority reason", p.priorityReason],
            ["Site", siteOf(data, j).address + ", " + siteOf(data, j).locality],
            ["Indicative value", "€" + ((j.indicativeCents || 0) / 100).toLocaleString("en-IE") + " (indicative only)"],
            ["Dispatch", p.crew.map(personName).join(" and ") + ", " + fmtDay(p.date) + " " + p.start + " to " + p.end],
            ["Brand", <BrandBadge key="b" brand={j.brand} full />]
          ]} />
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", marginBottom: 8 }}>Intake checklist</div>
            <Gates gates={p.checklist.map(c => ({ label: c.label, ok: c.ok, detail: c.ok ? "Confirmed" : "Not met" }))} />
          </div>
        </div>
        <div className="ops-span-6">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", marginBottom: 8 }}>Displaced visits</div>
          {p.displaced.map(x => {
            const v = byId(data.visits, x.visitId)!;
            const dj = getJob(data, v.jobId)!;
            return (
              <div key={x.visitId} className="ops-callout" style={{ marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}><RefLink r={{ type: "job", id: dj.id }}>{dj.id}</RefLink> {customerOf(data, dj).name}</div>
                  <div className="ops-note" style={{ marginTop: 4 }}>{p.status === "approved" ? "Moved to " : "From " + (p.status === "pending" ? v.start + " to " + v.end : "") + " → proposed "}{x.toStart} to {x.toEnd}, {fmtDay(x.toDate)} · {v.crew.map(personName).join(" + ")}</div>
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", margin: "12px 0 8px" }}>Checks</div>
          {p.status === "pending" ? <Gates gates={prev.checks} /> : <div className="ops-note">Decided {p.status}. See Activity for the audit entry.</div>}
        </div>
        {draft && (
          <div className="ops-span-12">
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", marginBottom: 8 }}>Customer message to {customerOf(data, getJob(data, draft.jobId)!).name} ({draft.channel})</div>
            {draft.status === "draft" ? (
              <>
                <textarea className="ops-input" rows={3} value={body} onChange={e => setBody(e.target.value)} aria-label="Customer message draft" />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Btn size="sm" disabled={body === draft.body} onClick={() => ops.editDraft(draft.id, body)}>Save wording</Btn>
                  <span className="ops-note" style={{ alignSelf: "center" }}>Marked sent in the demo only if the proposal is approved. Nothing is delivered.</span>
                </div>
              </>
            ) : <Callout tone={draft.status === "sent_demo" ? "ok" : "neutral"}>{draft.status === "sent_demo" ? "Marked sent in demo (not delivered): " : "Discarded: "}{draft.body}</Callout>}
          </div>
        )}
      </div>
      {p.status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Btn kind="primary" disabled={!prev.ok} onClick={() => { if (draft && body !== draft.body) ops.editDraft(draft.id, body); ops.approveEmergency(p.id); }}>Approve: book emergency and move {p.displaced.length} visit</Btn>
          <Btn kind="danger" onClick={() => ops.openModal("reject", p.approvalId)}>Reject</Btn>
          <span className="ops-note" style={{ alignSelf: "center" }}>Approval updates both bookings once. Rejection changes nothing.</span>
        </div>
      )}
    </Card>
  );
}
