# Repository Instructions

- The app uses SvelteKit with TypeScript, MapLibre GL JS, and the Cloudflare adapter, and deploys to Workers through Wrangler.
- Use pnpm scripts from `package.json`; run `pnpm run gen` after changing `wrangler.jsonc`, then `pnpm run check`, `pnpm run build`, `pnpm run lint`, and `pnpm run test`.
- MapLibre must be initialized in browser-only code because WebGL map APIs are not available during server rendering.
- Keep future contributions compatible with the GPL-3.0 license in `LICENSE`.
- Keep prototype map data clearly labeled until it is replaced with authoritative hazard data.
- Make refactors in small, independently validated slices, preserving behavior between each slice.
- Keep map setup, layer management, controls, and interactions separable, with pure map utilities covered by unit tests.
- Keep generated hazard geometry deterministic, validate generated outputs against schemas, and store freshness metadata separately.
- Run `pnpm run test:browser` for changes affecting MapLibre behavior or browser interactions.
