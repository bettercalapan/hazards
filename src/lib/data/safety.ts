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
		title: 'Safety measures',
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
		title: 'Safety measures',
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
		title: 'Safety measures',
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
		title: 'Safety measures',
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
		title: 'Safety measures',
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
	group: EmergencyContactGroup;
	label: string;
	value: string;
	href: string;
	note: string;
	sourceLabel: string;
	sourceUrl: string;
	verifiedAt: string;
};

export type EmergencyContactGroup = 'immediate' | 'local' | 'information';

export const emergencyContactGroups: readonly {
	key: EmergencyContactGroup;
	label: string;
}[] = [
	{ key: 'immediate', label: 'Immediate emergencies' },
	{ key: 'local', label: 'Local response' },
	{ key: 'information', label: 'Official information' }
];

const orientalMindoroContacts = {
	sourceLabel: 'Province of Oriental Mindoro Contact Us',
	sourceUrl: 'https://ormindoro.gov.ph/contact-us/',
	verifiedAt: '2026-08-18'
} as const;

export const emergencyContacts: readonly EmergencyContact[] = [
	{
		group: 'immediate',
		label: 'National emergency hotline',
		value: '911',
		href: 'tel:911',
		note: 'For urgent police, fire, medical, and rescue emergencies.',
		sourceLabel: 'Emergency 911 National Office',
		sourceUrl: 'https://e911.gov.ph/',
		verifiedAt: '2026-08-18'
	},
	{
		group: 'local',
		label: 'Oriental Mindoro PDRRMO',
		value: '0948 146 0382',
		href: 'tel:+639481460382',
		note: 'Provincial disaster risk reduction and management office.',
		...orientalMindoroContacts
	},
	{
		group: 'local',
		label: 'Oriental Mindoro PDRRMO',
		value: '0920 951 3690',
		href: 'tel:+639209513690',
		note: 'Alternate provincial disaster risk reduction and management number.',
		...orientalMindoroContacts
	},
	{
		group: 'local',
		label: 'Oriental Mindoro Police',
		value: '(043) 288 1616',
		href: 'tel:+63432881616',
		note: 'Provincial police contact listed by the province.',
		...orientalMindoroContacts
	},
	{
		group: 'local',
		label: 'Oriental Mindoro Fire',
		value: '(043) 288 5617',
		href: 'tel:+63432885617',
		note: 'Provincial fire contact listed by the province.',
		...orientalMindoroContacts
	},
	{
		group: 'local',
		label: 'Oriental Mindoro Public Safety',
		value: '(043) 288 1111',
		href: 'tel:+63432881111',
		note: 'Provincial public safety contact listed by the province.',
		...orientalMindoroContacts
	},
	{
		group: 'local',
		label: 'Oriental Mindoro Provincial Hospital',
		value: '(043) 288 3077',
		href: 'tel:+63432883077',
		note: 'Provincial hospital contact listed by the province.',
		...orientalMindoroContacts
	},
	{
		group: 'information',
		label: 'PAGASA information line',
		value: '(02) 8284-0800',
		href: 'tel:+63282840800',
		note: 'For official weather, flood, and tropical cyclone information. Use 911 for immediate danger.',
		sourceLabel: 'PAGASA Contact Us',
		sourceUrl: 'https://pagasa.dost.gov.ph/contact-us',
		verifiedAt: '2026-08-18'
	}
];
