import { describe, expect, it } from 'vitest';
import {
	emergencyContacts,
	emergencyContactGroups,
	safetyGuidance,
	type HazardFamily
} from './safety';

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

			expect(guidance.title).toBeTruthy();
			expect(guidance.summary).toBeTruthy();
			expect(guidance.actions.length).toBeGreaterThanOrEqual(3);
			expect(guidance.sourceUrl).toMatch(/^https:\/\//);
		}
	});
});

describe('emergency contacts', () => {
	it('includes a clickable national emergency hotline', () => {
		const emergencyHotline = emergencyContacts.find((contact) => contact.value === '911');

		expect(emergencyHotline).toMatchObject({
			href: 'tel:911',
			sourceUrl: 'https://e911.gov.ph/'
		});
	});

	it('provides a source for every contact', () => {
		for (const contact of emergencyContacts) {
			expect(contact.group).toBeTruthy();
			expect(contact.label).toBeTruthy();
			expect(contact.note).toBeTruthy();
			expect(contact.sourceUrl).toMatch(/^https:\/\//);
			expect(contact.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
		expect(emergencyContacts.some((contact) => contact.group === 'local')).toBe(true);
		expect(emergencyContactGroups.map((group) => group.key)).toEqual([
			'immediate',
			'local',
			'information'
		]);
	});
});
