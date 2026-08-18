import { describe, expect, it } from 'vitest';
import {
	criticalFacilityColors,
	criticalFacilitySources,
	normalizeCriticalFacilities
} from './critical-facilities';

describe('critical facilities', () => {
	it('uses distinct colors for each facility category', () => {
		expect(new Set(Object.values(criticalFacilityColors))).toHaveLength(4);
	});

	it('keeps named points inside Calapan and adds the source category', () => {
		const result = normalizeCriticalFacilities(criticalFacilitySources[0], {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: { name: 'Calapan Police Station' },
					geometry: { type: 'Point', coordinates: [121.18, 13.41] }
				},
				{
					type: 'Feature',
					properties: { name: 'Outside Calapan' },
					geometry: { type: 'Point', coordinates: [121.5, 13.7] }
				}
			]
		});

		expect(result.features).toHaveLength(1);
		expect(result.features[0].properties).toMatchObject({
			name: 'Calapan Police Station',
			category: 'police',
			categoryLabel: 'Police station'
		});
	});

	it('skips unnamed facility points', () => {
		const result = normalizeCriticalFacilities(criticalFacilitySources[3], {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: { amenity: 'school' },
					geometry: { type: 'Point', coordinates: [121.18, 13.41] }
				}
			]
		});

		expect(result.features).toEqual([]);
	});
});
