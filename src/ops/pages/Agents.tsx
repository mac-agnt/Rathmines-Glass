import { useState } from "react";
import { ops, useOps, go } from "../store";
import { AGENTS } from "../fixtures";
import { personName, refLabel } from "../selectors";
import { fmtDateTime } from "../time";
import AgentFace from "../../components/AgentFace";
import { Badge, Btn, Card, DemoPill, Empty, Page, PageHead, RefLink } from "../ui";
import { ApprovalCard } from "./Work";

export default function Agents({ tab }: { tab: string }) {
  if (tab === "runs") return <Runs />;
  if (tab === "approvals") return <AgentApprovals />;
  return <Overview />;
}

function Overview() {
  const { data } = useOps();
  return (
    <Page>
      <PageHead title="Agents" sub="Seven operational agents. Each reads the demo records, proposes, and stops at a person. No real model or external API runs behind them." right={<DemoPill>Demo simulation</DemoPill>} />
      <div className="ops-grid">
        {AGENTS.map(a => {
          const runs = data.agentRuns.filter(r => r.agentId === a.id).sort((x, y) => (x.at < y.at ? 1 : -1));
          const last = runs[0];
          const refs = last ? last.findings.flatMap(f => f.refs).slice(0, 4) : [];
          const pending = data.approvals.filter(x => x.agentId === a.id && x.status === "pending").length;
          return (
            <Card key={a.id} className="ops-span-4" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 16 }}>
                <AgentFace shape={a.shape} state={pending ? "waiting" : "complete"} tint={a.tint} size={"44"} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</div>
                  <div className="ops-note">Last simulated run {last ? fmtDateTime(last.at) : "never"}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55, marginTop: 12 }}>{a.job}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, lineHeight: 1.45, color: "var(--dim)", padding: "5px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)" }}>{a.approval}</span>
                {pending > 0 && <Badge tone="warn">{pending} waiting for approval</Badge>}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--dim)" }}>
                Evidence: {refs.length ? refs.map((r, i) => <span key={i}>{i ? ", " : ""}<RefLink r={r}>{refLabel(data, r).split(" ")[0]}</RefLink></span>) : "no linked records"}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <Btn size="sm" kind="primary" onClick={() => ops.runAgent(a.id)}>Run now (simulation)</Btn>
                <Btn size="sm" onClick={() => go("Agents", "runs")}>Runs</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

function Runs() {
  const { data } = useOps();
  const runs = data.agentRuns.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  const [sel, setSel] = useState<string>(runs[0]?.id || "");
  const run = runs.find(r => r.id === sel) || runs[0];
  const agent = run ? AGENTS.find(a => a.id === run.agentId)! : null;
  const approval = run?.approvalId ? data.approvals.find(a => a.id === run.approvalId) : undefined;
  return (
    <Page>
      <PageHead title="Runs" sub="Every simulated run with its inputs, findings, proposed action and what actually happened locally." right={<DemoPill>Demo simulation</DemoPill>} />
      <div className="ops-grid">
        <Card className="ops-span-4" title="Run log" sub={runs.length + " runs"}>
          {runs.map(r => {
            const a = AGENTS.find(x => x.id === r.agentId)!;
            return (
              <button key={r.id} type="button" className="ops-row" onClick={() => setSel(r.id)} aria-pressed={r.id === run?.id}
                style={r.id === run?.id ? { background: "var(--accent-faint)", boxShadow: "inset 0 0 0 1px var(--accent-line)" } : undefined}>
                <AgentFace shape={a.shape} state="idle" tint={a.tint} size={"26"} />
                <div className="main"><div className="t">{a.name}</div><div className="m">{fmtDateTime(r.at)} · {r.findings.length} findings</div></div>
              </button>
            );
          })}
        </Card>
        <div className="ops-span-8" style={{ minWidth: 0 }}>
          {run && agent ? (
            <Card title={agent.name + " · " + run.id} sub={fmtDateTime(run.at)} right={<Badge tone="accent" icon={false}>Demo simulation</Badge>}>
              <div className="ops-section" style={{ marginTop: 0 }}><h3>Inputs</h3><ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--body)" }}>{run.inputs.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              <div className="ops-section"><h3>Findings</h3>
                {run.findings.map((f, i) => (
                  <div key={i} className="ops-row"><div className="main"><div className="t" style={{ fontWeight: 400 }}>{f.text}</div>
                    {f.refs.length > 0 && <div className="m">Evidence: {f.refs.map((r, k) => <span key={k}>{k ? ", " : ""}<RefLink r={r}>{refLabel(data, r)}</RefLink></span>)}</div>}</div></div>
                ))}
              </div>
              <div className="ops-section"><h3>Proposed action</h3><div style={{ fontSize: 13, color: "var(--body)" }}>{run.proposed}</div><div className="ops-note" style={{ marginTop: 4 }}>{agent.approval}</div></div>
              <div className="ops-section"><h3>Local result</h3>
                <div style={{ fontSize: 13, color: "var(--body)" }}>{approval ? (approval.status === "pending" ? "Waiting for " + personName(approval.approverId) + " in Work, Approvals." : "Approval " + approval.status + (approval.decidedAt ? " " + fmtDateTime(approval.decidedAt) : "") + ".") : run.result}</div>
                {approval && approval.status === "pending" && <div style={{ marginTop: 8 }}><Btn size="sm" onClick={() => go("Agents", "approvals")}>Open approval</Btn></div>}
              </div>
            </Card>
          ) : <Card><Empty text="No runs yet." /></Card>}
        </div>
      </div>
    </Page>
  );
}

function AgentApprovals() {
  const { data } = useOps();
  const list = data.approvals.filter(a => a.agentId).sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || (a.createdAt < b.createdAt ? 1 : -1));
  return (
    <Page>
      <PageHead title="Agent approvals" sub="The same approval records as Work, filtered to those an agent proposed. Deciding here or in Work is the same action." right={<DemoPill />} />
      <div className="ops-grid">
        {list.map(a => <div key={a.id} className="ops-span-6"><ApprovalCard a={a} /></div>)}
        {!list.length && <div className="ops-span-12"><Card><Empty text="No agent proposals." /></Card></div>}
      </div>
    </Page>
  );
}
