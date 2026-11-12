import type { PersonId } from "../types";
import { ops, useOps, setTheme, currentTheme, go } from "../store";
import { BRANDS, BRAND_IDS, INTEGRATION_CARDS, PEOPLE, RESEARCH, AGENTS } from "../fixtures";
import { fmtDateTime } from "../time";
import { Avatar, Badge, BrandBadge, Btn, Callout, Card, Chips, DemoPill, Gates, KV, Page, PageHead, Table } from "../ui";

export default function Settings({ tab }: { tab: string }) {
  switch (tab) {
    case "teams": return <Teams />;
    case "permissions": return <Permissions />;
    case "systems": return <Systems />;
    case "governance": return <Governance />;
    case "experience": return <Experience />;
  }
  return <Organisation />;
}

function Organisation() {
  return (
    <Page>
      <PageHead title="Organisation" sub="What is verified from public sources, and what is deliberately left unconfirmed." right={<DemoPill />} />
      <div className="ops-grid">
        <Card className="ops-span-6" title="Company">
          <KV items={[
            ["Display name", "Rathmines Glass"],
            ["Trading brands", <span key="b" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{BRAND_IDS.map(b => <BrandBadge key={b} brand={b} full />)}</span>],
            ["Brand model", "Three enquiry brands sharing one operation. Not separate legal entities or accounts."],
            ["Owner / office lead", "Danielle (took over from her father Pat in 2012, per the company website)"],
            ["Legal registered name", <Badge key="l" tone="warn">Not confirmed</Badge>],
            ["CRO number", <Badge key="c" tone="warn">Not confirmed</Badge>],
            ["Brand colours", "Demo palette only: navy #18324B, slate #52748A, teal #258A88. Official colours not verified."]
          ]} />
        </Card>
        <Card className="ops-span-6" title="Locations" sub="Verified from public pages">
          {RESEARCH.locations.map(l => <div key={l.name} className="ops-row"><div className="main"><div className="t">{l.name}</div><div className="m">{l.address}</div></div><Badge tone="ok">Verified</Badge></div>)}
        </Card>
        <Card className="ops-span-6" title="Brands">
          {BRAND_IDS.map(b => <div key={b} className="ops-row"><BrandBadge brand={b} /><div className="main"><div className="t">{BRANDS[b].name}</div><div className="m">{BRANDS[b].focus} · {BRANDS[b].site}</div></div></div>)}
        </Card>
        <Card className="ops-span-6" title="Research sources" sub={"Accessed " + RESEARCH.accessed}>
          {RESEARCH.sources.map(s => <div key={s.url} className="ops-row"><div className="main"><div className="t" style={{ fontWeight: 400, overflowWrap: "anywhere" }}>{s.url}</div><div className="m">{s.note}</div></div></div>)}
          <div className="ops-note" style={{ marginTop: 8 }}>{RESEARCH.call} Customers, orders, amounts, metrics and activity in this demo are illustrative fixtures.</div>
        </Card>
      </div>
    </Page>
  );
}

function Teams() {
  return (
    <Page>
      <PageHead title="Teams" sub="Eight demonstration users across four teams. Addresses are illustrative; nothing is sent to them." right={<DemoPill>Demonstration users</DemoPill>} />
      <Card body={false}>
        <Table caption="Demonstration users" rows={PEOPLE} rowKey={p => p.id} onRow={p => ops.open({ type: "person", id: p.id })}
          cols={[
            { key: "n", label: "Name", render: p => <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Avatar initials={p.initials} /><span className="strong">{p.name}</span></span> },
            { key: "r", label: "Role", render: p => p.role },
            { key: "t", label: "Team", render: p => p.team },
            { key: "e", label: "Email", render: p => p.email },
            { key: "s", label: "Skills", render: p => p.skills.join(", ") || "Office" },
            { key: "p", label: "Provenance", render: p => <span className="ops-note">{p.provenance}</span> }
          ]} />
      </Card>
      <div className="ops-note" style={{ marginTop: 10 }}>The core risk this demo addresses: two office people coordinate nearly everything. Field and workshop colleagues can find their next job without phoning them.</div>
    </Page>
  );
}

