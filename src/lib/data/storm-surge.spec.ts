import { describe, expect, it } from 'vitest';
import { stormSurgeAdvisories, stormSurgeMetadata } from './storm-surge';

describe('Calapan storm surge hazard', () => {
	it('contains all four source advisories', () => {
		expect(stormSurgeAdvisories.map((advisory) => advisory.key)).toEqual([1, 2, 3, 4]);
		expect(stormSurgeAdvisories.map((advisory) => advisory.height)).toEqual([
			'Up to 2 m',
			'Up to 3 m',
			'Up to 4 m',
			'More than 4 m'
		]);
		expect(stormSurgeAdvisories.map((advisory) => advisory.tilePath)).toEqual([
			'/calapan-storm-surge-advisory-1-tiles/{z}/{x}/{y}.pbf',
			'/calapan-storm-surge-advisory-2-tiles/{z}/{x}/{y}.pbf',
			'/calapan-storm-surge-advisory-3-tiles/{z}/{x}/{y}.pbf',
			'/calapan-storm-surge-advisory-4-tiles/{z}/{x}/{y}.pbf'
		]);
	});

	it('uses the requested palette progression', () => {
		expect(stormSurgeAdvisories[0].colors).toEqual({
			Low: '#B4D1E2',
			Medium: '#5FA3CE',
			High: '#2B75B2'
		});
		expect(stormSurgeAdvisories[1].colors).toEqual({
			Low: '#A9C6DE',
			Medium: '#818ABC',
			High: '#804B9B'
		});
		expect(stormSurgeAdvisories[2].colors).toEqual({
			Low: '#FDACB2',
			Medium: '#FA5F96',
			High: '#C21D7D'
		});
		expect(stormSurgeMetadata.source).toBe('NOAH');
	});
});
