import type { FeatureCollection, Point } from 'geojson';
import { calapanCityBoundary } from './calapan-boundary';
import facilitySourceConfig from './critical-facility-sources.json';

export type CriticalFacilityCategory =
	'police' | 'fire' | 'hospital' | 'school' | 'evacuation-center';

export const criticalFacilityColors: Record<CriticalFacilityCategory, string> = {
	police: '#2563eb',
	fire: '#dc4c2f',
	hospital: '#16a34a',
	school: '#9333ea',
	'evacuation-center': '#d97706'
};

export type CriticalFacilitySource = {
	readonly category: CriticalFacilityCategory;
	readonly label: string;
	readonly sourceLabel: string;
	readonly url: string;
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

const configuredFacilitySources = facilitySourceConfig as unknown as {
	remoteSources: CriticalFacilitySource[];
	curatedFeatures: CriticalFacilityCollection['features'];
};

export const criticalFacilitySources = configuredFacilitySources.remoteSources;

export const criticalFacilityCategories = [
	{ category: 'police', label: 'Police station' },
	{ category: 'fire', label: 'Fire station' },
	{ category: 'hospital', label: 'Hospital' },
	{ category: 'school', label: 'School' },
	{ category: 'evacuation-center', label: 'Evacuation center' }
] as const satisfies readonly {
	category: CriticalFacilityCategory;
	label: string;
}[];

export const criticalFacilitiesAttribution =
	'Facilities: NOAH / UP Diliman, OpenStreetMap contributors, and Google Maps listings.';

export const emptyCriticalFacilities: CriticalFacilityCollection = {
	type: 'FeatureCollection',
	features: []
};

export const curatedCriticalFacilities: CriticalFacilityCollection = {
	type: 'FeatureCollection',
	features: configuredFacilitySources.curatedFeatures
};

export const curatedEvacuationCenters: CriticalFacilityCollection = {
	type: 'FeatureCollection',
	features: curatedCriticalFacilities.features.filter(
		({ properties }) => properties.category === 'evacuation-center'
	)
};

export const curatedFireStations: CriticalFacilityCollection = {
	type: 'FeatureCollection',
	features: curatedCriticalFacilities.features.filter(
		({ properties }) => properties.category === 'fire'
	)
};

function pointInRing(point: [number, number], ring: number[][]): boolean {
	let inside = false;
	for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
		const [longitude, latitude] = ring[index];
		const [previousLongitude, previousLatitude] = ring[previous];
		const intersects =
			latitude > point[1] !== previousLatitude > point[1] &&
			point[0] <
				((previousLongitude - longitude) * (point[1] - latitude)) / (previousLatitude - latitude) +
					longitude;
		if (intersects) inside = !inside;
	}
	return inside;
}

function pointInCalapan(point: [number, number]): boolean {
	return calapanCityBoundary.geometry.coordinates.some((polygon) => {
		if (!pointInRing(point, polygon[0])) return false;
		return polygon.slice(1).every((hole) => !pointInRing(point, hole));
	});
}

function readFacilityName(properties: Record<string, unknown>): string {
	const value = properties.name ?? properties.Name;
	return typeof value === 'string' ? value.trim() : '';
}

export function normalizeCriticalFacilities(
	source: CriticalFacilitySource,
	value: unknown
): CriticalFacilityCollection {
	if (
		!value ||
		typeof value !== 'object' ||
		!Array.isArray((value as { features?: unknown }).features)
	) {
		return emptyCriticalFacilities;
	}

	const features: CriticalFacilityCollection['features'] = (
		value as { features: unknown[] }
	).features.flatMap((feature) => {
		if (!feature || typeof feature !== 'object') return [];
		const candidate = feature as {
			geometry?: { type?: unknown; coordinates?: unknown };
			properties?: Record<string, unknown> | null;
		};
		if (
			candidate.geometry?.type !== 'Point' ||
			!Array.isArray(candidate.geometry.coordinates) ||
			candidate.geometry.coordinates.length < 2
		) {
			return [];
		}

		const longitude = Number(candidate.geometry.coordinates[0]);
		const latitude = Number(candidate.geometry.coordinates[1]);
		if (
			!Number.isFinite(longitude) ||
			!Number.isFinite(latitude) ||
			!pointInCalapan([longitude, latitude])
		) {
			return [];
		}

		const properties = candidate.properties ?? {};
		const name = readFacilityName(properties);
		if (!name) return [];

		return [
			{
				type: 'Feature',
				properties: {
					...properties,
					category: source.category,
					categoryLabel: source.label,
					name,
					verificationStatus: 'source-listed',
					sourceLabel: source.sourceLabel,
					sourceUrl: source.url
				},
				geometry: { type: 'Point', coordinates: [longitude, latitude] }
			}
		];
	});

	return { type: 'FeatureCollection', features };
}