const ROLES: { key: "management" | "office" | "field" | "workshop"; label: string; who: PersonId; can: string[] }[] = [
  { key: "management", label: "Management", who: "danielle", can: ["Approve quotes, releases and reschedules", "See finance and balances", "Change settings", "Reset the demo"] },
  { key: "office", label: "Office", who: "office", can: ["Log calls and triage the inbox", "Book and move visits", "Allocate payments", "Approve customer messages"] },
  { key: "field", label: "Field", who: "phil", can: ["See own visits and job packs", "Submit measurements", "Record independent checks on others' measurements", "Complete fittings"] },
  { key: "workshop", label: "Workshop", who: "mark", can: ["See the workshop queue", "Advance cut, assemble and QC", "Record supplier acknowledgement and receipt"] }
];

function Permissions() {
  const { ui } = useOps();
  return (
    <Page>
      <PageHead title="Permissions" sub="Role previews for the walkthrough. This is a frontend demonstration only; there is no real security or access control behind it." right={<DemoPill>Preview only</DemoPill>} />
      <Callout tone="warn">Previewing a role changes the signed-in name, the Field View default and the Workshop queue. It does not hide data or enforce anything.</Callout>
      <div className="ops-grid" style={{ marginTop: 14 }}>
        {ROLES.map(r => {
          const p = PEOPLE.find(x => x.id === r.who)!;
          const on = ui.viewAs === r.who;
          return (
            <Card key={r.key} className="ops-span-6" title={r.label} sub={"Preview as " + p.name} right={on ? <Badge tone="accent">Previewing</Badge> : undefined}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: "var(--body)" }}>{r.can.map(c => <li key={c}>{c}</li>)}</ul>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <Btn size="sm" kind={on ? "secondary" : "primary"} onClick={() => ops.setViewAs(r.who)} disabled={on}>Preview as {p.name}</Btn>
                {r.key === "field" && <Btn size="sm" onClick={() => { ops.setViewAs("phil"); go("Jobs", "field"); }}>Open Phil's day</Btn>}
                {r.key === "workshop" && <Btn size="sm" onClick={() => { ops.setViewAs("mark"); go("Production", "workshop"); }}>Open Mark's queue</Btn>}
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

function Systems() {
  const { data } = useOps();
  return (
    <Page>
      <PageHead title="Systems & integrations" sub="Every connection here is simulated. No credentials are stored and nothing is written to an external system." right={<DemoPill>Simulation</DemoPill>} />
      <div className="ops-grid">
        {INTEGRATION_CARDS.map(c => (
          <Card key={c.id} className="ops-span-6" title={c.name} sub={c.role} right={<Badge tone={c.id === "gtasks" ? "neutral" : c.id === "altpay" ? "warn" : "accent"} icon={false}>{c.status}</Badge>}>
            <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>{c.detail}</div>
            {c.id === "xero" && <div style={{ marginTop: 10 }}><Btn size="sm" onClick={() => ops.xeroRefresh()}>Run simulated refresh</Btn></div>}
            {c.id === "square" && <div style={{ marginTop: 10 }}><Btn size="sm" onClick={() => ops.squareImport()}>Run simulated import</Btn></div>}
            {c.id === "phone" && <div style={{ marginTop: 10 }}><Btn size="sm" onClick={() => ops.openModal("log-call")}>Log a call</Btn></div>}
          </Card>
        ))}
        <Card className="ops-span-12" title="Paper migration sample" sub="Source note, extracted fields and confidence. A person accepts or rejects each one." body={false}>
          <Table caption="Paper migration sample" rows={data.paper} rowKey={r => r.id}
            cols={[
              { key: "s", label: "Source", render: r => <span className="strong">{r.source}</span> },
              { key: "f", label: "Extracted fields", render: r => <div>{r.extracted.map(x => <div key={x.k} style={{ fontSize: 12.5 }}>{x.k}: {x.v} <span className="ops-note">({Math.round(x.confidence * 100)}% confidence{x.confidence < 0.6 ? ", check" : ""})</span></div>)}</div> },
              { key: "st", label: "Status", render: r => <Badge tone={r.status === "accepted" ? "ok" : r.status === "rejected" ? "neutral" : "warn"}>{r.status === "needs_review" ? "Needs review" : r.status}</Badge> },
              { key: "a", label: "", render: r => r.status === "needs_review" ? <span style={{ display: "flex", gap: 6 }}><Btn size="sm" kind="primary" onClick={() => ops.paperDecision(r.id, true)}>Accept</Btn><Btn size="sm" onClick={() => ops.paperDecision(r.id, false)}>Reject</Btn></span> : null }
            ]} />
        </Card>
      </div>
    </Page>
  );
}

function Governance() {
  const { data } = useOps();
  const recent = data.activity.slice().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  return (
    <Page>
      <PageHead title="Governance & AI" sub="Who decides what, and the limits on the agents." right={<DemoPill>Simulation mode on</DemoPill>} />
      <div className="ops-grid">
        <Card className="ops-span-6" title="Rules in force">
          <Gates gates={[
            { label: "Simulation mode", ok: true, detail: "Every agent run, message and payment is simulated. Locked on for the demo." },
            { label: "No autonomous pricing", ok: true, detail: "Quotes are priced and approved by people." },
            { label: "No automated safety decisions", ok: true, detail: "Emergency priority and specialist specifications need a person." },
            { label: "Independent measurement check", ok: true, detail: "A revision is approved only by someone other than the measurer." },
            { label: "Customer messages need office approval", ok: true, detail: "Approved drafts are marked sent in the demo; nothing is delivered." },
            { label: "Schedule changes need office approval", ok: true, detail: "Proposals never move a booking on their own." }
          ]} />
        </Card>
        <Card className="ops-span-6" title="Agent limits">
          {AGENTS.map(a => <div key={a.id} className="ops-row"><div className="main"><div className="t">{a.name}</div><div className="m">{a.approval}</div></div></div>)}
        </Card>
        <Card className="ops-span-12" title="Audit history" sub="Latest entries; the full stream is in Activity" right={<Btn size="sm" onClick={() => go("Activity", "all")}>Open Activity</Btn>}>
          {recent.map(e => <div key={e.id} className="ops-row"><div className="main"><div className="t" style={{ fontWeight: 400 }}>{e.actor}: {e.action}</div><div className="m">{fmtDateTime(e.at)} · {e.source}</div></div></div>)}
        </Card>
      </div>
    </Page>
  );
}

const THEME_OPTIONS = [
  { id: "rathmines", label: "Rathmines dark" }, { id: "rathmines-light", label: "Rathmines light" },
  { id: "harbour", label: "Pulse Harbour" }, { id: "light", label: "Pulse Cream" }
];

function Experience() {
  const { ui } = useOps();
  const theme = currentTheme();
  return (
    <Page>
      <PageHead title="Experience" sub="Theme, default brand filter, density and resetting the demo." />
      <div className="ops-grid">
        <Card className="ops-span-6" title="Theme">
          <Chips label="Theme" value={theme} onChange={id => setTheme(id)} options={THEME_OPTIONS} />
          <div className="ops-note" style={{ marginTop: 8 }}>The Rathmines themes use the demo navy, slate and teal palette.</div>
        </Card>
        <Card className="ops-span-6" title="Brand filter">
          <Chips label="Brand" value={ui.brand} onChange={b => ops.setBrand(b)} options={[{ id: "ALL", label: "All brands" }, ...BRAND_IDS.map(b => ({ id: b, label: BRANDS[b].name }))]} />
          <div className="ops-note" style={{ marginTop: 8 }}>Same control as the top bar. Saved in this browser.</div>
        </Card>
        <Card className="ops-span-6" title="Density">
          <Chips label="Density" value={ui.density} onChange={x => ops.setDensity(x)} options={[{ id: "comfortable", label: "Comfortable" }, { id: "compact", label: "Compact" }]} />
        </Card>
        <Card className="ops-span-6" title="Reset demo">
          <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>Discard every local change and return to the Thursday 12 November 2026, 09:00 scenario.</div>
          <div style={{ marginTop: 10 }}><Btn kind="danger" onClick={() => ops.openModal("reset")}>Reset demo…</Btn></div>
        </Card>
      </div>
    </Page>
  );
}
