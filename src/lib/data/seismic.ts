export type SeismicLayer = 'ground-shaking' | 'liquefaction' | 'tsunami';

export type SeismicClass = {
	readonly value: string;
	readonly label: string;
	readonly color: string;
};

export type SeismicHazardSummary = {
	classes: string[];
	summary: string;
};

export const seismicHazards = [
	{
		key: 'ground-shaking',
		name: 'Ground shaking',
		shortName: 'Ground shaking',
		sourceLayer: 'ground-shaking',
		tilePath: '/calapan-ground-shaking-tiles/{z}/{x}/{y}.pbf',
		classes: [
			{ value: '06', label: 'VI, very strong ground shaking', color: '#ddd6fe' },
			{ value: '07', label: 'VII, destructive ground shaking', color: '#8b5cf6' },
			{
				value: '08',
				label: 'VIII, very destructive to devastating ground shaking',
				color: '#4c1d95'
			}
		]
	},
	{
		key: 'liquefaction',
		name: 'Liquefaction',
		shortName: 'Liquefaction',
		sourceLayer: 'liquefaction',
		tilePath: '/calapan-liquefaction-tiles/{z}/{x}/{y}.pbf',
		classes: [
			{ value: '01', label: 'Generally Susceptible', color: '#fef3c7' },
			{ value: '02', label: 'Low Potential', color: '#fde68a' },
			{ value: '03', label: 'Moderate Potential', color: '#fbbf24' },
			{ value: '04', label: 'High Potential', color: '#d97706' },
			{ value: '05', label: 'Least Susceptible', color: '#ffedd5' },
			{ value: '06', label: 'Moderately Susceptible', color: '#f2994a' },
			{ value: '07', label: 'Highly Susceptible', color: '#eb5757' }
		]
	},
	{
		key: 'tsunami',
		name: 'Tsunami',
		shortName: 'Tsunami',
		sourceLayer: 'tsunami',
		tilePath: '/calapan-tsunami-tiles/{z}/{x}/{y}.pbf',
		classes: [
			{ value: '01,08', label: 'General inundation, Inundated', color: '#0c4a6e' },
			{ value: '02,01', label: 'Inundation depth, < 1 meter', color: '#e0f2fe' },
			{ value: '02,02', label: 'Inundation depth, 1 to < 2 meters', color: '#bae6fd' },
			{ value: '02,03', label: 'Inundation depth, 2 to < 3 meters', color: '#7dd3fc' },
			{ value: '02,04', label: 'Inundation depth, 3 to < 4 meters', color: '#38bdf8' },
			{ value: '02,05', label: 'Inundation depth, 4 to < 5 meters', color: '#0ea5e9' },
			{ value: '02,06', label: 'Inundation depth, 5 to 6 meters', color: '#0284c7' },
			{ value: '02,07', label: 'Inundation depth, > 6 meters', color: '#0369a1' }
		]
	}
] as const;

export const seismicMetadata = {
	source: 'DOST-PHIVOLCS, GeoRiskPH HazardHunter',
	sourceUrl: 'https://hazardhunter.georisk.gov.ph/map',
	sourceDate: null,
	sourceDateNote:
		'The pinned PHIVOLCS feature snapshots do not include source publication metadata.',
	coverage: 'PHIVOLCS feature layers clipped to Calapan City.',
	licenseNote: 'Use subject to GeoRiskPH and HazardHunterPH terms.',
	classification: 'PHIVOLCS feature layers, clipped to Calapan City.',
	caveat:
		'These are official hazard-proneness layers, not a site-specific structural assessment or a live warning.'
} as const;
