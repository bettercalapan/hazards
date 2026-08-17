import { describe, expect, it } from 'vitest';
import { calapanFloodHazardRaster, floodHazardColors, floodHazardMetadata } from './flood';

describe('Calapan flood hazard', () => {
	it('contains source-provided classes for the 25-year layer', () => {
		expect(calapanFloodHazardRaster.url).toBe('/calapan-flood-hazard-25yr.png');
		expect(floodHazardColors).toEqual({ Low: '#f2c94c', Medium: '#f2994a', High: '#eb5757' });
		expect(floodHazardMetadata.returnPeriodYears).toBe(25);
		expect(floodHazardMetadata.cellSizeMeters).toBe(25);
		expect(floodHazardMetadata.source).toBe('UP Resilience Institute NOAH Center');
	});
});
