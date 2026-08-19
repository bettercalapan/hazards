import { describe, expect, it, vi } from 'vitest';
import { emptyCriticalFacilities } from '$lib/data/critical-facilities';
import { createCriticalFacilityLayerManager } from './critical-facility-layer-manager';

function createMapMock() {
	return {
		addSource: vi.fn(),
		addLayer: vi.fn(),
		getLayer: vi.fn(() => ({})),
		getSource: vi.fn(),
		setLayoutProperty: vi.fn(),
		setPaintProperty: vi.fn()
	} as unknown as import('maplibre-gl').Map;
}

describe('critical facility layer manager', () => {
	it('registers and toggles all facility layers', () => {
		const map = createMapMock();
		const manager = createCriticalFacilityLayerManager({
			map,
			firstSymbolLayerId: 'labels',
			reducedMotion: true,
			setState: vi.fn()
		});

		manager.addLayers();
		manager.setVisibility(true);
		manager.setVisibility(false);

		expect(map.addSource).toHaveBeenCalledTimes(1);
		expect(map.addLayer).toHaveBeenCalledTimes(5);
		expect(map.setLayoutProperty).toHaveBeenCalledTimes(10);
		manager.dispose();
	});

	it('loads facility data once and reports state', async () => {
		const map = createMapMock();
		const source = { setData: vi.fn() };
		vi.mocked(map.getSource).mockReturnValue(
			source as unknown as import('maplibre-gl').GeoJSONSource
		);
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => emptyCriticalFacilities
		});
		vi.stubGlobal('fetch', fetchMock);
		const states: string[] = [];
		const manager = createCriticalFacilityLayerManager({
			map,
			firstSymbolLayerId: undefined,
			reducedMotion: true,
			setState: (state) => states.push(state)
		});

		manager.load();
		manager.load();
		await vi.waitFor(() => expect(source.setData).toHaveBeenCalledWith(emptyCriticalFacilities));

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(states).toEqual(['loading', 'ready']);
		manager.dispose();
		vi.unstubAllGlobals();
	});
});
