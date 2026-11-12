import { useState } from "react";
import type { ActivityEvent } from "../types";
import { ops, useOps } from "../store";
import { refLabel } from "../selectors";
import { fmtDateTime } from "../time";
import { Badge, Btn, Card, Chips, DemoPill, Empty, Page, PageHead, RefLink, Search, Table } from "../ui";

const LABEL: Record<string, string> = { all: "Everything", people: "People", agents: "Agents", systems: "Systems" };

export default function Activity({ tab }: { tab: string }) {
  const { data } = useOps();
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const kind = tab === "people" ? "person" : tab === "agents" ? "agent" : tab === "systems" ? "system" : null;
  const sources = Array.from(new Set(data.activity.map(e => e.source)));
  const rows = data.activity.filter(e => (!kind || e.actorKind === kind) && (src === "all" || e.source === src)
    && (!q || (e.actor + " " + e.action + " " + (e.refLabel || "") + " " + (e.ref?.id || "")).toLowerCase().includes(q.toLowerCase())))
    .slice().sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const reset = () => { setQ(""); setSrc("all"); };
  return (
    <Page>
      <PageHead title={"Activity · " + LABEL[tab || "all"]} sub="One chronological stream: who did what, to which record, from which source. New local actions append here. System entries are simulations; nothing was delivered to a customer or written to Xero or Square."
        right={<><DemoPill /><Search value={q} onChange={setQ} placeholder="Search actor, action, job" /></>} />
      <div style={{ marginBottom: 12 }}>
        <Chips label="Source" value={src} onChange={setSrc} options={[{ id: "all", label: "All sources", n: data.activity.filter(e => !kind || e.actorKind === kind).length }].concat(sources.map(s => ({ id: s, label: s, n: data.activity.filter(e => e.source === s && (!kind || e.actorKind === kind)).length })))} />
      </div>
      <Card body={false}>
        <Table<ActivityEvent> caption="Activity" rows={rows} rowKey={e => e.id} onRow={e => (e.ref ? ops.open(e.ref) : undefined)}
          empty={<Empty text="No events match." action={<Btn onClick={reset}>Reset filters</Btn>} />}
          cols={[
            { key: "t", label: "Time", render: e => <span style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.at)}</span> },
            { key: "a", label: "Actor", render: e => <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Badge tone={e.actorKind === "agent" ? "accent" : e.actorKind === "system" ? "neutral" : "navy"} icon={false}>{e.actorKind === "person" ? "Person" : e.actorKind === "agent" ? "Agent" : "System"}</Badge>{e.actor}</span> },
            { key: "w", label: "Action", render: e => <span style={{ color: "var(--ink)" }}>{e.action}</span> },
            { key: "e", label: "Record", render: e => e.ref ? <RefLink r={e.ref}>{e.refLabel || refLabel(data, e.ref)}</RefLink> : <span className="ops-note">None</span> },
            { key: "s", label: "Source", render: e => <span className="ops-note">{e.source}</span> }
          ]} />
      </Card>
      <div className="ops-note" style={{ marginTop: 10 }}>{rows.length} of {data.activity.length} events. Seeded events run from 4 Nov 2026; local demo actions are stamped from 09:00 on 12 Nov, one scenario minute apart.</div>
    </Page>
  );
}
