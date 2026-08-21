import type { PropertyValueSpecification } from 'maplibre-gl';
import type { ReturnPeriod } from '$lib/data/flood';
import type { LandslideLayer } from '$lib/data/landslide';
import type { SeismicLayer } from '$lib/data/seismic';
import type { StormSurgeAdvisory } from '$lib/data/storm-surge';
import type { HazardFamily } from '$lib/map-state';

import { calapanCityBounds } from '$lib/data/calapan-boundary';
import { floodHazardPeriods } from '$lib/data/flood';
import { landslideHazards } from '$lib/data/landslide';
import { seismicHazards } from '$lib/data/seismic';
import { stormSurgeAdvisories } from '$lib/data/storm-surge';

type HazardColorMap = {
	readonly Low: string;
	readonly Medium: string;
	readonly High: string;
};

export type HazardLayerDefinition = {
	readonly key: string | number;
	readonly tilePath: string;
	readonly colors?: HazardColorMap;
	readonly classes?: readonly { readonly color: string }[];
	readonly sourceLayer?: string;
};

export type EnabledHazardLayers = {
	readonly enabledFloodPeriods: readonly ReturnPeriod[];
	readonly enabledStormSurgeAdvisories: readonly StormSurgeAdvisory[];
	readonly enabledLandslideLayers: readonly LandslideLayer[];
	readonly enabledSeismicLayers: readonly SeismicLayer[];
};

export const hazardFamilies: readonly HazardFamily[] = [
	'flood',
	'storm-surge',
	'landslide',
	'earthquake',
	'typhoon'
];

export const hazardTileBounds: [number, number, number, number] = [...calapanCityBounds];

export function layersForFamily(family: HazardFamily): readonly HazardLayerDefinition[] {
	if (family === 'flood') return floodHazardPeriods;
	if (family === 'storm-surge') return stormSurgeAdvisories;
	if (family === 'landslide') return landslideHazards;
	if (family === 'typhoon') return [];
	return seismicHazards;
}

export function layerIdFor(family: HazardFamily, key: string | number): string {
	if (family === 'flood') return `calapan-flood-hazard-${key}`;
	if (family === 'storm-surge') return `calapan-storm-surge-advisory-${key}`;
	if (family === 'landslide') return `calapan-landslide-hazard-${key}`;
	return `calapan-${key}`;
}

export function sourceLayerFor(family: HazardFamily, layer: HazardLayerDefinition): string {
	if (family === 'flood') return 'flood';
	if (family === 'storm-surge') return 'storm-surge';
	if (family === 'landslide') return 'landslide';
	return layer.sourceLayer ?? String(layer.key);
}

export function isLayerEnabled(
	family: HazardFamily,
	key: string | number,
	enabledLayers: EnabledHazardLayers
): boolean {
	if (family === 'flood') return enabledLayers.enabledFloodPeriods.includes(key as ReturnPeriod);
	if (family === 'storm-surge') {
		return enabledLayers.enabledStormSurgeAdvisories.includes(key as StormSurgeAdvisory);
	}
	if (family === 'landslide') {
		return enabledLayers.enabledLandslideLayers.includes(key as LandslideLayer);
	}
	if (family === 'typhoon') return true;
	return enabledLayers.enabledSeismicLayers.includes(key as SeismicLayer);
}

export function sourceIdsForFamily(
	family: HazardFamily,
	enabledLayers: EnabledHazardLayers
): string[] {
	return layersForFamily(family)
		.filter((layer) => isLayerEnabled(family, layer.key, enabledLayers))
		.map((layer) => layerIdFor(family, layer.key));
}

export function classColorsForLayer(layer: HazardLayerDefinition): string[] {
	return (
		layer.classes?.map((item) => item.color) ?? [
			layer.colors?.Low ?? '#000000',
			layer.colors?.Medium ?? '#000000',
			layer.colors?.High ?? '#000000'
		]
	);
}

export function fillColorForLayer(
	layer: HazardLayerDefinition
): PropertyValueSpecification<string> {
	return [
		'match',
		['get', 'Var'],
		...classColorsForLayer(layer).flatMap((color, index) => [index + 1, color]),
		'#000000'
	] as unknown as PropertyValueSpecification<string>;
}
