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

The current map view shows Calapan's 62 barangay boundaries from OCHA Philippines' COD-AB dataset, sourced from NAMRIA and PSA. Hazard layers and incident feeds are not connected yet.
