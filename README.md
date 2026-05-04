# Frontend Architecture Reference

## Agent Quick Use

- Purpose: UI architecture, tab ownership, state flow, module map, and frontend test map.
- Open this when: fixing UI bugs, changing panels, adding tabs, touching reducer state, or wiring frontend to API/core outputs.
- Skip this when: changing backend wire shapes without UI behavior changes, or editing formula logic only.
- Deepest related code paths:
  - `src/App.tsx`
  - `src/state/appState.ts`
  - `src/components/`
  - `src/lib/`
- Related docs:
  - [../fengshui/README.md](../fengshui/README.md)
  - [../fengshui/docs/backend_api_contract.md](../fengshui/docs/backend_api_contract.md)
  - [../fengshui/fengshui_formula_summary.md](../fengshui/fengshui_formula_summary.md)
- Last aligned with: compact 6-tab analysis layout, Jingzhai/static-house results, local subtabs for dense result panels, house-period diagnostics, and Dongzhai floor results.

## Local Development

### Prerequisites

- Node.js 18+
- Backend API running (see sibling `../fengshui/README.md`)

### Setup & Run

```bash
npm install
npm run dev
```

The dev server starts at `http://127.0.0.1:5173`. Browser API calls use relative `/api/...` URLs and are proxied by Vite to `FENGSHUI_API_BASE_URL`, which defaults to `http://127.0.0.1:8000`. Put the value in `.env` or set it in the shell before starting the frontend.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development server with hot-reload |
| `npm run intra` | Start development server on `0.0.0.0` for intranet access |
| `npm run build` | TypeScript type-check + production build |
| `npm test` | Run Vitest test suite |

### Typical Workflow

1. Start the backend API from `../fengshui/`:
   ```bash
   cd ../fengshui
   source .venv/bin/activate
   uvicorn fengshui_api.main:app --reload
   ```
2. In a separate terminal, start the frontend:
   ```bash
   cd ../fengshui_fe
   # optional: set FENGSHUI_API_BASE_URL if the backend is not on 127.0.0.1:8000
   npm run dev
   ```
3. Open `http://127.0.0.1:5173` in a browser.
4. Enter house/person data and click **Evaluate** to see results.

## Purpose

- Describe the current frontend shape as shipped.
- Route contributors to the right files before they open large source trees.
- Keep UI ownership separate from backend contract and core formula logic.

## Open This When

- a tab is showing the wrong content
- a panel needs redesign or re-grouping
- reducer state or persistence behavior changes
- a frontend API integration needs to be wired or debugged
- a floorplan/editor workflow needs to change

## Do Not Use This For

- backend request/response details beyond ownership boundaries
- formula derivation rules inside `fengshui_core/`
- exhaustive source walkthroughs

## Fast Path

- Need to adjust tab layout:
  - open `src/App.tsx`
- Need to adjust state transitions:
  - open `src/state/appState.ts`
- Need to change evaluation payload wiring:
  - open `src/lib/payload.ts`
- Need to change derived geometry/layout values:
  - open `src/lib/derivation.ts`
- Need to change a visible result block:
  - open `src/App.tsx`, then the owning component in `src/components/`

## System Map

### Page Shape

The app is organized as:

1. header with language switch
2. stable top input block
3. compact full-width tab bar
4. full-width tab workspace below

The input block stays mounted regardless of tab selection.
The top analysis tabs use short visible labels and full ARIA labels; data-heavy result tabs use local subtabs.

### Active Tabs

1. `house_liqi`
   - local subtabs for Bazhai + House Liqi
2. `temporal`
   - local subtabs for Gregorian conversion + annual/monthly temporal + annual flying star
3. `zhai_yun`
   - local subtabs for Hetu five yun, Sanyuan jiuyun, Tonglin shanyun, Zhuanlin shanyun
4. `structure`
   - floorplan editor + manual structure/shape input + combined `INT-*`, `EXT-*`, `MIT-*` findings
