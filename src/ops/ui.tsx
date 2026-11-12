/* Shared building blocks for the operational modules, drawn with Pulse tokens. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { BrandId, EntityRef, Stage } from "./types";
import { ops, useOps } from "./store";
import { brandName, STAGE_LABEL, type Health, type Tone } from "./selectors";
import { BRANDS } from "./fixtures";

export const ICON = {
  alert: "M12 8v5 M12 16.5v.5 M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  clock: "M12 7v5l3.4 2 M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9",
  dot: "M12 12h.01",
  block: "M5.6 5.6l12.8 12.8 M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9",
  pause: "M9 6v12 M15 6v12",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  x: "M6 6l12 12 M18 6 6 18",
  plus: "M12 5v14 M5 12h14",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  mail: "M4 6h16v12H4z M4 7l8 6 8-6",
  note: "M6 3.5h8l4 4V20.5H6z M14 3.5v4h4 M9 12h6 M9 15.5h4",
  pin: "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  tool: "M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.6-.6-.6-2.6 2.6-2.2Z",
  ruler: "M3 17 17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2",
  camera: "M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  undo: "M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3",
  search: "m21 21-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
  sort: "M8 9l4-4 4 4 M16 15l-4 4-4-4"
};

export function Icon({ d, size = 14, stroke = 1.8, style }: { d: string; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", ...style }}>
      <path d={d} />
    </svg>
  );
}

export function Page({ children }: { children: ReactNode }) {
  const { ui } = useOps();
  return <div className={"ops-page" + (ui.density === "compact" ? " ops-compact" : "")}>{children}</div>;
}

export function PageHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="ops-head">
      <div style={{ minWidth: 0 }}>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {right && <div className="ops-head-right">{right}</div>}
    </div>
  );
}

export function Card({ title, sub, right, children, className, style, body = true }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children?: ReactNode; className?: string; style?: CSSProperties; body?: boolean;
}) {
  return (
    <section className={"ops-card " + (className || "")} style={style}>
      {(title || right) && (
        <div className="ops-card-head">
          {title && <h2>{title}</h2>}
          {sub && <span className="ops-sub">{sub}</span>}
          {right && <div className="ops-right">{right}</div>}
        </div>
      )}
      {body ? <div className="ops-card-body">{children}</div> : children}
    </section>
  );
}

const TONE_ICON: Record<Tone, string> = { bad: ICON.alert, warn: ICON.clock, ok: ICON.check, neutral: ICON.dot, accent: ICON.dot };

export function Badge({ tone = "neutral", children, icon, title }: { tone?: Tone | "navy"; children: ReactNode; icon?: string | false; title?: string }) {
  const d = icon === false ? null : icon || (tone === "navy" ? null : TONE_ICON[tone as Tone]);
  return (
    <span className={"ops-badge " + tone} title={title}>
      {d && <Icon d={d} size={11} stroke={2.2} />}
      {children}
    </span>
  );
}

export function HealthBadge({ h, reason }: { h: Health; reason?: boolean }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <Badge tone={h.tone} title={h.reason}>{h.label}</Badge>
      {reason && <span style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.4 }}>{h.reason}</span>}
    </span>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge tone="neutral" icon={false}>{STAGE_LABEL[stage]}</Badge>;
}

export function BrandBadge({ brand, full }: { brand: BrandId; full?: boolean }) {
  return (
    <span className="ops-badge neutral" title={brandName(brand)} style={{ gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: brand === "RG" ? "var(--navy,#18324B)" : brand === "MD" ? "var(--slate,#52748A)" : "var(--teal,#258A88)", flex: "none", boxShadow: "0 0 0 1px var(--border-strong)" }} />
      {full ? brandName(brand) : BRANDS[brand].short}
    </span>
  );
}

export function Btn({ kind = "secondary", size, children, onClick, disabled, title, type = "button", icon }: {
  kind?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm"; children?: ReactNode; onClick?: () => void; disabled?: boolean; title?: string; type?: "button" | "submit"; icon?: string;
}) {
  return (
    <button type={type} className={"ops-btn " + kind + (size ? " " + size : "")} onClick={onClick} disabled={disabled} title={title}>
      {icon && <Icon d={icon} size={13} />}
      {children}
    </button>
  );
}

export function RefLink({ r, children }: { r: EntityRef; children: ReactNode }) {
  return <button type="button" className="ops-link" onClick={(e) => { e.stopPropagation(); ops.open(r); }}>{children}</button>;
}

export function Stat({ k, v, s, onClick, tone }: { k: ReactNode; v: ReactNode; s?: ReactNode; onClick?: () => void; tone?: Tone }) {
  const color = tone === "bad" ? "var(--bad)" : tone === "warn" ? "var(--warn)" : tone === "ok" ? "var(--ok)" : "var(--ink)";
  const inner = (<><div className="k">{k}</div><div className="v" style={{ color }}>{v}</div>{s && <div className="s">{s}</div>}</>);
  return onClick ? <button type="button" className="ops-stat" onClick={onClick}>{inner}</button> : <div className="ops-stat">{inner}</div>;
}

export function KV({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="ops-kv">
      {items.map(([k, v], i) => (<FragmentPair key={i} k={k} v={v} />))}
    </dl>
  );
}
function FragmentPair({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (<><dt>{k}</dt><dd>{v}</dd></>);
}

export function Empty({ text, action }: { text: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ padding: "26px 12px", textAlign: "center", color: "var(--dim)", fontSize: 13 }}>
      <div>{text}</div>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export interface Col<T> {
  key: string; label: ReactNode; render: (r: T) => ReactNode; sort?: (r: T) => string | number; num?: boolean; width?: string; hideBelow?: number;
}

export function Table<T>({ cols, rows, rowKey, onRow, empty, initialSort, caption }: {
  cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string; onRow?: (r: T) => void; empty?: ReactNode; initialSort?: { key: string; dir: 1 | -1 }; caption?: string;
}) {
  const [sort, setSort] = useState(initialSort || null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const c = cols.find(x => x.key === sort.key);
    if (!c?.sort) return rows;
    return rows.slice().sort((a, b) => {
      const x = c.sort!(a), y = c.sort!(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, sort, cols]);
  if (!rows.length) return <>{empty || <Empty text="Nothing here." />}</>;
  return (
    <div className="ops-table-wrap">
      <table className="ops-table">
        {caption && <caption style={{ position: "absolute", left: -9999 }}>{caption}</caption>}
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} className={c.num ? "num" : ""} style={{ width: c.width }} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                {c.sort ? (
                  <button type="button" onClick={() => setSort(s => (s && s.key === c.key ? { key: c.key, dir: (s.dir === 1 ? -1 : 1) as 1 | -1 } : { key: c.key, dir: 1 }))}>
                    {c.label}<span aria-hidden="true" style={{ opacity: sort?.key === c.key ? 1 : .35 }}>{sort?.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : "↕"}</span>
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={rowKey(r)} className={onRow ? "click" : ""} tabIndex={onRow ? 0 : undefined}
              onClick={onRow ? () => onRow(r) : undefined}
              onKeyDown={onRow ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRow(r); } } : undefined}>
              {cols.map(c => <td key={c.key} className={c.num ? "num" : ""}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string; n?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => (
        <button key={o.id} type="button" className={"ops-chip" + (o.id === value ? " on" : "")} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}{o.n !== undefined && <span className="n">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label style={{ position: "relative", display: "flex", alignItems: "center", minWidth: 0, flex: "1 1 220px", maxWidth: 360 }}>
      <span style={{ position: "absolute", left: 11, color: "var(--faint)", display: "flex" }}><Icon d={ICON.search} /></span>
      <input className="ops-input" aria-label={placeholder} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 32 }} />
    </label>
  );
}

export function Field({ label, hint, error, children, full }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={"ops-field" + (full ? " full" : "")}>
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, sub }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; sub?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("keydown", key, true); prev?.focus?.(); };
  }, []);
  return (
    <>
      <div className="ops-scrim top" onClick={onClose} />
      <div className="ops-modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="ops-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{title}</h2>
            {sub && <div className="ops-note" style={{ marginTop: 4 }}>{sub}</div>}
          </div>
          <Btn kind="ghost" size="sm" onClick={onClose} title="Close" icon={ICON.x} />
        </div>
        <div className="ops-modal-body">{children}</div>
        {footer && <div className="ops-modal-foot">{footer}</div>}
      </div>
    </>
  );
}

export function Bars({ data, unit, onPick, picked, max }: {
  data: { id: string; label: string; value: number; display?: string; tone?: string }[]; unit?: string; onPick?: (id: string) => void; picked?: string | null; max?: number;
}) {
  const m = max || Math.max(1, ...data.map(d => d.value));
  return (
    <div role="list">
      {data.map(d => {
        const inner = (
          <>
            <span className="lbl">{d.label}</span>
            <span className="ops-bar" aria-hidden="true"><span style={{ width: Math.max(2, (d.value / m) * 100) + "%", background: d.tone || "var(--slate,#52748A)" }} /></span>
            <span className="val">{d.display ?? d.value}{unit && !d.display ? " " + unit : ""}</span>
          </>
        );
        return onPick ? (
          <button key={d.id} role="listitem" type="button" className={"ops-bar-row" + (picked === d.id ? " on" : "")} aria-pressed={picked === d.id}
            aria-label={d.label + ": " + (d.display ?? d.value) + (unit ? " " + unit : "") + ". Show matching rows"} onClick={() => onPick(d.id)}>{inner}</button>
        ) : <div key={d.id} role="listitem" className="ops-bar-row">{inner}</div>;
      })}
    </div>
  );
}

export function Gates({ gates }: { gates: { label: string; ok: boolean; detail: string; owner?: string }[] }) {
  return (
    <div className="ops-gates">
      {gates.map(g => (
        <div key={g.label} className="ops-gate">
          <span style={{ color: g.ok ? "var(--ok)" : "var(--bad)", marginTop: 1 }}><Icon d={g.ok ? ICON.check : ICON.block} size={15} stroke={2.2} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="gl">{g.label}<span className="ops-note" style={{ marginLeft: 6 }}>{g.ok ? "Passed" : "Blocking"}</span></div>
            <div className="gd">{g.detail}{g.owner ? " · Owner: " + g.owner : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Toasts() {
  const { ui } = useOps();
  if (!ui.toasts.length) return null;
  return (
    <div className="ops-toasts" role="status" aria-live="polite">
      {ui.toasts.map(t => (
        <div key={t.id} className="ops-toast">
          <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", background: t.tone === "bad" ? "var(--bad)" : t.tone === "warn" ? "var(--warn)" : t.tone === "ok" ? "var(--ok)" : "var(--neutral)" }} />
          <span style={{ flex: 1 }}>{t.text}</span>
          {t.undo && ui.undo && <button type="button" onClick={() => ops.undo()}>Undo</button>}
          <button type="button" aria-label="Dismiss" onClick={() => ops.dismissToast(t.id)}><Icon d={ICON.x} size={12} /></button>
        </div>
      ))}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="ops-section">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h3 style={{ flex: 1 }}>{title}</h3>{right}</div>
      {children}
    </div>
  );
}

export function Callout({ tone = "neutral", children }: { tone?: "bad" | "warn" | "ok" | "neutral"; children: ReactNode }) {
  return (
    <div className={"ops-callout " + tone}>
      <span style={{ color: tone === "bad" ? "var(--bad)" : tone === "warn" ? "var(--warn)" : tone === "ok" ? "var(--ok)" : "var(--dim)", marginTop: 2 }}>
        <Icon d={tone === "ok" ? ICON.check : tone === "neutral" ? ICON.note : ICON.alert} size={14} />
      </span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

export function Avatar({ initials, size = 26 }: { initials: string; size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 999, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "var(--navy,#18324B)", color: "var(--navy-ink,#fff)", fontSize: size * 0.36, fontWeight: 600 }}>{initials}</span>
  );
}

export function DemoPill({ children = "Demo data" }: { children?: ReactNode }) {
  return <span className="ops-demo-pill"><Icon d={ICON.note} size={11} />{children}</span>;
}
