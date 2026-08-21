![Banner](./static/banner.png)

# Overview

Hazards is BetterCalapan's localized hazard-risk map for Calapan City. It helps residents explore barangay-level hazard zones and critical facilities.

> [!NOTE]  
> The platform is currently in beta. Versions >= 0.1.x are usable and publicly released, but the version will be tagged as 1.0.0 once the app has been optimized.

## Tech Stack

| Tool               | Purpose            |
| ------------------ | ------------------ |
| SvelteKit          | Framework          |
| TypeScript         | Type safety        |
| MapLibre GL JS     | Interactive maps   |
| Vite               | Build tool         |
| Vanilla CSS        | Styling            |
| Vitest             | Unit testing       |
| Playwright         | Browser testing    |
| Cloudflare Workers | Hosting            |
| pnpm               | Package management |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm run dev

# Run checks in order
pnpm run check
pnpm run build
pnpm run lint
pnpm run test
```

If `wrangler.jsonc` changes, run `pnpm run gen` before the checks.

Browser tests require Chromium:

```bash
pnpm exec playwright install chromium
pnpm run test:browser
```

For network-related browser failures, rerun serially:

```bash
pnpm exec playwright test --workers=1
```

## Deployment

```bash
pnpm run deploy
```

The app deploys to Cloudflare Workers through Wrangler.

## Data Sources

| Source                                                                  | Data                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| [OCHA Philippines COD-AB](https://data.humdata.org/dataset/cod-ps-phil) | Calapan barangay boundaries                      |
| [UP NOAH Center](https://noah.up.edu.ph/)                               | Flood, storm-surge, and landslide hazard classes |
| [GeoRisk Philippines](https://hazardhunter.georisk.gov.ph/)             | Ground shaking, liquefaction, and tsunami layers |
| [PANaHON](https://www.panahon.gov.ph/)                                  | Typhoon tracks                                   |
| [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)    | 3D elevation data                                |

## Data Generation

Generate localized hazard tiles and barangay summaries:

```bash
pnpm run generate:hazards
```

The generator expects NOAH inputs under `~/downloads/noah/{flood,storm-surge,landslide}`. Set `NOAH_DATA_DIR` to use another root.

Refresh the critical-facilities snapshot:

```bash
pnpm run generate:critical-facilities
```

Review source freshness, coverage, licensing, and verification status before publishing refreshed data.

## License

GNU GPL v3.0. See [LICENSE](LICENSE) for details.
