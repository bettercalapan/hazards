import { describe, expect, it } from 'vitest';
import { prototypeFloodLayer } from './hazards';

describe('prototype flood layer', () => {
	it('keeps prototype data clearly labeled and unsourced', () => {
		expect(prototypeFloodLayer.status).toBe('prototype');
		expect(prototypeFloodLayer.sourceName).toBe('Prototype geometry');
		expect(prototypeFloodLayer.sourceUrl).toBeNull();
		expect(prototypeFloodLayer.updatedAt).toBeNull();
		expect(prototypeFloodLayer.data.features).toHaveLength(1);
		expect(prototypeFloodLayer.data.features[0].properties).toEqual({
			id: 'prototype-flood-zone-area',
			name: 'Prototype flood-risk zone',
			status: 'prototype',
			description:
				'This selected area uses placeholder geometry for testing. It is not an official flood-risk classification.'
		});
	});
});
