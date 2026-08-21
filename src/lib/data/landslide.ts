import type { FloodHazardSummary } from './flood';

export type LandslideLayer = 'main';
export type LandslideHazardSummary = FloodHazardSummary;

export const landslideHazards = [
	{
		key: 'main',
		shortName: 'Landslide',
		tilePath: '/calapan-landslide-hazard-tiles/{z}/{x}/{y}.pbf',
		colors: {
			Low: '#f2c94c',
			Medium: '#f2994a',
			High: '#eb5757'
		}
	}
] as const;

export const landslideMetadata = {
	source: 'NOAH',
	sourceUrl: 'https://noah.up.edu.ph',
	sourceDate: null,
	sourceDateNote: 'The downloaded shapefile metadata does not include a source date.',
	coverage: 'Oriental Mindoro source layer clipped to Calapan City.',
	licenseNote: 'Confirm current NOAH dataset licensing before redistribution.',
	classification: 'Low, Medium, and High values are provided by the source dataset.',
	caveat: 'This is modeled landslide hazard information, not a guarantee of future landslides.'
} as const;
