import { describe, expect, it } from 'vitest';
import { prototypeFloodLayer } from './hazards';

describe('prototype flood layer', () => {
	it('keeps prototype data clearly labeled and unsourced', () => {
		expect(prototypeFloodLayer.status).toBe('prototype');
		expect(prototypeFloodLayer.sourceName).toBe('Prototype geometry');
		expect(prototypeFloodLayer.sourceUrl).toBeNull();
		expect(prototypeFloodLayer.updatedAt).toBeNull();
		expect(prototypeFloodLayer.data.features).toHaveLength(1);
	});
});
