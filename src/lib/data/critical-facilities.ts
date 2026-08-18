import type { FeatureCollection, Point } from 'geojson';
import { calapanCityBoundary } from './calapan-boundary';

export type CriticalFacilityCategory = 'police' | 'fire' | 'hospital' | 'school';

export const criticalFacilityColors: Record<CriticalFacilityCategory, string> = {
	police: '#2563eb',
	fire: '#dc4c2f',
	hospital: '#16a34a',
	school: '#9333ea'
};

export type CriticalFacilitySource = {
	readonly category: CriticalFacilityCategory;
	readonly label: string;
	readonly url: string;
};

export type CriticalFacilityProperties = {
	category: CriticalFacilityCategory;
	categoryLabel: string;
	name: string;
	[key: string]: unknown;
};

export type CriticalFacilityCollection = FeatureCollection<Point, CriticalFacilityProperties>;

export const criticalFacilitySources = [
	{
		category: 'police',
		label: 'Police station',
		url: 'https://webgis-static.up.edu.ph/api/critical_facilities/police_station.geojson'
	},
	{
		category: 'fire',
		label: 'Fire station',
		url: 'https://webgis-static.up.edu.ph/api/critical_facilities/fire_station.geojson'
	},
	{
		category: 'hospital',
		label: 'Hospital',
		url: 'https://webgis-static.up.edu.ph/api/critical_facilities/hospitals.geojson'
	},
	{
		category: 'school',
		label: 'School',
		url: 'https://webgis-static.up.edu.ph/api/critical_facilities/schools.geojson'
	}
] as const satisfies readonly CriticalFacilitySource[];

export const criticalFacilitiesAttribution =
	'Facilities: NOAH / UP Diliman and OpenStreetMap contributors.';

export const emptyCriticalFacilities: CriticalFacilityCollection = {
	type: 'FeatureCollection',
	features: []
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
					name
				},
				geometry: { type: 'Point', coordinates: [longitude, latitude] }
			}
		];
	});

	return { type: 'FeatureCollection', features };
}
