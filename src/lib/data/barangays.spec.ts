import { describe, expect, it } from 'vitest';
import { calapanBarangayLabelPoints, calapanBarangays } from './barangays';

describe('Calapan barangays', () => {
	it('contains the 62 barangays listed by BetterCalapan', () => {
		const names = calapanBarangays.features.map((feature) => feature.properties.name);
		const ids = calapanBarangays.features.map((feature) => feature.properties.id);

		expect(calapanBarangays.features).toHaveLength(62);
		expect(new Set(names).size).toBe(62);
		expect(new Set(ids).size).toBe(62);
		expect(
			calapanBarangays.features.every((feature) =>
				feature.properties.floodHazardClasses.every((hazardClass) =>
					['Low', 'Medium', 'High'].includes(hazardClass)
				)
			)
		).toBe(true);
		expect(
			calapanBarangays.features.every((feature) =>
				['Low', 'Medium', 'High', 'Mixed', 'NoData'].includes(feature.properties.floodHazardSummary)
			)
		).toBe(true);
		expect(
			calapanBarangays.features.every((feature) => feature.geometry.type === 'MultiPolygon')
		).toBe(true);
		expect(calapanBarangayLabelPoints.features).toHaveLength(62);
		expect(
			new Set(calapanBarangayLabelPoints.features.map((feature) => feature.properties.id)).size
		).toBe(62);
		expect(
			calapanBarangayLabelPoints.features.every((feature) => feature.geometry.type === 'Point')
		).toBe(true);
	});
});
