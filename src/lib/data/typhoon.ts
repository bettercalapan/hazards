import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';
import { calapanCityBounds } from './calapan-boundary';

export const panahonCycloneTrackUrl = 'https://www.panahon.gov.ph/api/v1/cyclone-track';
export const typhoonMetadata = {
	source: 'PANaHON',
	sourceUrl: 'https://www.panahon.gov.ph'
} as const;
export const typhoonCategories = [
	{ key: 'LPA', color: '#9aa5b1' },
	{ key: 'TD', color: '#00e400' },
	{ key: 'TS', color: '#ffe400' },
	{ key: 'STS', color: '#ff9800' },
	{ key: 'TY', color: '#ff2020' },
	{ key: 'STY', color: '#e000e0' }
] as const satisfies readonly { key: string; color: string }[];

const trackFreshnessWindowMs = 36 * 60 * 60 * 1000;
const gridCellSize = 0.004;
const gridInfluenceDistanceKm = 20;

export type TyphoonTrackPoint = {
	latitude: number;
	longitude: number;
	time: string;
	type: string;
	radius: number;
};

export type TyphoonTrack = {
	id: string;
	name: string;
	points: TyphoonTrackPoint[];
};

type TrackLineProperties = {
	name: string;
	source: string;
	forecast: boolean;
	type: string;
};

type TrackPointProperties = {
	name: string;
	source: string;
	time: string;
	type: string;
	forecast: boolean;
};

type GridCellProperties = {
	proximity: number;
	distanceKm: number;
	type: string;
};

export type TyphoonMapData = {
	tracks: FeatureCollection<LineString, TrackLineProperties>;
	points: FeatureCollection<Point, TrackPointProperties>;
	grid: FeatureCollection<Polygon, GridCellProperties>;
	names: string[];
	latestDataAt: string | null;
};

export const emptyTyphoonMapData: TyphoonMapData = {
	tracks: { type: 'FeatureCollection', features: [] },
	points: { type: 'FeatureCollection', features: [] },
	grid: { type: 'FeatureCollection', features: [] },
	names: [],
	latestDataAt: null
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}

function readString(record: UnknownRecord, keys: string[]): string {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'string' && value.trim()) return value.trim();
		if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	}
	return '';
}

function readNumber(record: UnknownRecord, keys: string[]): number | null {
	for (const key of keys) {
		const value = record[key];
		const number = typeof value === 'number' ? value : Number(value);
		if (Number.isFinite(number)) return number;
	}
	return null;
}

function normalizeCycloneName(value: string): string {
	return value
		.replace(/\{([^}]+)\}/g, ' ($1)')
		.replace(/\s+/g, ' ')
		.trim();
}

function readPoint(value: unknown, fallbackTime: string): TyphoonTrackPoint | null {
	const record = asRecord(value);
	if (!record) return null;

	const latitude = readNumber(record, ['latitude', 'lat']);
	const longitude = readNumber(record, ['longitude', 'lon', 'lng']);
	if (
		latitude === null ||
		longitude === null ||
		Math.abs(latitude) > 90 ||
		Math.abs(longitude) > 180
	) {
		return null;
	}

	return {
		latitude,
		longitude,
		time: readString(record, ['datetime', 'timestamp']) || fallbackTime,
		type: (readString(record, ['cyclone_type', 'type']) || 'LPA').toUpperCase(),
		radius: Math.max(0, readNumber(record, ['radius']) ?? 0)
	};
}

function normalizePoints(points: TyphoonTrackPoint[]): TyphoonTrackPoint[] {
	const unique = new Map<string, TyphoonTrackPoint>();
	for (const point of points) {
		const key = `${point.time}|${point.latitude.toFixed(5)}|${point.longitude.toFixed(5)}`;
		unique.set(key, point);
	}

	return [...unique.values()].sort((left, right) => left.time.localeCompare(right.time));
}

function parseTrack(value: unknown, id: string, now: number): TyphoonTrack | null {
	const record = asRecord(value);
	const info = asRecord(record?.info);
	if (!record || !info) return null;

	const points = normalizePoints(
		Object.entries(info).flatMap(([time, point]) => {
			const parsed = readPoint(point, time);
			return parsed ? [parsed] : [];
		})
	);
	if (points.length < 2) return null;

	const latestTime = Date.parse(points[points.length - 1].time);
	if (Number.isFinite(latestTime) && latestTime < now - trackFreshnessWindowMs) return null;

	return {
		id,
		name: normalizeCycloneName(readString(record, ['cyclone_name', 'name']) || id),
		points
	};
}

export function parsePanahonCycloneTracks(payload: unknown, now = Date.now()): TyphoonTrack[] {
	const candidates = Array.isArray(payload)
		? payload.map((value, index) => [String(index), value] as const)
		: [];

	return candidates
		.map(([id, value]) => parseTrack(value, id, now))
		.filter((track): track is TyphoonTrack => track !== null);
}

function toLocalCoordinates(latitude: number, longitude: number): [number, number] {
	const latitudeScale = Math.cos((latitude * Math.PI) / 180);
	return [longitude * latitudeScale, latitude];
}

function distanceBetweenKm(left: [number, number], right: [number, number]): number {
	return Math.hypot(left[0] - right[0], left[1] - right[1]) * 111.32;
}

