import type { GeoJSONSource, Map as MapLibreMap, Popup as MapLibrePopup } from 'maplibre-gl';

import { describe, expect, it, vi } from 'vitest';
import { emptyCriticalFacilities } from '$lib/data/critical-facilities';
import { createCriticalFacilityLayerManager } from './critical-facility-layer-manager';

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
		getLayer: vi.fn(() => ({})),
		getSource: vi.fn(),
		setLayoutProperty: vi.fn(),
		setPaintProperty: vi.fn(),
		moveLayer: vi.fn(),
		easeTo: vi.fn(),
		getCanvas: vi.fn(() => canvas),
		on,
		off: vi.fn()
	} as unknown as MapLibreMap;
	return { map, handlers, canvas };
}

describe('critical facility layer manager', () => {
	it('registers and toggles all facility layers', () => {
		const { map } = createMapMock();
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
		const { map } = createMapMock();
		const source = { setData: vi.fn() };
		vi.mocked(map.getSource).mockReturnValue(source as unknown as GeoJSONSource);
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

	it('binds facility interactions and cleans them up', async () => {
		const { map, handlers, canvas } = createMapMock();
		const source = { getClusterExpansionZoom: vi.fn().mockResolvedValue(14) };
		vi.mocked(map.getSource).mockReturnValue(source as unknown as GeoJSONSource);
		const popup = {
			remove: vi.fn(),
			setLngLat: vi.fn().mockReturnThis(),
			setHTML: vi.fn().mockReturnThis(),
			addTo: vi.fn().mockReturnThis()
		};
		class PopupMock {
			remove() {
				popup.remove();
			}
			setLngLat(value: unknown) {
				popup.setLngLat(value);
				return this;
			}
			setHTML(value: string) {
				popup.setHTML(value);
				return this;
			}
			addTo(value: unknown) {
				popup.addTo(value);
				return this;
			}
		}
		const Popup = PopupMock as unknown as new () => MapLibrePopup;
		const manager = createCriticalFacilityLayerManager({
			map,
			firstSymbolLayerId: undefined,
			reducedMotion: true,
			setState: vi.fn()
		});

		manager.addLayers();
		manager.bindInteractions(Popup);
		manager.bindInteractions(Popup);
		manager.moveLayersToTop();

		handlers.get('click:critical-facilities-clusters')!({
			lngLat: { lng: 121, lat: 13 },
			features: [{ properties: { cluster_id: 7 } }]
		});
		await Promise.resolve();
		expect(source.getClusterExpansionZoom).toHaveBeenCalledWith(7);
		expect(map.easeTo).toHaveBeenCalledWith({ center: { lng: 121, lat: 13 }, zoom: 14 });

		handlers.get('mouseenter:critical-facilities-points')!();
		expect(canvas.style.cursor).toBe('pointer');
		handlers.get('mouseleave:critical-facilities-points')!();
		expect(canvas.style.cursor).toBe('');
		handlers.get('click:critical-facilities-points')!({
			lngLat: { lng: 121, lat: 13 },
			features: [
				{
					properties: {
						name: '<Hospital>',
						categoryLabel: 'Hospital',
						sourceUrl: 'javascript:alert(1)',
						sourceLabel: '<Source>'
					}
				}
			]
		});
		expect(popup.setHTML).toHaveBeenCalledWith(
			'<strong>&lt;Hospital&gt;</strong><small>Hospital</small>'
		);

		manager.dispose();
		expect(popup.remove).toHaveBeenCalledTimes(1);
		expect(map.off).toHaveBeenCalledTimes(6);
		expect(map.moveLayer).toHaveBeenCalledTimes(5);
	});
});
