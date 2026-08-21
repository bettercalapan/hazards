import { describe, expect, it } from 'vitest';
import { landslideHazards, landslideMetadata } from './landslide';

describe('Calapan landslide hazard', () => {
	it('contains the localized landslide layer', () => {
		expect(landslideHazards.map((hazard) => hazard.key)).toEqual(['main']);
		expect(landslideHazards[0].tilePath).toBe('/calapan-landslide-hazard-tiles/{z}/{x}/{y}.pbf');
		expect(landslideHazards[0].colors).toEqual({
			Low: '#f2c94c',
			Medium: '#f2994a',
			High: '#eb5757'
		});
		expect(landslideMetadata.source).toBe('NOAH');
	});
});
