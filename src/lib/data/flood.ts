export type FloodHazardClass = 'Low' | 'Medium' | 'High';

export const floodHazardColors: Record<FloodHazardClass, string> = {
	Low: '#f2c94c',
	Medium: '#f2994a',
	High: '#eb5757'
};

export const calapanFloodHazardRaster = {
	url: '/calapan-flood-hazard-25yr.png',
	coordinates: [
		[121.10036758600006, 13.467073836000054],
		[121.28920787700008, 13.467073836000054],
		[121.28920787700008, 13.296270203000063],
		[121.10036758600006, 13.296270203000063]
	] as [[number, number], [number, number], [number, number], [number, number]]
};

export const floodHazardMetadata = {
	name: '25-year flood hazard',
	returnPeriodYears: 25,
	cellSizeMeters: 25,
	source: 'UP Resilience Institute NOAH Center',
	sourceUrl: 'https://noah.up.edu.ph/know-your-hazards',
	classification: 'Low, Medium, and High values are provided by the source dataset.',
	caveat: 'This is modeled flood hazard information, not a guarantee of future flooding.'
} as const;
