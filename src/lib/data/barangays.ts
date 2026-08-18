import type { FeatureCollection, MultiPolygon, Point } from 'geojson';
import type { FloodHazardClass, FloodHazardSummary, ReturnPeriod } from './flood';
import barangayData from './calapan-barangays.json';
import barangayLabelPointData from './calapan-barangay-label-points.json';
import floodSummaryData from './calapan-flood-summaries.json';
import stormSurgeSummaryData from './calapan-storm-surge-summaries.json';
import type { StormSurgeAdvisory, StormSurgeSummary } from './storm-surge';
import landslideSummaryData from './calapan-landslide-summaries.json';
import type { LandslideHazardSummary, LandslideLayer } from './landslide';

type FloodSummaryData = Record<string, Record<ReturnPeriod, FloodHazardSummary>>;
type StormSurgeSummaryData = Record<string, Record<StormSurgeAdvisory, StormSurgeSummary>>;
type LandslideSummaryData = Record<string, Record<LandslideLayer, LandslideHazardSummary>>;

export type BarangayProperties = {
	id: string;
	name: string;
	sourceName: string;
	floodHazardClasses: FloodHazardClass[];
	floodHazardSummary: FloodHazardClass | 'Mixed' | 'NoData';
	floodHazards: Record<ReturnPeriod, FloodHazardSummary>;
	stormSurgeHazards: Record<StormSurgeAdvisory, StormSurgeSummary>;
	landslideHazards: Record<LandslideLayer, LandslideHazardSummary>;
};

const floodSummaries = floodSummaryData as FloodSummaryData;
const stormSurgeSummaries = stormSurgeSummaryData as StormSurgeSummaryData;
const landslideSummaries = landslideSummaryData as LandslideSummaryData;
const rawBarangays = barangayData as FeatureCollection<
	MultiPolygon,
	Omit<BarangayProperties, 'floodHazards' | 'stormSurgeHazards' | 'landslideHazards'>
>;

export const calapanBarangays = {
	...rawBarangays,
	features: rawBarangays.features.map((feature) => ({
		...feature,
		properties: {
			...feature.properties,
			floodHazards: floodSummaries[feature.properties.id],
			stormSurgeHazards: stormSurgeSummaries[feature.properties.id],
			landslideHazards: landslideSummaries[feature.properties.id]
		}
	}))
} as FeatureCollection<MultiPolygon, BarangayProperties>;

export const calapanBarangayLabelPoints = barangayLabelPointData as FeatureCollection<
	Point,
	Pick<BarangayProperties, 'id' | 'name' | 'sourceName'>
>;

export const calapanBarangayAttribution =
	'Barangay boundaries: OCHA Philippines COD-AB, sourced from NAMRIA and PSA. CC BY-IGO.';
