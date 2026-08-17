import { describe, expect, it } from 'vitest';
import { calapanCityBoundary, calapanCityBounds, calapanCityMask } from './calapan-boundary';

describe('Calapan City boundary', () => {
	it('contains the expected city geometry and bounds', () => {
		expect(calapanCityBoundary.geometry.type).toBe('MultiPolygon');
		expect(calapanCityBoundary.geometry.coordinates).toHaveLength(4);
		expect(calapanCityBounds).toEqual([
			121.10036758600006, 13.296270203000063, 121.28920787700008, 13.467073836000054
		]);
	});

	it('uses the city boundary as holes in the outside mask', () => {
		expect(calapanCityMask.geometry.type).toBe('Polygon');
		expect(calapanCityMask.geometry.coordinates).toHaveLength(5);
		expect(calapanCityMask.geometry.coordinates[0]).toHaveLength(5);
	});
});
