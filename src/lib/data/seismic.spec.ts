import { describe, expect, it } from 'vitest';
import { seismicHazards, seismicMetadata } from './seismic';

describe('Calapan seismic hazards', () => {
	it('contains the PHIVOLCS seismic layer set', () => {
		expect(seismicHazards.map((layer) => layer.key)).toEqual([
			'ground-shaking',
			'liquefaction',
			'tsunami'
		]);
		expect(seismicHazards.every((layer) => layer.classes.length > 0)).toBe(true);
		const colors = seismicHazards.flatMap((layer) =>
			layer.classes.map((item): string => item.color)
		);
		expect(colors).not.toContain('#ff0000');
		expect(seismicMetadata.source).toBe('GeoRisk Philippines');
	});
});
