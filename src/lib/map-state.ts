import { floodHazardPeriods, type ReturnPeriod } from './data/flood';
import { stormSurgeAdvisories, type StormSurgeAdvisory } from './data/storm-surge';
import { landslideHazards, type LandslideLayer } from './data/landslide';
import { seismicHazards, type SeismicLayer } from './data/seismic';

export type ViewMode = '3d' | '2d';
export type HazardFamily = 'flood' | 'storm-surge' | 'landslide' | 'earthquake' | 'typhoon';

export type MapShareState = {
	viewMode: ViewMode;
	activeHazardFamily: HazardFamily;
	selectedBarangayId: string | null;
	enabledFloodPeriods: ReturnPeriod[];
	enabledStormSurgeAdvisories: StormSurgeAdvisory[];
	enabledLandslideLayers: LandslideLayer[];
	enabledSeismicLayers: SeismicLayer[];
};

const defaultViewMode: ViewMode = '3d';
const defaultHazardFamily: HazardFamily = 'flood';

export function createDefaultMapShareState(): MapShareState {
	return {
		viewMode: defaultViewMode,
		activeHazardFamily: defaultHazardFamily,
		selectedBarangayId: null,
		enabledFloodPeriods: floodHazardPeriods.map((layer) => layer.key),
		enabledStormSurgeAdvisories: stormSurgeAdvisories.map((layer) => layer.key),
		enabledLandslideLayers: landslideHazards.map((layer) => layer.key),
		enabledSeismicLayers: ['ground-shaking']
	};
}

function parseFamily(value: string | null): HazardFamily {
	if (
		value === 'flood' ||
		value === 'storm-surge' ||
		value === 'landslide' ||
		value === 'earthquake' ||
		value === 'typhoon'
	) {
		return value;
	}
	return defaultHazardFamily;
}

function parseLayers<T extends string | number>(
	rawValue: string | null,
	allowed: readonly T[],
	defaults: readonly T[]
): T[] {
	if (rawValue === null) return [...defaults];
	if (rawValue.trim() === '' || rawValue === 'none') return [];

	const values = rawValue.split(',').flatMap((value) => {
		const parsed = typeof allowed[0] === 'number' ? Number(value) : value;
		return allowed.includes(parsed as T) ? [parsed as T] : [];
	});
	return [...new Set(values)];
}

export function parseMapShareState(searchParams: URLSearchParams | string): MapShareState {
	const params =
		typeof searchParams === 'string'
			? new URLSearchParams(searchParams.replace(/^\?/, ''))
			: searchParams;
	const activeHazardFamily = parseFamily(params.get('family'));
	const layers = params.get('layers');
	const selectedBarangayId = params.get('area');
	const state = createDefaultMapShareState();
	state.activeHazardFamily = activeHazardFamily;
	state.viewMode = params.get('view') === '2d' ? '2d' : defaultViewMode;
	state.selectedBarangayId =
		selectedBarangayId && /^PH\d+$/.test(selectedBarangayId) ? selectedBarangayId : null;

	if (activeHazardFamily === 'flood') {
		state.enabledFloodPeriods = parseLayers(
			layers,
			floodHazardPeriods.map((item) => item.key),
			floodHazardPeriods.map((item) => item.key)
		);
	}
	if (activeHazardFamily === 'storm-surge') {
		state.enabledStormSurgeAdvisories = parseLayers(
			layers,
			stormSurgeAdvisories.map((item) => item.key),
			stormSurgeAdvisories.map((item) => item.key)
		);
	}
	if (activeHazardFamily === 'landslide') {
		state.enabledLandslideLayers = parseLayers(
			layers,
			landslideHazards.map((item) => item.key),
			landslideHazards.map((item) => item.key)
		);
	}
	if (activeHazardFamily === 'earthquake') {
		state.enabledSeismicLayers = parseLayers(
			layers,
			seismicHazards.map((item) => item.key),
			seismicHazards.map((item) => item.key)
		);
	}

	return state;
}

function layersForState(state: MapShareState): readonly (string | number)[] {
	if (state.activeHazardFamily === 'flood') return state.enabledFloodPeriods;
	if (state.activeHazardFamily === 'storm-surge') return state.enabledStormSurgeAdvisories;
	if (state.activeHazardFamily === 'landslide') return state.enabledLandslideLayers;
	if (state.activeHazardFamily === 'earthquake') return state.enabledSeismicLayers;
	return [];
}

export function serializeMapShareState(state: MapShareState): string {
	const params = new URLSearchParams();
	params.set('family', state.activeHazardFamily);
	params.set('layers', layersForState(state).join(',') || 'none');
	params.set('view', state.viewMode);
	if (state.selectedBarangayId) params.set('area', state.selectedBarangayId);
	return `?${params.toString()}`;
}