function distanceToSegmentKm(
	point: [number, number],
	segmentStart: [number, number],
	segmentEnd: [number, number]
): number {
	const localPoint = toLocalCoordinates(point[1], point[0]);
	const localStart = toLocalCoordinates(segmentStart[1], segmentStart[0]);
	const localEnd = toLocalCoordinates(segmentEnd[1], segmentEnd[0]);
	const deltaX = localEnd[0] - localStart[0];
	const deltaY = localEnd[1] - localStart[1];
	const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;
	const position =
		segmentLengthSquared === 0
			? 0
			: Math.max(
					0,
					Math.min(
						1,
						((localPoint[0] - localStart[0]) * deltaX + (localPoint[1] - localStart[1]) * deltaY) /
							segmentLengthSquared
					)
				);
	const nearestPoint: [number, number] = [
		localStart[0] + position * deltaX,
		localStart[1] + position * deltaY
	];
	return distanceBetweenKm(localPoint, nearestPoint);
}

function nearestTrackValue(
	latitude: number,
	longitude: number,
	tracks: TyphoonTrack[]
): { distanceKm: number; type: string } {
	let nearest = { distanceKm: Infinity, type: 'LPA' };

	for (const track of tracks) {
		for (let index = 1; index < track.points.length; index += 1) {
			const previous = track.points[index - 1];
			const current = track.points[index];
			const distanceKm = distanceToSegmentKm(
				[longitude, latitude],
				[previous.longitude, previous.latitude],
				[current.longitude, current.latitude]
			);
			if (distanceKm < nearest.distanceKm) {
				nearest = { distanceKm, type: current.type || previous.type };
			}
		}
	}

	return nearest;
}

function proximityClass(distanceKm: number): number {
	if (distanceKm <= 2) return 4;
	if (distanceKm <= 5) return 3;
	if (distanceKm <= 10) return 2;
	if (distanceKm <= gridInfluenceDistanceKm) return 1;
	return 0;
}

function createGrid(tracks: TyphoonTrack[]): FeatureCollection<Polygon, GridCellProperties> {
	const [minLongitude, minLatitude, maxLongitude, maxLatitude] = calapanCityBounds;
	const features: Feature<Polygon, GridCellProperties>[] = [];

	for (let south = minLatitude; south < maxLatitude; south += gridCellSize) {
		for (let west = minLongitude; west < maxLongitude; west += gridCellSize) {
			const east = Math.min(west + gridCellSize, maxLongitude);
			const north = Math.min(south + gridCellSize, maxLatitude);
			const centerLatitude = (south + north) / 2;
			const centerLongitude = (west + east) / 2;
			const { distanceKm, type } = nearestTrackValue(centerLatitude, centerLongitude, tracks);
			const proximity = proximityClass(distanceKm);
			if (proximity === 0) continue;

			features.push({
				type: 'Feature',
				properties: { proximity, distanceKm: Number(distanceKm.toFixed(2)), type },
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[west, south],
							[east, south],
							[east, north],
							[west, north],
							[west, south]
						]
					]
				}
			});
		}
	}

	return { type: 'FeatureCollection', features };
}

function latestTrackTimestamp(tracks: TyphoonTrack[]): string | null {
	let latestTime = -Infinity;
	let latestValue: string | null = null;

	for (const track of tracks) {
		for (const point of track.points) {
			const timestamp = Date.parse(point.time);
			if (Number.isFinite(timestamp) && timestamp > latestTime) {
				latestTime = timestamp;
				latestValue = point.time;
			}
		}
	}

	return latestValue;
}

export function buildTyphoonMapData(tracks: TyphoonTrack[]): TyphoonMapData {
	const trackFeatures: Feature<LineString, TrackLineProperties>[] = [];
	const pointFeatures: Feature<Point, TrackPointProperties>[] = [];

	for (const track of tracks) {
		for (const point of track.points) {
			pointFeatures.push({
				type: 'Feature',
				properties: {
					name: track.name,
					source: 'PANaHON',
					time: point.time,
					type: point.type,
					forecast: point.radius > 0
				},
				geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }
			});
		}

		for (let index = 1; index < track.points.length; index += 1) {
			const previous = track.points[index - 1];
			const current = track.points[index];
			trackFeatures.push({
				type: 'Feature',
				properties: {
					name: track.name,
					source: 'PANaHON',
					forecast: current.radius > 0,
					type: current.type
				},
				geometry: {
					type: 'LineString',
					coordinates: [
						[previous.longitude, previous.latitude],
						[current.longitude, current.latitude]
					]
				}
			});
		}
	}

	return {
		tracks: { type: 'FeatureCollection', features: trackFeatures },
		points: { type: 'FeatureCollection', features: pointFeatures },
		grid: createGrid(tracks),
		names: tracks.map((track) => track.name),
		latestDataAt: latestTrackTimestamp(tracks)
	};
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function fetchPanahonTyphoonTracks(
	fetcher: Fetcher,
	now = Date.now()
): Promise<TyphoonMapData> {
	const response = await fetcher(panahonCycloneTrackUrl, {
		headers: { accept: 'application/json' },
		cf: { cacheTtlByStatus: { '200-299': 300, '400-599': 0 } }
	});
	if (!response.ok) throw new Error(`PANaHON cyclone track returned ${response.status}`);

	const body = (await response.text()).trim();
	if (!body) return emptyTyphoonMapData;

	return buildTyphoonMapData(parsePanahonCycloneTracks(JSON.parse(body), now));
}
