import { describe, expect, it } from 'vitest';
import {
	criticalFacilityColors,
	criticalFacilitySources,
	curatedEvacuationCenters,
	curatedFireStations,
	normalizeCriticalFacilities
} from './critical-facilities';

describe('critical facilities', () => {
	it('uses distinct colors for each facility category', () => {
		expect(new Set(Object.values(criticalFacilityColors))).toHaveLength(5);
	});

	it('includes the two map-listed fire stations as unverified points', () => {
		expect(curatedFireStations.features).toHaveLength(2);
		expect(curatedFireStations.features.map((feature) => feature.properties.name)).toEqual([
			'Calapan City Fire Station, BFP / City Government',
			'Calapan City Central Fire Station'
		]);
		expect(
			curatedFireStations.features.every(
				(feature) =>
					feature.properties.category === 'fire' &&
					feature.properties.verificationStatus === 'map-listed-unverified'
			)
		).toBe(true);
		expect(curatedFireStations.features.map((feature) => feature.geometry.coordinates)).toEqual([
			[121.1838131, 13.379978],
			[121.1809312, 13.4142974]
		]);
	});

	it('includes the three map-listed evacuation centers as unverified points', () => {
		expect(curatedEvacuationCenters.features).toHaveLength(3);
		expect(curatedEvacuationCenters.features.map((feature) => feature.properties.name)).toEqual([
			'Guinobatan Evacuation Center',
			'Balite Evacuation Center',
			'Brgy Bondoc Evacuation and PB Center'
		]);
		expect(
			curatedEvacuationCenters.features.every(
				(feature) =>
					feature.properties.category === 'evacuation-center' &&
					feature.properties.verificationStatus === 'map-listed-unverified'
			)
		).toBe(true);
		expect(
			curatedEvacuationCenters.features.map((feature) => feature.geometry.coordinates)
		).toEqual([
			[121.1857514, 13.3912934],
			[121.1588472, 13.4080101],
			[121.1974084, 13.3930841]
		]);
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
