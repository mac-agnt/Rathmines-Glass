# Pulse — Harbour

React build of the **Pulse v5 Harbour** design, customised as an operations demo for **Rathmines Glass** (with Mirrors Dublin and Slim Glaze Heritage). Every customer, job, amount and event is illustrative demo data.

Every page, theme and interaction from the design is here. Screens were checked against the original mockup and match pixel for pixel at 1440×900 and 1024×720.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

## What's in it

| Area | Where |
| --- | --- |
| Pages kept from the template: Home (chat), Records (Ontology, Files, Contacts) | `src/views/pages/` |
| Overlays: ⌘K palette, agent studio, Helios mini chat, work viewer, new record, background gallery | `src/views/overlays/` |
| App frame: sidebar, top bar, notifications | `src/views/AppShell.tsx` |
| State and behaviour | `src/logic/PulseLogic.js` |
| Shell config (nav, ontology labels, sample files) | `src/logic/data.js` |
| Operational demo store: typed fixtures, selectors, actions | `src/ops/` |
| Module pages (Enquiries, Jobs, Schedule, Production, Finance, Dashboard, Work, Activity, Settings, Agents, Records tabs) | `src/ops/pages/` |
| Agent avatar | `src/components/AgentFace.tsx` |
| Theme tokens (Harbour, light and 11 more), animations | `src/styles/pulse.css` |

## How it fits together

- **`PulseLogic`** holds all state. Its `renderVals()` returns one flat object `v`.
- **Views** are plain React components that render from `v`.
- **`LogicHost`** (`src/runtime/logic.tsx`) mounts the logic and re-renders on `setState`.
- **Backgrounds** live in `src/App.tsx`:
  - `dashboardBackdrop`: the colour of the Dashboard KPI background
  - `kpiBackdropOn`: whether that background shows
  - `recordsBackdrop`: the colour of the Records wash (`""` uses the theme gradient)
- **Customising for a client:** read `CLAUDE.md` first. It lists the layout rules every copy keeps.

## Updating from Claude Design

Export the new version, replace the file in `design/`, then run:

```bash
npm run import-design
```

This regenerates:

- `src/views/`
- `src/styles/pulse.css`
- `src/styles/interactions.css`
- `src/logic/`

`AgentFace` is hand-written and left alone. Commit before running, because it overwrites hand edits to those files.

## Fixed from the mockup

In the mockup, the work viewer's wrapper `<div>` was never closed. As a result, the ⌘K palette, agent studio, new record dialog and background gallery could only appear while the work viewer was open. They now open on their own. The fix is applied in `tools/import-design.mjs`.

## Rathmines Glass demo

- **Scenario clock:** Thursday 12 November 2026, 09:00 Europe/Dublin (`src/ops/time.ts`). Every age, overdue and working-day figure uses it; the browser clock only drives the Home greeting.
- **One store:** `src/ops/store.ts` holds every record. Modules read it through `src/ops/selectors.ts`; local actions write back and append to Activity. Changes persist in `localStorage` until **Settings → Experience → Reset demo**.
- **Simulation only:** no backend, no external messages, no payments, no API credentials. Xero, Square, email and telephony are mocks.
- Run on a free port with the `rathmines-dev` launch config (port 5183) if 5176 is taken.
