import {
	criticalFacilityColors,
	emptyCriticalFacilities,
	type CriticalFacilityCollection
} from '$lib/data/critical-facilities';

type MapInstance = import('maplibre-gl').Map;
type FirstSymbolLayerId = string | undefined;
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const layerIds = [
	'critical-facilities-clusters',
	'critical-facilities-cluster-count',
	'critical-facilities-pulse',
	'critical-facilities-points',
	'critical-facilities-labels'
] as const;

const colorExpression = [
	'match',
	['get', 'category'],
	'police',
	criticalFacilityColors.police,
	'fire',
	criticalFacilityColors.fire,
	'hospital',
	criticalFacilityColors.hospital,
	'school',
	criticalFacilityColors.school,
	'evacuation-center',
	criticalFacilityColors['evacuation-center'],
	'#249b61'
] as unknown as import('maplibre-gl').PropertyValueSpecification<string>;

type Options = {
	map: MapInstance;
	firstSymbolLayerId: FirstSymbolLayerId;
	reducedMotion: boolean;
	setState: (state: LoadState) => void;
};

export type CriticalFacilityLayerManager = {
	layerIds: readonly string[];
	addLayers: () => void;
	setVisibility: (visible: boolean) => void;
	load: () => void;
	getSource: () => import('maplibre-gl').GeoJSONSource | undefined;
	dispose: () => void;
};

export function createCriticalFacilityLayerManager({
	map,
	firstSymbolLayerId,
	reducedMotion,
	setState
}: Options): CriticalFacilityLayerManager {
	let disposed = false;
	let facilityPulseFrame: number | null = null;
	let facilityRequest: Promise<void> | null = null;

	const stopPulse = () => {
		if (facilityPulseFrame !== null) cancelAnimationFrame(facilityPulseFrame);
		facilityPulseFrame = null;
	};

	const startPulse = () => {
		if (reducedMotion || facilityPulseFrame !== null) return;
		const animate = (time: number) => {
			if (disposed || !map.getLayer('critical-facilities-pulse')) {
				stopPulse();
				return;
			}
			const wave = (Math.sin(time / 700) + 1) / 2;
			map.setPaintProperty('critical-facilities-pulse', 'circle-radius', 8 + wave * 8);
			map.setPaintProperty('critical-facilities-pulse', 'circle-opacity', 0.3 - wave * 0.18);
			facilityPulseFrame = requestAnimationFrame(animate);
		};
		facilityPulseFrame = requestAnimationFrame(animate);
	};

	const addLayers = () => {
		map.addSource('calapan-critical-facilities', {
			type: 'geojson',
			data: emptyCriticalFacilities,
			cluster: true,
			clusterMaxZoom: 12,
			clusterMinPoints: 3,
			clusterRadius: 48
		});
		map.addLayer(
			{
				id: 'critical-facilities-clusters',
				type: 'circle',
				source: 'calapan-critical-facilities',
				filter: ['has', 'point_count'],
				layout: { visibility: 'none' },
				paint: {
					'circle-color': '#173e3b',
					'circle-radius': ['step', ['get', 'point_count'], 3, 14, 10, 18, 25],
					'circle-opacity': 0.9,
					'circle-stroke-color': '#f7fff9',
					'circle-stroke-width': 1.5
				}
			},
			firstSymbolLayerId
		);
		map.addLayer(
			{
				id: 'critical-facilities-cluster-count',
				type: 'symbol',
				source: 'calapan-critical-facilities',
				filter: ['has', 'point_count'],
				layout: {
					visibility: 'none',
					'text-field': ['get', 'point_count_abbreviated'],
					'text-size': 10,
					'text-allow-overlap': true
				},
				paint: { 'text-color': '#ffffff' }
			},
			firstSymbolLayerId
		);
		map.addLayer(
			{
				id: 'critical-facilities-pulse',
				type: 'circle',
				source: 'calapan-critical-facilities',
				filter: ['!', ['has', 'point_count']],
				layout: { visibility: 'none' },
				paint: {
					'circle-radius': 9,
					'circle-color': colorExpression,
					'circle-opacity': 0.22,
					'circle-blur': 0.8
				}
			},
			firstSymbolLayerId
		);
		map.addLayer(
			{
				id: 'critical-facilities-points',
				type: 'circle',
				source: 'calapan-critical-facilities',
				filter: ['!', ['has', 'point_count']],
				layout: { visibility: 'none' },
				paint: {
					'circle-radius': 5,
					'circle-color': colorExpression,
					'circle-opacity': 1,
					'circle-stroke-color': '#f7fff9',
					'circle-stroke-width': 1.5
				}
			},
			firstSymbolLayerId
		);
		map.addLayer(
			{
				id: 'critical-facilities-labels',
				type: 'symbol',
				source: 'calapan-critical-facilities',
				minzoom: 12,
				filter: ['!', ['has', 'point_count']],
				layout: {
					visibility: 'none',
					'text-field': ['coalesce', ['get', 'name'], ['get', 'Name']],
					'text-size': 10,
					'text-anchor': 'top',
					'text-offset': [0, 1.25],
					'text-optional': true,
					'text-allow-overlap': false
				},
				paint: {
					'text-color': colorExpression,
					'text-halo-color': '#f7fff9',
					'text-halo-width': 1.25
				}
			},
			firstSymbolLayerId
		);
	};

	const setVisibility = (visible: boolean) => {
		if (disposed) return;
		for (const layerId of layerIds) {
			if (map.getLayer(layerId))
				map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
		}
		if (visible) startPulse();
		else stopPulse();
	};

	const load = () => {
		if (disposed || facilityRequest) return;
		setState('loading');
		facilityRequest = fetch('/critical-facilities.json')
			.then(async (response) => {
				if (!response.ok) throw new Error(`Critical facilities returned ${response.status}`);
				const data = (await response.json()) as CriticalFacilityCollection;
				if (disposed) return;
				const source = map.getSource('calapan-critical-facilities') as
					import('maplibre-gl').GeoJSONSource | undefined;
				if (!source) throw new Error('Critical facility map source is unavailable');
				source.setData(data);
				setState('ready');
			})
			.catch(() => {
				if (!disposed) setState('error');
			})
			.finally(() => {
				facilityRequest = null;
			});
	};

	return {
		layerIds,
		addLayers,
		setVisibility,
		load,
		getSource: () =>
			map.getSource('calapan-critical-facilities') as
				import('maplibre-gl').GeoJSONSource | undefined,
		dispose: () => {
			disposed = true;
			stopPulse();
		}
	};
}
