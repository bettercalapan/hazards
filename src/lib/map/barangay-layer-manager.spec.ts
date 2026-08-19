import { describe, expect, it, vi } from 'vitest';
import type { BarangayCollection, BarangayProperties } from '$lib/data/barangays';
import { createBarangayLayerManager, getBarangayBounds } from './barangay-layer-manager';

const properties = {
	id: 'barangay-a',
	name: 'Barangay A',
	sourceName: 'Test source'
} as BarangayProperties;

const barangays = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties,
			geometry: {
				type: 'MultiPolygon',
				coordinates: [
					[
						[
							[121, 13],
							[122, 13],
							[122, 14],
							[121, 13]
						]
					],
					[
						[
							[120, 12],
							[123, 12],
							[123, 15],
							[120, 12]
						]
					]
				]
			}
		}
	]
} as unknown as BarangayCollection;

function createMapMock() {
	const handlers = new Map<string, (event?: unknown) => void>();
	const on = vi.fn(
		(
			event: string,
			layerOrHandler: string | ((event?: unknown) => void),
			handler?: (event?: unknown) => void
		) => {
			const key =
				typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : `${event}:map`;
			handlers.set(key, typeof layerOrHandler === 'string' ? handler! : layerOrHandler);
		}
	);
	const canvas = { style: { cursor: '' } };
	const map = {
		addSource: vi.fn(),
		addLayer: vi.fn(),
		setFeatureState: vi.fn(),
		getLayer: vi.fn(() => ({})),
		setPaintProperty: vi.fn(),
		fitBounds: vi.fn(),
		queryRenderedFeatures: vi.fn(() => []),
		getCanvas: vi.fn(() => canvas),
		on,
		off: vi.fn()
	} as unknown as import('maplibre-gl').Map;
	return { map, handlers, canvas };
}

describe('barangay layer manager', () => {
	it('registers barangay sources and layers', () => {
		const { map } = createMapMock();
		const manager = createBarangayLayerManager({ map, barangays, firstSymbolLayerId: 'labels' });

		manager.addLayers();

		expect(map.addSource).toHaveBeenCalledTimes(2);
		expect(map.addLayer).toHaveBeenCalledTimes(4);
		manager.dispose();
	});

	it('selects, replaces, toggles, and clears barangays', () => {
		const { map, handlers } = createMapMock();
		const onSelectArea = vi.fn();
		const manager = createBarangayLayerManager({
			map,
			barangays,
			firstSymbolLayerId: undefined,
			onSelectArea
		});
		manager.addLayers();
		const click = handlers.get('click:calapan-barangay-fill')!;

		click({ features: [{ properties }] });
		expect(onSelectArea).toHaveBeenLastCalledWith(properties);
		expect(map.setFeatureState).toHaveBeenLastCalledWith(
			{ source: 'calapan-barangays', id: 'barangay-a' },
			{ selected: true }
		);

		click({ features: [{ properties }] });
		expect(onSelectArea).toHaveBeenLastCalledWith(null);
		click({ features: [{ properties }] });
		click({ features: [{ properties: { ...properties, id: 'barangay-b' } }] });
		expect(map.setFeatureState).toHaveBeenLastCalledWith(
			{ source: 'calapan-barangays', id: 'barangay-b' },
			{ selected: true }
		);

		const mapClick = handlers.get('click:map')!;
		mapClick({ point: {} });
		expect(onSelectArea).toHaveBeenLastCalledWith(null);
		manager.dispose();
	});

	it('syncs valid IDs, ignores invalid properties, and fits bounds', () => {
		const { map, handlers, canvas } = createMapMock();
		const onSelectArea = vi.fn();
		const manager = createBarangayLayerManager({
			map,
			barangays,
			firstSymbolLayerId: undefined,
			onSelectArea
		});
		manager.addLayers();
		manager.syncSelection('missing');
		handlers.get('click:calapan-barangay-fill')!({ features: [{ properties: { id: 1 } }] });
		expect(onSelectArea).not.toHaveBeenCalled();

		manager.syncSelection('barangay-a');
		expect(map.fitBounds).toHaveBeenCalledWith(
			[
				[120, 12],
				[123, 15]
			],
			{ padding: 48, maxZoom: 13.5, duration: 650 }
		);

		handlers.get('mouseenter:calapan-barangay-fill')!();
		expect(canvas.style.cursor).toBe('pointer');
		handlers.get('mouseleave:calapan-barangay-fill')!();
		expect(canvas.style.cursor).toBe('');
		manager.dispose();
	});

	it('calculates nested multipolygon bounds', () => {
		expect(getBarangayBounds(barangays, 'barangay-a')).toEqual([
			[120, 12],
			[123, 15]
		]);
	});

	it('removes handlers on disposal', () => {
		const { map } = createMapMock();
		const manager = createBarangayLayerManager({ map, barangays, firstSymbolLayerId: undefined });
		manager.addLayers();
		manager.dispose();

		expect(map.off).toHaveBeenCalledTimes(4);
	});
});
