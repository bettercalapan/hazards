# Hazards

Localized hazard-risk mapping for Calapan City.

## Development

```sh
pnpm install
pnpm run dev
```

Run the project checks in this order:

```sh
pnpm run gen
pnpm run check
pnpm run build
pnpm run lint
pnpm run test
```

`pnpm run gen` regenerates Cloudflare Worker types after changing `wrangler.jsonc`.

## Deployment

The app uses SvelteKit with the Cloudflare adapter and deploys to Workers through Wrangler.

```sh
pnpm run deploy
```

The first map view is a prototype. Its flood polygon is intentionally not official hazard data.
