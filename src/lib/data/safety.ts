import type { HazardFamily } from '$lib/map-state';

export type SafetyGuidance = {
	summary: string;
	actions: readonly string[];
};

export const safetyGuidance: Record<HazardFamily, SafetyGuidance> = {
	flood: {
		summary:
			'Monitor official advisories and move people and essential items to safer, higher ground early.',
		actions: [
			'Follow PAGASA and local government advisories, including evacuation instructions.',
			'Never walk or drive through moving or unknown-depth floodwater.',
			'Keep medicines, documents, phones, and chargers in a waterproof bag.'
		]
	},
	'storm-surge': {
		summary:
			'Storm surge can arrive with a tropical cyclone. Leave exposed coastal and low-lying areas when officials advise it.',
		actions: [
			'Follow official evacuation orders before strong winds and rising water make travel dangerous.',
			'Avoid beaches, shorelines, river mouths, and low-lying roads during the threat.',
			'Do not return until local authorities confirm that it is safe.'
		]
	},
	landslide: {
		summary:
			'Heavy rain can destabilize slopes. Leave early if officials warn your area or you notice signs of ground movement.',
		actions: [
			'Watch for new cracks, leaning trees or poles, unusual sounds, and muddy or changing stream flow.',
			'Keep away from steep slopes, unstable ground, and river channels during heavy rain.',
			'Follow local authorities to a safer location and do not cross a debris flow.'
		]
	},
	earthquake: {
		summary:
			'During shaking, protect yourself first. Afterward, expect aftershocks and follow official instructions.',
		actions: [
			'Drop, Cover, and Hold On until the shaking stops.',
			'Stay away from glass, shelves, and objects that can fall; do not use elevators.',
			'If a strong or long earthquake occurs near the coast, move inland or to higher ground for possible tsunami risk.'
		]
	},
	typhoon: {
		summary:
			'Use official bulletins for timing and action. A track or hazard zone is not a guarantee of local conditions.',
		actions: [
			'Check PAGASA bulletins and local government instructions regularly.',
			'Secure loose objects, prepare essential medicines and documents, and charge communication devices.',
			'Stay away from windows and avoid flooded, coastal, and exposed roads during dangerous conditions.'
		]
	}
};
