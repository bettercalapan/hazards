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

The current map view shows Calapan's 62 barangay boundaries from OCHA Philippines' COD-AB dataset, sourced from NAMRIA and PSA, plus the UP Resilience Institute NOAH Center's flood, storm-surge, and landslide hazard classes. It also includes DOST-PHIVOLCS Ground Shaking, Liquefaction, and Tsunami vector layers from GeoRiskPH HazardHunter. These are official hazard-proneness layers, not a site-specific building assessment or a live warning. Other hazard classes are source-provided modeled information, not a guarantee of future flooding, storm surge, or landslides. The 3D view uses Mapzen Terrain Tiles with elevation data sourced from USGS, NASA, and other contributors. The alert panel reads PAGASA's Public Alert CAP feed and shows active alerts whose geographic areas include Oriental Mindoro.

The localized hazard vector tiles and barangay summaries are generated with `pnpm run generate:hazards`. The script expects flood source files under `~/downloads/noah/flood/{5yr,25yr,100yr}`, storm-surge source files under `~/downloads/noah/storm-surge/ss-advisory-{1,2,3,4}`, and landslide source files under `~/downloads/noah/landslide/hazards` by default, or under the directory set in `NOAH_DATA_DIR`. The PHIVOLCS Feature Layer snapshots are pinned under `src/lib/data/phivolcs-*.json`; they are clipped to Calapan during generation and are not fetched by the browser. PHIVOLCS may revise these source layers, so refresh the snapshots and regenerate the tiles during data reviews.

## Data Provenance

- `sourceDate` is a date supplied by the source metadata, not the local file modification date.
- `preparedAt` in `src/lib/data/hazard-data-manifest.json` is when the local hazard tiles and barangay summaries were generated.
- The downloaded NOAH flood and landslide shapefiles do not include source dates, so the app shows that the date is unknown.
- The storm-surge shapefile metadata includes a 19 July 2021 creation date. This is shown as a creation date, not as a confirmed update date.
- The pinned PHIVOLCS snapshots do not include source publication dates.
- Hazard layers are clipped to Calapan City. Current licensing notes are kept beside each dataset metadata object and must be rechecked before redistribution.
- Local PDRRMO, police, fire, public safety, and provincial hospital contacts are sourced from the Province of Oriental Mindoro contact page and verified on 18 August 2026.
