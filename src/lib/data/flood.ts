export type FloodHazardClass = 'Low' | 'Medium' | 'High';
export type ReturnPeriod = 5 | 25 | 100;

export type FloodHazardSummary = {
	classes: FloodHazardClass[];
	summary: FloodHazardClass | 'Mixed' | 'NoData';
};

const warmFloodHazardColors: Record<FloodHazardClass, string> = {
	Low: '#f2c94c',
	Medium: '#f2994a',
	High: '#eb5757'
};

export const floodHazardColors: Record<FloodHazardClass, string> = warmFloodHazardColors;

export const floodHazardPeriods = [
	{
		key: 5,
		name: '5-year flood hazard',
		shortName: '5-year',
		tilePath: '/calapan-flood-hazard-5yr-tiles/{z}/{x}/{y}.pbf',
		colors: {
			Low: '#A9C6DE',
			Medium: '#818ABC',
			High: '#804B9B'
		}
	},
	{
		key: 25,
		name: '25-year flood hazard',
		shortName: '25-year',
		tilePath: '/calapan-flood-hazard-25yr-tiles/{z}/{x}/{y}.pbf',
		colors: {
			Low: '#FDACB2',
			Medium: '#FA5F96',
			High: '#C21D7D'
		}
	},
	{
		key: 100,
		name: '100-year flood hazard',
		shortName: '100-year',
		tilePath: '/calapan-flood-hazard-100yr-tiles/{z}/{x}/{y}.pbf',
		colors: warmFloodHazardColors
	}
] as const;

export const floodHazardMetadata = {
	cellSizeMeters: 25,
	source: 'UP Resilience Institute NOAH Center',
	sourceUrl: 'https://noah.up.edu.ph/know-your-hazards',
	sourceDate: null,
	sourceDateNote: 'The downloaded shapefile metadata does not include a source date.',
	coverage: 'Oriental Mindoro source layers clipped to Calapan City.',
	licenseNote: 'Confirm current NOAH dataset licensing before redistribution.',
	classification: 'Low, Medium, and High values are provided by the source dataset.',
	caveat: 'This is modeled flood hazard information, not a guarantee of future flooding.'
} as const;
