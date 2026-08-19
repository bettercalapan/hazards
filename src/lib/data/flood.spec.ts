import { describe, expect, it } from 'vitest';
import { floodHazardColors, floodHazardMetadata, floodHazardPeriods } from './flood';

describe('Calapan flood hazard', () => {
	it('contains all source-provided return periods', () => {
		expect(floodHazardPeriods.map((period) => period.key)).toEqual([5, 25, 100]);
		expect(floodHazardPeriods.map((period) => period.tilePath)).toEqual([
			'/calapan-flood-hazard-5yr-tiles/{z}/{x}/{y}.pbf',
			'/calapan-flood-hazard-25yr-tiles/{z}/{x}/{y}.pbf',
			'/calapan-flood-hazard-100yr-tiles/{z}/{x}/{y}.pbf'
		]);
		expect(floodHazardColors).toEqual({ Low: '#f2c94c', Medium: '#f2994a', High: '#eb5757' });
		expect(floodHazardMetadata.cellSizeMeters).toBe(25);
		expect(floodHazardMetadata.source).toBe('UP Resilience Institute NOAH Center');
	});

	it('uses distinct palettes for each return period', () => {
		expect(floodHazardPeriods[0].colors).toEqual({
			Low: '#A9C6DE',
			Medium: '#818ABC',
			High: '#804B9B'
		});
		expect(floodHazardPeriods[1].colors).toEqual({
			Low: '#FDACB2',
			Medium: '#FA5F96',
			High: '#C21D7D'
		});
		expect(floodHazardPeriods[2].colors).toEqual(floodHazardColors);
	});
});
