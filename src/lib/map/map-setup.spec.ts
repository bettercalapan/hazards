import type { Map as MapLibreMap } from 'maplibre-gl';

import { describe, expect, it, vi } from 'vitest';
import { getPanBounds, updateMapCamera } from './map-setup';

describe('map setup utilities', () => {
	it('adds a small buffer around the current visible bounds', () => {
		const map = {
			getBounds: () => ({
				getWest: () => 121,
				getEast: () => 122,
				getSouth: () => 13,
				getNorth: () => 14
			}),
			getCenter: () => ({ lng: 121.5, lat: 13.5 }),
			project: () => ({ x: 100, y: 200 }),
			unproject: ([x, y]: [number, number]) => ({ lng: x === 98 ? 121.49 : 121.51, lat: y })
		} as unknown as MapLibreMap;

		expect(getPanBounds(map)).toEqual([
			[120.99, 13],
			[122.01, 14]
		]);
	});

	it('switches camera controls and terrain between 2D and 3D', () => {
		const setTerrain = vi.fn();
		const easeTo = vi.fn();
		const map = {
			setTerrain,
			easeTo,
			dragRotate: { enable: vi.fn(), disable: vi.fn() },
			touchZoomRotate: { enableRotation: vi.fn(), disableRotation: vi.fn() }
		} as unknown as MapLibreMap;

		updateMapCamera(map, true, '2d');
		expect(setTerrain).toHaveBeenCalledWith(null);
		expect(map.dragRotate.disable).toHaveBeenCalled();
		expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled();
		expect(easeTo).toHaveBeenCalledWith({ pitch: 0, bearing: 0, duration: 500 });

		updateMapCamera(map, true, '3d');
		expect(setTerrain).toHaveBeenCalledWith({ source: 'calapan-terrain', exaggeration: 1.15 });
		expect(map.dragRotate.enable).toHaveBeenCalled();
		expect(map.touchZoomRotate.enableRotation).toHaveBeenCalled();
		expect(easeTo).toHaveBeenLastCalledWith({ pitch: 45, bearing: -12, duration: 500 });
	});
});
