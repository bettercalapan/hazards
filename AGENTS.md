# Repository Instructions

## Stack and Entrypoints

- Single-package SvelteKit app using TypeScript, Svelte 5 runes, MapLibre GL JS, the Cloudflare adapter, and Wrangler Worker deployment. Use `pnpm@11.20.0`.
- `src/routes/+page.svelte` owns the UI. `src/routes/+page.server.ts` fetches PAGASA alerts and PANaHON typhoon tracks, degrading unavailable feeds to empty/unavailable state.
- `src/lib/components/HazardMap.svelte` dynamically imports and initializes MapLibre in `onMount`. Keep all WebGL and DOM map code browser-only.
- Keep map setup and layer management under `src/lib/map`; keep pure map/data logic covered by Vitest specs.

## Commands and Verification

- After `wrangler.jsonc` changes, run `pnpm run gen`. Standard order: `pnpm run gen`, `pnpm run check`, `pnpm run build`, `pnpm run lint`, `pnpm run test`.
- Deploy with `pnpm run deploy`.
- Browser checks require `pnpm exec playwright install chromium`, then `pnpm run test:browser`. Playwright starts the Vite server and stubs PAGASA and PANaHON feeds.
- Focused examples: `pnpm run test:unit -- src/lib/map/hazard-layers.spec.ts` and `pnpm run test:browser -- tests/browser/map.smoke.spec.ts -g "test name"`.

## Data and Provenance

- `pnpm run generate:hazards` runs `scripts/generate-hazard-data.mjs`. Default NOAH inputs are `~/downloads/noah/flood/{5yr,25yr,100yr}`, `~/downloads/noah/storm-surge/ss-advisory-{1,2,3,4}`, and `~/downloads/noah/landslide/hazards`; override the root with `NOAH_DATA_DIR`. It writes localized vector tiles under `static` and summaries plus `src/lib/data/hazard-data-manifest.json`.
- `src/lib/data/phivolcs-*.json` are local snapshots, not browser fetches. `pnpm run generate:critical-facilities` fetches configured sources, merges curated points, filters to Calapan, and rewrites `static/critical-facilities.json`.
- Before publishing refreshed data, review source freshness, coverage, licensing, and verification status. Preserve source/date/license notes. `sourceDate` is source metadata; `preparedAt` and `generatedAt` are local timestamps.
- Hazard layers are source-provided hazard-proneness data, not live warnings or site-specific building assessments. Keep that distinction clear.

## License

- Keep contributions compatible with `LICENSE` (GPL-3.0).
