import type { Map as MapLibreMap } from 'maplibre-gl';
import type { HazardFamily } from '$lib/map-state';

import { describe, expect, it, vi } from 'vitest';
import { emptyTyphoonMapData } from '$lib/data/typhoon';
import { createHazardLayerManager } from './hazard-layer-manager';

function createMapMock() {
	return {
		addSource: vi.fn(),
		addLayer: vi.fn(),
		getLayer: vi.fn(() => ({})),
		setLayoutProperty: vi.fn(),
		setPaintProperty: vi.fn(),
		isSourceLoaded: vi.fn(() => true),
		on: vi.fn(),
		off: vi.fn()
	} as unknown as MapLibreMap;
}

function createManager(map: MapLibreMap, activeFamily: HazardFamily = 'flood') {
	const loadingFamilies: (HazardFamily | null)[] = [];
	const manager = createHazardLayerManager({
		map,
		firstSymbolLayerId: 'labels',
		typhoonMapData: emptyTyphoonMapData,
		getActiveFamily: () => activeFamily,
		getEnabledLayers: () => ({
			enabledFloodPeriods: [5, 25, 100],
			enabledStormSurgeAdvisories: [1, 2, 3, 4],
			enabledLandslideLayers: ['main'],
			enabledSeismicLayers: ['ground-shaking', 'liquefaction', 'tsunami']
		}),
		setLoadingFamily: (family) => loadingFamilies.push(family)
	});
	return { manager, loadingFamilies };
}

describe('hazard layer manager', () => {
	it('registers all hazard and typhoon layers', () => {
		const map = createMapMock();
		const { manager } = createManager(map);

		manager.addLayers();

		expect(map.addSource).toHaveBeenCalledTimes(14);
		expect(map.addLayer).toHaveBeenCalledTimes(15);
		const layers = vi
			.mocked(map.addLayer)
			.mock.calls.map(([layer]) => layer as { id: string; paint?: Record<string, unknown> });
		const grid = layers.find((layer) => layer.id === 'calapan-typhoon-grid');
		const points = layers.find((layer) => layer.id === 'calapan-typhoon-points');
		expect(grid?.paint?.['fill-color']).toEqual([
			'match',
			['get', 'type'],
			'LPA',
			'#9aa5b1',
			'TD',
			'#00e400',
			'TS',
			'#ffe400',
			'STS',
			'#ff9800',
			'TY',
			'#ff2020',
			'STY',
			'#e000e0',
			'#9aa5b1'
		]);
		expect(points?.paint?.['circle-color']).toEqual(grid?.paint?.['fill-color']);
		manager.dispose();
	});

	it('adds earthquake layers from bottom to top', () => {
		const map = createMapMock();
		const { manager } = createManager(map);

		manager.addLayers();

		const earthquakeLayerIds = vi
			.mocked(map.addLayer)
			.mock.calls.map(([layer]) => (layer as { id: string }).id)
			.filter((id) =>
				['calapan-ground-shaking', 'calapan-liquefaction', 'calapan-tsunami'].includes(id)
			);

		expect(earthquakeLayerIds).toEqual([
			'calapan-ground-shaking',
			'calapan-liquefaction',
			'calapan-tsunami'
		]);
		manager.dispose();
	});

	it('transitions families and clears loading state after sources load', async () => {
		const map = createMapMock();
		const { manager, loadingFamilies } = createManager(map);

		manager.addLayers();
		manager.updateVisibility();
		manager.transition('storm-surge');
		await Promise.resolve();

		expect(loadingFamilies).toEqual(['storm-surge', null]);
		expect(map.setLayoutProperty).toHaveBeenCalled();
		manager.dispose();
	});

	it('cancels pending source listeners when disposed', () => {
		const map = createMapMock();
		const isSourceLoaded = vi.mocked(map.isSourceLoaded);
		isSourceLoaded.mockReturnValue(false);
		const { manager } = createManager(map);

		manager.addLayers();
		manager.transition('storm-surge');
		manager.dispose();

		expect(map.off).toHaveBeenCalledWith('sourcedata', expect.any(Function));
		expect(map.off).toHaveBeenCalledWith('idle', expect.any(Function));
	});
});
