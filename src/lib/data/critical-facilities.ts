import type { FeatureCollection, Point } from 'geojson';

export type CriticalFacilityCategory =
	'police' | 'fire' | 'hospital' | 'school' | 'evacuation-center';

export const criticalFacilityColors: Record<CriticalFacilityCategory, string> = {
	police: '#2563eb',
	fire: '#dc4c2f',
	hospital: '#16a34a',
	school: '#9333ea',
	'evacuation-center': '#d97706'
};

export type CriticalFacilityProperties = {
	category: CriticalFacilityCategory;
	categoryLabel: string;
	name: string;
	verificationStatus?: 'source-listed' | 'map-listed-unverified';
	sourceLabel?: string;
	sourceUrl?: string;
	checkedAt?: string;
	[key: string]: unknown;
};

export type CriticalFacilityCollection = FeatureCollection<Point, CriticalFacilityProperties>;

export const criticalFacilitiesAttribution =
	'Facilities: NOAH / UP Diliman, OpenStreetMap contributors, and Google Maps listings.';

export const emptyCriticalFacilities: CriticalFacilityCollection = {
	type: 'FeatureCollection',
	features: []
};
