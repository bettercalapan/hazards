import type { FeatureCollection, MultiPolygon, Point } from 'geojson';
import type { FloodHazardSummary, ReturnPeriod } from './flood';
import type { LandslideHazardSummary, LandslideLayer } from './landslide';
import type { SeismicHazardSummary, SeismicLayer } from './seismic';
import type { StormSurgeAdvisory, StormSurgeSummary } from './storm-surge';

import barangayDataUrl from './calapan-barangays.json?url';
import barangayLabelPointData from './calapan-barangay-label-points.json';
import floodSummaryData from './calapan-flood-summaries.json';
import landslideSummaryData from './calapan-landslide-summaries.json';
import groundShakingSummaryData from './calapan-ground-shaking-summaries.json';
import liquefactionSummaryData from './calapan-liquefaction-summaries.json';
import stormSurgeSummaryData from './calapan-storm-surge-summaries.json';
import tsunamiSummaryData from './calapan-tsunami-summaries.json';

type FloodSummaryData = Record<string, Record<ReturnPeriod, FloodHazardSummary>>;
type StormSurgeSummaryData = Record<string, Record<StormSurgeAdvisory, StormSurgeSummary>>;
type LandslideSummaryData = Record<string, Record<LandslideLayer, LandslideHazardSummary>>;
type SeismicSummaryData = Record<string, Partial<Record<SeismicLayer, SeismicHazardSummary>>>;

export type BarangayProperties = {
	id: string;
	name: string;
	floodHazards: Record<ReturnPeriod, FloodHazardSummary>;
	stormSurgeHazards: Record<StormSurgeAdvisory, StormSurgeSummary>;
	landslideHazards: Record<LandslideLayer, LandslideHazardSummary>;
	seismicHazards: Record<SeismicLayer, SeismicHazardSummary>;
};

export type RawBarangayProperties = Omit<
	BarangayProperties,
	'floodHazards' | 'stormSurgeHazards' | 'landslideHazards' | 'seismicHazards'
>;
export type RawBarangayCollection = FeatureCollection<MultiPolygon, RawBarangayProperties>;
export type BarangayCollection = FeatureCollection<MultiPolygon, BarangayProperties>;

const floodSummaries = floodSummaryData as FloodSummaryData;
const stormSurgeSummaries = stormSurgeSummaryData as StormSurgeSummaryData;
const landslideSummaries = landslideSummaryData as LandslideSummaryData;
const groundShakingSummaries = groundShakingSummaryData as SeismicSummaryData;
const liquefactionSummaries = liquefactionSummaryData as SeismicSummaryData;
const tsunamiSummaries = tsunamiSummaryData as SeismicSummaryData;
export function createCalapanBarangays(rawBarangays: RawBarangayCollection): BarangayCollection {
	return {
		...rawBarangays,
		features: rawBarangays.features.map((feature) => ({
			...feature,
			properties: {
				...feature.properties,
				floodHazards: floodSummaries[feature.properties.id],
				stormSurgeHazards: stormSurgeSummaries[feature.properties.id],
				landslideHazards: landslideSummaries[feature.properties.id],
				seismicHazards: {
					'ground-shaking': groundShakingSummaries[feature.properties.id]['ground-shaking']!,
					liquefaction: liquefactionSummaries[feature.properties.id].liquefaction!,
					tsunami: tsunamiSummaries[feature.properties.id].tsunami!
				}
			}
		}))
	};
}

let barangaysPromise: Promise<BarangayCollection> | null = null;

export function loadCalapanBarangays(): Promise<BarangayCollection> {
	if (!barangaysPromise) {
		barangaysPromise = fetch(barangayDataUrl)
			.then(async (response) => {
				if (!response.ok) throw new Error(`Barangay data returned ${response.status}`);
				return createCalapanBarangays((await response.json()) as RawBarangayCollection);
			})
			.catch((error) => {
				barangaysPromise = null;
				throw error;
			});
	}
	return barangaysPromise;
}

export const calapanBarangayLabelPoints = barangayLabelPointData as FeatureCollection<
	Point,
	Pick<BarangayProperties, 'id' | 'name'>
>;

function normalizeBarangaySearch(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('en-PH')
		.trim();
}

export function searchCalapanBarangays(
	barangays: BarangayCollection,
	query: string
): BarangayProperties[] {
	const normalizedQuery = normalizeBarangaySearch(query);
	if (!normalizedQuery) return [];

	return barangays.features
		.filter((feature) => normalizeBarangaySearch(feature.properties.name).includes(normalizedQuery))
		.map((feature) => feature.properties);
}

export const calapanBarangayAttribution =
	'Barangay boundaries: OCHA Philippines COD-AB, sourced from NAMRIA and PSA. CC BY-IGO.';

export const calapanBarangayMetadata = {
	source: 'OCHA Philippines COD-AB, sourced from NAMRIA and PSA',
	sourceDate: null,
	sourceDateNote: 'The boundary snapshot does not include a source date.',
	coverage: '62 barangays in Calapan City.',
	preparedAt: '2026-08-17',
	licenseNote: 'CC BY-IGO attribution retained.'
} as const;
