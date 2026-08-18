export type HazardFamily = 'flood' | 'storm-surge' | 'landslide' | 'earthquake' | 'typhoon';

export type SafetyGuidance = {
	title: string;
	summary: string;
	actions: readonly string[];
	sourceLabel: string;
	sourceUrl: string;
};

export const safetyGuidance: Record<HazardFamily, SafetyGuidance> = {
	flood: {
		title: 'If flooding is possible',
		summary:
			'Monitor official advisories and move people and essential items to safer, higher ground early.',
		actions: [
			'Follow PAGASA and local government advisories, including evacuation instructions.',
			'Never walk or drive through moving or unknown-depth floodwater.',
			'Keep medicines, documents, phones, and chargers in a waterproof bag.'
		],
		sourceLabel: 'PAGASA flood information',
		sourceUrl: 'https://pagasa.dost.gov.ph/flood'
	},
	'storm-surge': {
		title: 'If storm surge is possible',
		summary:
			'Storm surge can arrive with a tropical cyclone. Leave exposed coastal and low-lying areas when officials advise it.',
		actions: [
			'Follow official evacuation orders before strong winds and rising water make travel dangerous.',
			'Avoid beaches, shorelines, river mouths, and low-lying roads during the threat.',
			'Do not return until local authorities confirm that it is safe.'
		],
		sourceLabel: 'PAGASA storm surge information',
		sourceUrl: 'https://pagasa.dost.gov.ph/information/storm-surge'
	},
	landslide: {
		title: 'If landslides are possible',
		summary:
			'Heavy rain can destabilize slopes. Leave early if officials warn your area or you notice signs of ground movement.',
		actions: [
			'Watch for new cracks, leaning trees or poles, unusual sounds, and muddy or changing stream flow.',
			'Keep away from steep slopes, unstable ground, and river channels during heavy rain.',
			'Follow local authorities to a safer location and do not cross a debris flow.'
		],
		sourceLabel: 'DOST-PHIVOLCS HazardHunterPH',
		sourceUrl: 'https://hazardhunter.georisk.gov.ph/'
	},
	earthquake: {
		title: 'If an earthquake occurs',
		summary:
			'During shaking, protect yourself first. Afterward, expect aftershocks and follow official instructions.',
		actions: [
			'Drop, Cover, and Hold On until the shaking stops.',
			'Stay away from glass, shelves, and objects that can fall; do not use elevators.',
			'If a strong or long earthquake occurs near the coast, move inland or to higher ground for possible tsunami risk.'
		],
		sourceLabel: 'DOST-PHIVOLCS earthquake information',
		sourceUrl: 'https://www.phivolcs.dost.gov.ph/'
	},
	typhoon: {
		title: 'If a typhoon threatens',
		summary:
			'Use official bulletins for timing and action. A track or hazard zone is not a guarantee of local conditions.',
		actions: [
			'Check PAGASA bulletins and local government instructions regularly.',
			'Secure loose objects, prepare essential medicines and documents, and charge communication devices.',
			'Stay away from windows and avoid flooded, coastal, and exposed roads during dangerous conditions.'
		],
		sourceLabel: 'PAGASA tropical cyclone information',
		sourceUrl: 'https://pagasa.dost.gov.ph/information/about-tropical-cyclone'
	}
};

export type EmergencyContact = {
	label: string;
	value: string;
	href: string;
	note: string;
	sourceLabel: string;
	sourceUrl: string;
};

export const emergencyContacts: readonly EmergencyContact[] = [
	{
		label: 'National emergency hotline',
		value: '911',
		href: 'tel:911',
		note: 'For urgent police, fire, medical, and rescue emergencies.',
		sourceLabel: 'Emergency 911 National Office',
		sourceUrl: 'https://e911.gov.ph/'
	},
	{
		label: 'PAGASA information line',
		value: '(02) 8284-0800',
		href: 'tel:+63282840800',
		note: 'For official weather, flood, and tropical cyclone information. Use 911 for immediate danger.',
		sourceLabel: 'PAGASA Contact Us',
		sourceUrl: 'https://pagasa.dost.gov.ph/contact-us'
	}
];
