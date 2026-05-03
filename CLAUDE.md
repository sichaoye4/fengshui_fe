# Fengshui FE — Claude Context

## Must read first

- [README.md](README.md) — architecture, tab ownership, state flow, module map
- [src/lib/payload.ts](src/lib/payload.ts) — API payload mapping layer (wire field names differ from UI field names here)
- [../fengshui/docs/backend_api_contract.md](../fengshui/docs/backend_api_contract.md) — authoritative wire field inventory

## Related

- [../fengshui/README.md](../fengshui/README.md) — backend architecture hub
- [../fengshui/fengshui_formula_summary.md](../fengshui/fengshui_formula_summary.md) — core capability map

## Key rules

- UI field names and API wire field names are NOT always the same. `payload.ts` is the mapping boundary.
- When renaming a UI field, check `payload.ts` and `backend_api_contract.md` before touching the wire format.
- `HouseProfileInput` on the backend extends `StrictModel` (extra = forbid) — unknown fields cause 422 rejection.
