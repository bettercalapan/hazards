# Repository Instructions

## Architecture

- Single-package SvelteKit app using TypeScript, Svelte 5 runes, MapLibre GL JS, the Cloudflare adapter, and Wrangler Worker deployment. Use `pnpm@11.20.0`.
- `src/routes/+page.svelte` owns map/share state, URL synchronization, barangay search, and mobile drawer coordination. `Sidebar.svelte` owns hazard information presentation; `MapControls.svelte` remains controlled through callbacks.
- `src/routes/+page.server.ts` fetches PAGASA alerts and PANaHON tracks concurrently. Preserve independent fallback behavior when either feed fails.
- `HazardMap.svelte` dynamically imports MapLibre in `onMount`. Keep WebGL and DOM map work browser-only; use `$effect` only to synchronize reactive state with MapLibre.
- Keep map setup and layer managers under `src/lib/map`; keep testable map/data logic in TypeScript covered by Vitest.
- Put separate type-only imports before all value imports in TypeScript and Svelte scripts.

## Commands and Verification

- After `wrangler.jsonc` changes, run `pnpm run gen` first. Otherwise verify in order: `pnpm run check`, `pnpm run build`, `pnpm run lint`, `pnpm run test`.
- Deploy with `pnpm run deploy`.
- Browser checks require `pnpm exec playwright install chromium`, then `pnpm run test:browser`. Playwright starts Vite but still depends on external map/terrain assets; `page.route` does not intercept server-side feed requests.
- Before treating network-related browser failures as regressions, rerun with `pnpm exec playwright test --workers=1`.
- Focused examples: `pnpm exec vitest run src/lib/map/hazard-layers.spec.ts` and `pnpm exec playwright test tests/browser/map.smoke.spec.ts -g "test name" --workers=1`.

## Data and Provenance

- `pnpm run generate:hazards` expects NOAH inputs under `~/downloads/noah/{flood,storm-surge,landslide}` by default; override the root with `NOAH_DATA_DIR`.
- Do not hand-edit generated `static/calapan-*-tiles/`, hazard summary JSON, `hazard-data-manifest.json`, `static/critical-facilities.json`, or `worker-configuration.d.ts`; use their package scripts.
- `src/lib/data/phivolcs-*.json` are pinned generator inputs, not browser fetches. Hazard generation clips them and NOAH shapefiles to Calapan.
- `pnpm run generate:critical-facilities` fetches configured sources, merges curated points, filters to Calapan, and rewrites the static snapshot.
- Before publishing refreshed data, review source freshness, coverage, licensing, and verification status. Preserve source/date/license notes. `sourceDate` is source metadata; `preparedAt` and `generatedAt` are local timestamps.
- Hazard layers are source-provided hazard-proneness data, not live warnings or site-specific building assessments. Keep that distinction clear.

## License

- Keep contributions compatible with `LICENSE` (GPL-3.0).
