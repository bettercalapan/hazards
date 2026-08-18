import { floodHazardColors, floodHazardPeriods, type FloodHazardSummary } from './flood';

export type StormSurgeAdvisory = 1 | 2 | 3 | 4;
export type StormSurgeSummary = FloodHazardSummary;

export const stormSurgeAdvisories = [
	{
		key: 1,
		name: 'Storm Surge Advisory 1',
		shortName: 'Advisory 1',
		height: 'Up to 2 m',
		tilePath: '/calapan-storm-surge-advisory-1-tiles/{z}/{x}/{y}.pbf',
		colors: {
			Low: '#B4D1E2',
			Medium: '#5FA3CE',
			High: '#2B75B2'
		}
	},
	{
		key: 2,
		name: 'Storm Surge Advisory 2',
		shortName: 'Advisory 2',
		height: 'Up to 3 m',
		tilePath: '/calapan-storm-surge-advisory-2-tiles/{z}/{x}/{y}.pbf',
		colors: floodHazardPeriods[0].colors
	},
	{
		key: 3,
		name: 'Storm Surge Advisory 3',
		shortName: 'Advisory 3',
		height: 'Up to 4 m',
		tilePath: '/calapan-storm-surge-advisory-3-tiles/{z}/{x}/{y}.pbf',
		colors: floodHazardPeriods[1].colors
	},
	{
		key: 4,
		name: 'Storm Surge Advisory 4',
		shortName: 'Advisory 4',
		height: 'More than 4 m',
		tilePath: '/calapan-storm-surge-advisory-4-tiles/{z}/{x}/{y}.pbf',
		colors: floodHazardColors
	}
] as const;

export const stormSurgeMetadata = {
	source: 'UP Resilience Institute NOAH Center',
	sourceUrl: 'https://noah.up.edu.ph/know-your-hazards',
	sourceDate: '2021-07-19',
	sourceDateNote: 'ArcGIS metadata creation date; the source update date was not provided.',
	coverage: 'Oriental Mindoro source layers clipped to Calapan City.',
	licenseNote: 'Confirm current NOAH dataset licensing before redistribution.',
	classification: 'Low, Medium, and High values are provided by the source dataset.',
	caveat: 'This is modeled storm-surge hazard information, not a guarantee of future flooding.'
} as const;
