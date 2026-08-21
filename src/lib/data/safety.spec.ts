import type { HazardFamily } from '$lib/map-state';

import { describe, expect, it } from 'vitest';
import { safetyGuidance } from './safety';

const hazardFamilies: HazardFamily[] = [
	'flood',
	'storm-surge',
	'landslide',
	'earthquake',
	'typhoon'
];

describe('safety guidance', () => {
	it('defines guidance for every hazard family', () => {
		for (const family of hazardFamilies) {
			const guidance = safetyGuidance[family];

			expect(guidance.summary).toBeTruthy();
			expect(guidance.actions.length).toBeGreaterThanOrEqual(3);
		}
	});
});
