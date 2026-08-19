import type { Feature, MultiPolygon, Polygon } from 'geojson';
import cityBoundary from './calapan-city.json';

export const calapanCityBoundary = cityBoundary as Feature<MultiPolygon>;

export const calapanCityBounds = [
	121.10036758600006, 13.296270203000063, 121.28920787700008, 13.467073836000054
] as const;

const worldRing = [
	[-180, -85],
	[180, -85],
	[180, 85],
	[-180, 85],
	[-180, -85]
] as [number, number][];

const cityHoles = calapanCityBoundary.geometry.coordinates.map(([ring]) => [...ring].reverse());

export const calapanCityMask: Feature<Polygon> = {
	type: 'Feature',
	properties: null,
	geometry: {
		type: 'Polygon',
		coordinates: [worldRing, ...cityHoles]
	}
};
