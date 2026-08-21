import type { EnabledHazardLayers } from './hazard-layers';

import { describe, expect, it } from 'vitest';
import {
	classColorsForLayer,
	fillColorForLayer,
	hazardFamilies,
	hazardTileBounds,
	isLayerEnabled,
	layerIdFor,
	layersForFamily,
	sourceIdsForFamily,
	sourceLayerFor
} from './hazard-layers';

const enabledLayers: EnabledHazardLayers = {
	enabledFloodPeriods: [5, 100],
	enabledStormSurgeAdvisories: [2, 4],
	enabledLandslideLayers: [],
	enabledSeismicLayers: ['tsunami']
};

describe('hazard layer definitions', () => {
	it('keeps the family order and tile bounds stable', () => {
		expect(hazardFamilies).toEqual(['flood', 'storm-surge', 'landslide', 'earthquake', 'typhoon']);
		expect(hazardTileBounds).toEqual([
			121.10036758600006, 13.296270203000063, 121.28920787700008, 13.467073836000054
		]);
	});

	it('maps families to stable source layers and IDs', () => {
		const flood = layersForFamily('flood')[0];
		const earthquake = layersForFamily('earthquake')[0];

		expect(layerIdFor('flood', flood.key)).toBe('calapan-flood-hazard-5');
		expect(sourceLayerFor('flood', flood)).toBe('flood');
		expect(layerIdFor('earthquake', earthquake.key)).toBe('calapan-ground-shaking');
		expect(sourceLayerFor('earthquake', earthquake)).toBe('ground-shaking');
		expect(layersForFamily('typhoon')).toEqual([]);
	});

	it('filters enabled source IDs by family state', () => {
		expect(sourceIdsForFamily('flood', enabledLayers)).toEqual([
			'calapan-flood-hazard-5',
			'calapan-flood-hazard-100'
		]);
		expect(sourceIdsForFamily('storm-surge', enabledLayers)).toEqual([
			'calapan-storm-surge-advisory-2',
			'calapan-storm-surge-advisory-4'
		]);
		expect(sourceIdsForFamily('typhoon', enabledLayers)).toEqual([]);
		expect(isLayerEnabled('landslide', 'main', enabledLayers)).toBe(false);
		expect(isLayerEnabled('earthquake', 'tsunami', enabledLayers)).toBe(true);
	});

	it('builds class colors and the MapLibre fill expression', () => {
		const layer = layersForFamily('earthquake')[0];

		expect(classColorsForLayer(layer)).toEqual(['#ddd6fe', '#8b5cf6', '#4c1d95']);
		expect(fillColorForLayer(layer)).toEqual([
			'match',
			['get', 'Var'],
			1,
			'#ddd6fe',
			2,
			'#8b5cf6',
			3,
			'#4c1d95',
			'#000000'
		]);
	});
});
