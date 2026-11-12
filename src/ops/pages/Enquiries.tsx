import { useMemo, useState } from "react";
import type { Interaction, Quote } from "../types";
import { ops, useOps, go } from "../store";
import { quoteTotal, CONTACT_SAMPLE } from "../fixtures";
import {
  brandMatch, customerOf, getJob, jobHealth, personName, QUOTE_STATUS, customerBalance, STAGE_LABEL
} from "../selectors";
import { calendarDays, fmtDateTime, money, relAge, ms, SCENARIO_NOW } from "../time";
import { Badge, BrandBadge, Btn, Card, Chips, DemoPill, Empty, HealthBadge, Icon, ICON, Page, PageHead, RefLink, Search, Stat, Table } from "../ui";

export default function Enquiries({ tab }: { tab: string }) {
  if (tab === "callbacks") return <Callbacks />;
  if (tab === "quotes") return <Quotes />;
  if (tab === "customers") return <Customers />;
  return <Inbox />;
}

const CH_ICON = { Phone: ICON.phone, Email: ICON.mail, Manual: ICON.note };

function Inbox() {
  const { data, ui } = useOps();
  const [filter, setFilter] = useState<"all" | "triage" | "linked" | "done">("all");
  const rows = data.interactions.filter(i => brandMatch(ui.brand, i.brand)).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  const triage = rows.filter(i => i.status === "new" || i.status === "draft_enquiry");
  const shown = rows.filter(i => filter === "all" || (filter === "triage" ? triage.includes(i) : filter === "linked" ? i.status === "linked" : i.status === "merged" || i.status === "converted"));
  const yesterday = CONTACT_SAMPLE;
  const conv = new Set(yesterday.map(r => r.conversation)).size;
  return (
    <Page>
      <PageHead title="Enquiries inbox" sub="Calls, email and paper notes for all three brands in one owned queue. Every item gets an owner and a next action; duplicates are suggested, never merged without the office."
        right={<><DemoPill /><Btn kind="primary" icon={ICON.phone} onClick={() => ops.openModal("log-call")}>Log call or message</Btn></>} />
      <div className="ops-stats" style={{ marginBottom: 16 }}>
        <Stat k="Contacts since 07:30 today" v={rows.length} s="Demo inbox items" />
        <Stat k="Need triage" v={triage.length} s="New or draft enquiries" tone={triage.length ? "warn" : "ok"} onClick={() => setFilter("triage")} />
        <Stat k="Duplicates suggested" v={rows.filter(i => i.status === "new" && i.dedupeJobId).length} s="Office approves merges" />
        <Stat k="Yesterday's sample" v={yesterday.length + " → " + conv} s={"Contacts → distinct conversations, Wed 11 Nov. Fictional rows sized to reported volume."} onClick={() => go("Dashboard", "enquiries")} />
      </div>
      <Card title="Inbox" right={<Chips label="Inbox filter" value={filter} onChange={setFilter} options={[
        { id: "all", label: "All", n: rows.length }, { id: "triage", label: "Needs triage", n: triage.length },
        { id: "linked", label: "Linked", n: rows.filter(i => i.status === "linked").length }, { id: "done", label: "Merged or converted", n: rows.filter(i => i.status === "merged" || i.status === "converted").length }]} />} body={false}>
        <Table<Interaction> caption="Inbox items" rows={shown} rowKey={i => i.id}
          empty={<Empty text="No items match this filter." action={<Btn onClick={() => setFilter("all")}>Show all</Btn>} />}
          onRow={i => i.jobId ? ops.open({ type: "job", id: i.jobId }) : i.customerId ? ops.open({ type: "customer", id: i.customerId }) : undefined}
          cols={[
            { key: "at", label: "Received", sort: i => i.at, render: i => <span style={{ whiteSpace: "nowrap" }}>{fmtDateTime(i.at)}</span> },
            { key: "ch", label: "Channel", render: i => <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Icon d={CH_ICON[i.channel]} />{i.channel}</span> },
            { key: "b", label: "Brand", render: i => <BrandBadge brand={i.brand} /> },
            { key: "f", label: "From and summary", render: i => <div style={{ minWidth: 220 }}><div className="strong">{i.from}</div><div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{i.summary}</div>
              {i.status === "new" && i.dedupeReason && <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 4 }}>Possible duplicate: {i.dedupeReason}</div>}</div> },
            { key: "u", label: "Urgency", render: i => i.urgency === "emergency" ? <Badge tone="bad">Emergency</Badge> : i.urgency === "high" ? <Badge tone="warn">Repeat contact</Badge> : <Badge tone="neutral" icon={false}>Standard</Badge> },
            { key: "j", label: "Linked to", render: i => i.jobId ? <RefLink r={{ type: "job", id: i.jobId }}>{i.jobId}</RefLink> : <span className="ops-note">{i.status === "draft_enquiry" ? "Draft enquiry" : "Unlinked"}</span> },
            { key: "o", label: "Owner", render: i => personName(i.ownerId) },
            { key: "a", label: "Next action", render: i => <InboxActions i={i} /> }
          ]} />
      </Card>
      <div className="ops-note" style={{ marginTop: 10 }}>Calls are captured manually or through the mock intake. No telephony or email provider is connected; nothing here was received from a real system.</div>
    </Page>
  );
}