5. `static_house`
   - Jingzhai/static-house body analysis from `POST /api/v1/jingzhai/full`
6. `dongzhai`
   - apartment/鍔ㄥ畢 floor evaluation from `POST /api/v1/bazhai/dongzhai-floor`

### Data Flow

1. `App` loads draft state
2. reducer owns runtime state
3. derivation computes backend-ready metrics from editor + inputs
4. payload builders create request bodies
5. API clients call backend endpoints
6. results are merged back into UI state
7. tab components render slices of that state

## Key Files

### Entry and Layout

- `src/App.tsx`
  - top-level page composition, event handlers, orchestration
- `src/main.tsx`
  - React bootstrap
- `src/styles.css`
  - global layout and visual system

### State and Types

- `src/state/appState.ts`
  - reducer, initial state, snapshot conversion, undo/redo behavior
- `src/types/fengshui.ts`
  - shared frontend domain and API types
- `src/constants.ts`
  - defaults, option sets, presets

### API and Domain Helpers

- `src/api/client.ts`
  - main evaluate + Bazhai requests
- `src/api/temporal.ts`
  - temporal, flying-star, Liqi, and period requests
- `src/lib/payload.ts`
  - request building and hash generation
- `src/lib/derivation.ts`
  - derived geometry/layout metrics
- `src/lib/bazi.ts`
  - calculated date/pillar helpers
- `src/lib/persistence.ts`
  - draft load/save/import/export

### Components

- `src/components/BazhaiPanel.tsx`
- `src/components/LiqiHousePanel.tsx`
- `src/components/HouseLiqiWorkspace.tsx`
- `src/components/TemporalPanel.tsx`
- `src/components/HousePeriodPanel.tsx`
- `src/components/SectionTabs.tsx`
- `src/components/CompactDetailGrid.tsx`
- `src/components/FlyingStarGrid.tsx`
- `src/components/ResultsPanel.tsx`
- `src/components/FloorplanEditor.tsx`
- `src/components/ToolPanel.tsx`
- `src/components/ExternalShaChecklist.tsx`

Legacy-but-present:

- `src/components/FundamentalSummaryPanel.tsx`
  - retained in repo, not in current main tab flow

## Important Invariants

- shared house/person/time inputs live in the top input block and do not remount on tab switch
- active analysis tabs are `house_liqi`, `temporal`, `zhai_yun`, `structure`, `static_house`, `dongzhai`
- main analysis tabs must stay compact enough for at least six desktop tabs; local subtabs absorb section-level detail
- local subtab state is component-local and is not persisted in project snapshots
- only the `structure` tab currently owns findings-filter state
- raw user-editable numeric text stays in draft state until derivation/payload boundaries
- `FundamentalSummaryPanel` is not the source of truth for current results layout
- frontend should treat house Liqi and flow-year temporal as different concerns

## Common Change Scenarios

### Change tab ownership

Read first:

- `src/App.tsx`
- `src/types/fengshui.ts`
- `src/state/appState.ts`

### Change top input block behavior

Read first:

- `src/App.tsx`
- `src/styles.css`
- `src/lib/persistence.ts`

### Change a result component

Read first:

- owning component in `src/components/`
- `src/App.tsx`
- relevant tests in `src/components/*.test.tsx` or `src/App.test.tsx`

### Change API wiring

Wire field names in payload builders must match the backend contract. The UI field name may differ from the API wire name 鈥?`payload.ts` is the mapping layer that must be reviewed independently.

Read first:

- `src/api/client.ts` or `src/api/temporal.ts`
- `src/lib/payload.ts`
- [../fengshui/docs/backend_api_contract.md](../fengshui/docs/backend_api_contract.md) 鈥?wire field inventory

## Related Docs

- Agent hub: [../fengshui/README.md](../fengshui/README.md)
- Backend contract: [../fengshui/docs/backend_api_contract.md](../fengshui/docs/backend_api_contract.md)
- Core capability map: [../fengshui/fengshui_formula_summary.md](../fengshui/fengshui_formula_summary.md)
