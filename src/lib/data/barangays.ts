import type { FeatureCollection, MultiPolygon, Point } from 'geojson';
import type { FloodHazardClass } from './flood';
import barangayData from './calapan-barangays.json';
import barangayLabelPointData from './calapan-barangay-label-points.json';

export type BarangayProperties = {
	id: string;
	name: string;
	sourceName: string;
	floodHazardClasses: FloodHazardClass[];
	floodHazardSummary: FloodHazardClass | 'Mixed' | 'NoData';
};

export const calapanBarangays = barangayData as FeatureCollection<MultiPolygon, BarangayProperties>;

export const calapanBarangayLabelPoints = barangayLabelPointData as FeatureCollection<
	Point,
	BarangayProperties
>;

export const calapanBarangayAttribution =
	'Barangay boundaries: OCHA Philippines COD-AB, sourced from NAMRIA and PSA. CC BY-IGO.';
