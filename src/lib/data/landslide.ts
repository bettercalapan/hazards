import type { FloodHazardClass, FloodHazardSummary } from './flood';

export type LandslideLayer = 'main';
export type LandslideHazardClass = FloodHazardClass;
export type LandslideHazardSummary = FloodHazardSummary;

export const landslideHazards = [
	{
		key: 'main',
		name: 'Landslide hazard',
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
	source: 'UP Resilience Institute NOAH Center',
	sourceUrl: 'https://noah.up.edu.ph/know-your-hazards',
	sourceDate: null,
	sourceDateNote: 'The downloaded shapefile metadata does not include a source date.',
	coverage: 'Oriental Mindoro source layer clipped to Calapan City.',
	licenseNote: 'Confirm current NOAH dataset licensing before redistribution.',
	classification: 'Low, Medium, and High values are provided by the source dataset.',
	caveat: 'This is modeled landslide hazard information, not a guarantee of future landslides.'
} as const;