function InboxActions({ i }: { i: Interaction }) {
  const stop = (fn: () => void) => () => fn();
  if (i.status === "new" && i.dedupeJobId) return (
    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
      <Btn size="sm" kind="primary" onClick={() => ops.mergeInteraction(i.id)}>Approve merge</Btn>
      <Btn size="sm" onClick={() => ops.openModal("convert", i.id)}>New enquiry</Btn>
    </span>
  );
  if (i.status === "draft_enquiry" || i.status === "new") return (
    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
      <Btn size="sm" kind="primary" onClick={() => ops.openModal("convert", i.id)}>Create enquiry</Btn>
      {i.dedupeJobId && <Btn size="sm" onClick={() => ops.linkInteraction(i.id, i.dedupeJobId!)}>Link {i.dedupeJobId}</Btn>}
    </span>
  );
  if (i.jobId === "RG-2604" && i.status === "linked") return <span onClick={e => e.stopPropagation()}><Btn size="sm" onClick={stop(() => go("Work", "approvals"))}>Review arrival update</Btn></span>;
  return <span className="ops-note">{i.status === "merged" ? "Merged" : i.status === "converted" ? "Converted" : "Handled on job"}</span>;
}

function Callbacks() {
  const { data, ui } = useOps();
  const [show, setShow] = useState<"open" | "done">("open");
  const all = data.callbacks.filter(c => !c.jobId || brandMatch(ui.brand, getJob(data, c.jobId)!.brand));
  const rows = all.filter(c => c.status === show).sort((a, b) => (a.due < b.due ? -1 : 1));
  const overdue = all.filter(c => c.status === "open" && ms(c.due) < ms(SCENARIO_NOW));
  return (
    <Page>
      <PageHead title="Callbacks" sub="Every promised call with an owner and a due time. Completing one updates the job, its tasks and Activity." right={<DemoPill />} />
      <div className="ops-stats" style={{ marginBottom: 16 }}>
        <Stat k="Open" v={all.filter(c => c.status === "open").length} />
        <Stat k="Overdue" v={overdue.length} tone={overdue.length ? "bad" : "ok"} s={overdue.map(c => c.customerName).join(", ") || "None"} />
        <Stat k="Due by 12:00 today" v={all.filter(c => c.status === "open" && c.due <= "2026-11-12T12:00" && c.due >= "2026-11-12T09:00").length} />
        <Stat k="Completed" v={all.filter(c => c.status === "done").length} onClick={() => setShow("done")} />
      </div>
      <Card title="Callback queue" right={<Chips label="Callback status" value={show} onChange={setShow} options={[{ id: "open", label: "Open" }, { id: "done", label: "Completed" }]} />} body={false}>
        <Table caption="Callbacks" rows={rows} rowKey={c => c.id} onRow={c => c.jobId ? ops.open({ type: "job", id: c.jobId }) : undefined}
          empty={<Empty text={show === "open" ? "No open callbacks." : "Nothing completed yet."} action={<Btn onClick={() => setShow(show === "open" ? "done" : "open")}>Show {show === "open" ? "completed" : "open"}</Btn>} />}
          cols={[
            { key: "c", label: "Customer", sort: c => c.customerName, render: c => <div><div className="strong">{c.customerName}</div><div className="ops-note">{c.reason}</div></div> },
            { key: "d", label: "Due", sort: c => c.due, render: c => {
              const late = c.status === "open" && ms(c.due) < ms(SCENARIO_NOW);
              return <span style={{ display: "inline-flex", flexDirection: "column", gap: 3 }}><span>{fmtDateTime(c.due)}</span>{late ? <Badge tone="bad">Overdue</Badge> : c.status === "open" && ms(c.due) - ms(SCENARIO_NOW) <= 3 * 3600000 ? <Badge tone="warn">Due soon</Badge> : null}</span>;
            } },
            { key: "l", label: "Last contact", sort: c => c.lastContact, render: c => relAge(c.lastContact) },
            { key: "j", label: "Job", render: c => c.jobId ? <span><RefLink r={{ type: "job", id: c.jobId }}>{c.jobId}</RefLink><div className="ops-note">{STAGE_LABEL[getJob(data, c.jobId)!.stage]}{getJob(data, c.jobId)!.stage === "awaiting_measure" ? ", waiting " + calendarDays(getJob(data, c.jobId)!.enquiryAt) + " calendar days" : ""}</div></span> : <span className="ops-note">New caller</span> },
            { key: "o", label: "Owner", render: c => personName(c.ownerId) },
            { key: "a", label: "", render: c => c.status === "open" ? (
              <span style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                <Btn size="sm" kind="primary" icon={ICON.check} onClick={() => ops.openModal("callback", c.id)}>Complete</Btn>
                {c.jobId && getJob(data, c.jobId)!.stage === "awaiting_measure" && <Btn size="sm" onClick={() => { ops.setAvailabilityJob(c.jobId!); go("Schedule", "availability"); }}>Find slot</Btn>}
              </span>) : <span className="ops-note">{c.outcome}</span> }
          ]} />
      </Card>
    </Page>
  );
}

