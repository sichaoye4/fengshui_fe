# Frontend Source Agent Notes

Purpose: fast navigation for `frontend/src/`, which owns the actual UI behavior, reducer state, payload wiring, floorplan editing, and tab-level presentation.

Related docs:

- [../frontend.md](../frontend.md)
- [../../README.md](../../README.md)
- [../../docs/backend_api_contract.md](../../docs/backend_api_contract.md)
- [../../fengshui_formula_summary.md](../../fengshui_formula_summary.md)

## Open This When

- fixing a visible UI bug
- changing which tab renders which results
- adjusting reducer or persistence behavior
- wiring frontend inputs to backend payloads
- changing floorplan editor behavior

## Start Here

- app shell and tab composition:
  - `App.tsx`
- reducer and runtime state:
  - `state/appState.ts`
- shared types:
  - `types/fengshui.ts`
- payload and derivation boundaries:
  - `lib/payload.ts`
  - `lib/derivation.ts`

## Folder Ownership

- `components/`
  - visible UI panels and editor surfaces
- `api/`
  - backend request functions
- `lib/`
  - derivation, payload, persistence, geometry, helper logic
- `state/`
  - reducer and state transitions
- `i18n/`
  - translation keys and dictionaries
- `types/`
  - shared TS contracts

## High-Signal Components

- `components/BazhaiPanel.tsx`
- `components/LiqiHousePanel.tsx`
- `components/HouseLiqiWorkspace.tsx`
- `components/TemporalPanel.tsx`
- `components/HousePeriodPanel.tsx`
- `components/SectionTabs.tsx`
- `components/CompactDetailGrid.tsx`
- `components/FlyingStarGrid.tsx`
- `components/ResultsPanel.tsx`
- `components/FloorplanEditor.tsx`
- `components/ExternalShaChecklist.tsx`

Legacy-but-present:

- `components/FundamentalSummaryPanel.tsx`
  - not in the active main tab flow

## Safe To Ignore First

- `testSetup.ts`
- `vite-env.d.ts`
- component tests unrelated to the area you are touching
- `components/FundamentalSummaryPanel.tsx` unless working on legacy cleanup

## Key Invariants

- top shared inputs stay mounted regardless of active tab
- active tabs are `house_liqi`, `temporal`, `zhai_yun`, `structure`, `static_house`
- top analysis tabs use compact labels; first-three-tab detail sections are handled by component-local subtabs
- local subtab state is not part of persisted project snapshots
- only `structure` currently owns findings-filter state
- raw input text should stay in draft form until derivation/payload boundaries
- frontend should not invent formula logic that already exists in `fengshui_core/`

## Tests As Truth

- `App.test.tsx`
  - top-level workflow and tab behavior
- `state/appState.test.ts`
  - reducer behavior
- `api/temporal.test.ts`
  - temporal fetch behavior
- `components/*.test.tsx`
  - component-specific rendering expectations
