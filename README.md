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

The current map view shows Calapan's 62 barangay boundaries from OCHA Philippines' COD-AB dataset, sourced from NAMRIA and PSA, plus the UP Resilience Institute NOAH Center's 5-year, 25-year, and 100-year flood hazard classes. The flood classes are source-provided modeled information, not a guarantee of future flooding. The 3D view uses Mapzen Terrain Tiles with elevation data sourced from USGS, NASA, and other contributors. The alert panel reads PAGASA's Public Alert CAP feed and shows active alerts whose geographic areas include Oriental Mindoro.

The localized flood vector tiles and all-period barangay summaries are generated from the downloaded NOAH shapefiles with `pnpm run generate:flood`. The script expects the source files under `~/downloads/noah/{5yr,25yr,100yr}` by default, or under the directory set in `NOAH_DATA_DIR`.