const Q_COLS: Quote["status"][] = ["measured_awaiting_price", "draft", "awaiting_approval", "sent", "accepted"];

function Quotes() {
  const { data, ui } = useOps();
  const quotes = data.quotes.filter(q => { const j = getJob(data, q.jobId)!; return brandMatch(ui.brand, j.brand) && j.stage !== "completed"; });
  return (
    <Page>
      <PageHead title="Quotes" sub="Measured jobs enter an owned quote queue straight away. Xero references are mock drafts; approving marks a quote sent in the demo only." right={<DemoPill>Xero: simulated</DemoPill>} />
      <div className="ops-stats" style={{ marginBottom: 16 }}>
        {Q_COLS.map(s => <Stat key={s} k={QUOTE_STATUS[s]} v={quotes.filter(q => q.status === s).length} s={money(quotes.filter(q => q.status === s).reduce((n, q) => n + quoteTotal(q), 0))} />)}
      </div>
      <div className="ops-kanban" style={{ gridTemplateColumns: "repeat(5,minmax(230px,1fr))" }}>
        {Q_COLS.map(s => {
          const list = quotes.filter(q => q.status === s).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
          return (
            <div key={s} className="ops-col">
              <div className="ops-col-head">{QUOTE_STATUS[s]}<span className="n">{list.length}</span></div>
              {!list.length && <div className="ops-note" style={{ padding: "8px 4px" }}>None.</div>}
              {list.map(q => {
                const j = getJob(data, q.jobId)!;
                const age = calendarDays(j.measuredAt || q.createdAt);
                return (
                  <div key={q.id} className="ops-jobcard" role="group" aria-label={q.id}>
                    <button type="button" className="ops-link" onClick={() => ops.open({ type: "job", id: j.id })} style={{ borderBottom: 0 }}>{q.id} · {customerOf(data, j).name}</button>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
                      <BrandBadge brand={j.brand} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{q.lines.length ? money(quoteTotal(q)) : "Not priced"}</span>
                    </div>
                    <div className="ops-note" style={{ marginTop: 6 }}>Measured {age} days ago · {personName(q.ownerId)} · {q.xeroRef}</div>
                    {j.qualityHold && <div style={{ marginTop: 6 }}><Badge tone="warn">Quality hold</Badge></div>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {(s === "measured_awaiting_price" || s === "draft") && <Btn size="sm" kind={s === "measured_awaiting_price" ? "primary" : "secondary"} onClick={() => ops.openModal("quote", q.id)}>{q.lines.length ? "Edit" : "Price"}</Btn>}
                      {s === "draft" && q.lines.length > 0 && <Btn size="sm" kind="primary" disabled={!!j.qualityHold} onClick={() => ops.submitQuote(q.id)}>Submit</Btn>}
                      {s === "awaiting_approval" && <><Btn size="sm" kind="primary" onClick={() => ops.approveQuote(q.id)}>Approve and send</Btn><Btn size="sm" onClick={() => ops.openModal("quote", q.id)}>Edit</Btn></>}
                      {s === "sent" && <Btn size="sm" kind="primary" onClick={() => ops.acceptQuote(q.id)}>Record acceptance</Btn>}
                      {s === "accepted" && <span className="ops-note">{STAGE_LABEL[j.stage]}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Page>
  );
}

function Customers() {
  const { data, ui } = useOps();
  const [q, setQ] = useState("");
  const rows = useMemo(() => data.customers.map(c => {
    const jobs = data.jobs.filter(j => j.customerId === c.id);
    const last = data.interactions.filter(i => i.customerId === c.id).map(i => i.at).concat(data.callbacks.filter(cb => cb.customerId === c.id).map(cb => cb.lastContact)).sort().pop();
    return { c, jobs, open: jobs.filter(j => j.stage !== "completed"), bal: customerBalance(data, c.id), last };
  }).filter(r => r.jobs.some(j => brandMatch(ui.brand, j.brand)))
    .filter(r => !q || (r.c.name + " " + r.c.contact + " " + r.jobs.map(j => j.id).join(" ") + " " + data.sites.find(s => s.id === r.c.siteIds[0])?.locality).toLowerCase().includes(q.toLowerCase())), [data, q, ui.brand]);
  return (
    <Page>
      <PageHead title="Customers" sub="Search by name, job ID or area. Each row opens the same canonical customer record used in Records." right={<Search value={q} onChange={setQ} placeholder="Search customers, jobs, areas" />} />
      <Card body={false}>
        <Table caption="Customers" rows={rows} rowKey={r => r.c.id} onRow={r => ops.open({ type: "customer", id: r.c.id })}
          empty={<Empty text={"No customers match \"" + q + "\"."} action={<Btn onClick={() => setQ("")}>Clear search</Btn>} />}
          cols={[
            { key: "n", label: "Customer", sort: r => r.c.name, render: r => <div><div className="strong">{r.c.name}</div><div className="ops-note">{r.c.kind}</div></div> },
            { key: "s", label: "Site", render: r => data.sites.find(s => s.id === r.c.siteIds[0])?.locality },
            { key: "b", label: "Brands", render: r => <span style={{ display: "flex", gap: 4 }}>{Array.from(new Set(r.jobs.map(j => j.brand))).map(b => <BrandBadge key={b} brand={b} />)}</span> },
            { key: "j", label: "Open jobs", sort: r => r.open.length, render: r => r.open.length ? r.open.map(j => <div key={j.id} style={{ display: "flex", gap: 6, alignItems: "center" }}><RefLink r={{ type: "job", id: j.id }}>{j.id}</RefLink><HealthBadge h={jobHealth(data, j)} /></div>) : <span className="ops-note">Completed only</span> },
            { key: "bal", label: "Balance", num: true, sort: r => r.bal, render: r => r.bal ? money(r.bal) : <span className="ops-note">None</span> },
            { key: "l", label: "Last contact", sort: r => r.last || "", render: r => r.last ? fmtDateTime(r.last) : <span className="ops-note">Not in demo inbox</span> }
          ]} />
      </Card>
    </Page>
  );
}
