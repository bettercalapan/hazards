import type { TyphoonMapData } from '$lib/data/typhoon';
import {
	fillColorForLayer,
	hazardFamilies,
	hazardTileBounds,
	isLayerEnabled,
	layerIdFor,
	layersForFamily,
	sourceIdsForFamily,
	sourceLayerFor,
	type EnabledHazardLayers,
	type HazardLayerDefinition
} from './hazard-layers';
import type { HazardFamily } from '$lib/map-state';

type MapInstance = import('maplibre-gl').Map;
type FirstSymbolLayerId = string | undefined;

type Options = {
	map: MapInstance;
	firstSymbolLayerId: FirstSymbolLayerId;
	typhoonMapData: TyphoonMapData;
	getActiveFamily: () => HazardFamily;
	getEnabledLayers: () => EnabledHazardLayers;
	setLoadingFamily: (family: HazardFamily | null) => void;
};

type FamilyLoad = {
	promise: Promise<void>;
	cancel: () => void;
};

export type HazardLayerManager = {
	addLayers: () => void;
	updateVisibility: () => void;
	transition: (nextFamily: HazardFamily) => void;
	preload: (family: HazardFamily) => void;
	dispose: () => void;
};

export function createHazardLayerManager({
	map,
	firstSymbolLayerId,
	typhoonMapData,
	getActiveFamily,
	getEnabledLayers,
	setLoadingFamily
}: Options): HazardLayerManager {
	let disposed = false;
	let renderedHazardFamily = getActiveFamily();
	let transitionSequence = 0;
	const familyLoads = new Map<HazardFamily, FamilyLoad>();
	const typhoonLayerIds = [
		'calapan-typhoon-grid',
		'calapan-typhoon-track-observed',
		'calapan-typhoon-track-forecast',
		'calapan-typhoon-points'
	];

	const addHazardLayers = (family: HazardFamily, layers: readonly HazardLayerDefinition[]) => {
		for (const layer of [...layers].reverse()) {
			const sourceId = layerIdFor(family, layer.key);
			map.addSource(sourceId, {
				type: 'vector',
				tiles: [layer.tilePath],
				minzoom: 10,
				maxzoom: 15,
				bounds: hazardTileBounds
			});
			map.addLayer(
				{
					id: sourceId,
					type: 'fill',
					source: sourceId,
					'source-layer': sourceLayerFor(family, layer),
					layout: { visibility: 'none' },
					paint: {
						'fill-color': fillColorForLayer(layer),
						'fill-opacity': 0.85
					}
				},
				firstSymbolLayerId
			);
		}
	};

	const addTyphoonLayers = () => {
		map.addSource('calapan-typhoon-grid', {
			type: 'geojson',
			data: typhoonMapData.grid
		});
		map.addLayer(
			{
				id: 'calapan-typhoon-grid',
				type: 'fill',
				source: 'calapan-typhoon-grid',
				layout: { visibility: 'none' },
				paint: {
					'fill-color': [
						'match',
						['get', 'type'],
						'LPA',
						'#9aa5b1',
						'TD',
						'#00e400',
						'TS',
						'#ffe400',
						'STS',
						'#ff9800',
						'TY',
						'#ff2020',
						'STY',
						'#e000e0',
						'#9aa5b1'
					] as unknown as import('maplibre-gl').PropertyValueSpecification<string>,
					'fill-opacity': [
						'interpolate',
						['linear'],
						['get', 'proximity'],
						1,
						0.18,
						4,
						0.78
					] as unknown as import('maplibre-gl').PropertyValueSpecification<number>,
					'fill-outline-color': '#fff8df'
				}
			},
			firstSymbolLayerId
		);
		map.addSource('calapan-typhoon-track', {
			type: 'geojson',
			data: typhoonMapData.tracks
		});
		map.addLayer(
			{
				id: 'calapan-typhoon-track-observed',
				type: 'line',
				source: 'calapan-typhoon-track',
				filter: ['==', ['get', 'forecast'], false],
				layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': '#b83355', 'line-width': 3, 'line-opacity': 0.9 }
			},
			firstSymbolLayerId
		);
		map.addLayer(
			{
				id: 'calapan-typhoon-track-forecast',
				type: 'line',
				source: 'calapan-typhoon-track',
				filter: ['==', ['get', 'forecast'], true],
				layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': '#b83355',
					'line-width': 3,
					'line-opacity': 0.9,
					'line-dasharray': [1.5, 1.5]
				}
			},
			firstSymbolLayerId
		);
		map.addSource('calapan-typhoon-points', {
			type: 'geojson',
			data: typhoonMapData.points
		});
		map.addLayer(
			{
				id: 'calapan-typhoon-points',
				type: 'circle',
				source: 'calapan-typhoon-points',
				layout: { visibility: 'none' },
				paint: {
					'circle-radius': 4,
					'circle-color': [
						'match',
						['get', 'type'],
						'LPA',
						'#9aa5b1',
						'TD',
						'#00e400',
						'TS',
						'#ffe400',
						'STS',
						'#ff9800',
						'TY',
						'#ff2020',
						'STY',
						'#e000e0',
						'#9aa5b1'
					] as unknown as import('maplibre-gl').PropertyValueSpecification<string>,
					'circle-stroke-color': '#b83355',
					'circle-stroke-width': 2
				}
			},
			firstSymbolLayerId
		);
	};

	const setFamilyVisibility = (family: HazardFamily, visible: boolean, opacity = 0.85) => {
		if (family === 'typhoon') {
			for (const layerId of typhoonLayerIds) {
				if (!map.getLayer(layerId)) continue;
				map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
				if (layerId === 'calapan-typhoon-grid') {
					map.setPaintProperty(
						layerId,
						'fill-opacity',
						visible && opacity > 0
							? ([
									'interpolate',
									['linear'],
									['get', 'proximity'],
									1,
									0.18,
									4,
									0.78
								] as unknown as import('maplibre-gl').PropertyValueSpecification<number>)
							: 0
					);
				}
			}
			return;
		}
		const enabledLayers = getEnabledLayers();
		for (const layer of layersForFamily(family)) {
			const layerId = layerIdFor(family, layer.key);
			const shouldShow = visible && isLayerEnabled(family, layer.key, enabledLayers);
			if (!map.getLayer(layerId)) continue;
			map.setLayoutProperty(layerId, 'visibility', shouldShow ? 'visible' : 'none');
			map.setPaintProperty(layerId, 'fill-opacity', shouldShow ? opacity : 0.85);
		}
	};

	const loadFamilyTiles = (family: HazardFamily): Promise<void> => {
		const existingLoad = familyLoads.get(family);
		if (existingLoad) return existingLoad.promise;

		const sourceIds = sourceIdsForFamily(family, getEnabledLayers());
		if (sourceIds.length === 0) return Promise.resolve();

		let cancel = () => {};
		const promise = new Promise<void>((resolve) => {
			let settled = false;
			const finish = () => {
				if (settled) return;
				settled = true;
				if (timeout) clearTimeout(timeout);
				map.off('sourcedata', onSourceData);
				map.off('idle', onIdle);
				resolve();
			};
			cancel = finish;
			const check = () => {
				if (sourceIds.every((sourceId) => map.isSourceLoaded(sourceId))) finish();
			};
			const onSourceData = () => check();
			const onIdle = () => check();

			map.on('sourcedata', onSourceData);
			map.on('idle', onIdle);
			const timeout = setTimeout(finish, 10000);
			check();
		});

		familyLoads.set(family, { promise, cancel });
		void promise.finally(() => {
			if (familyLoads.get(family)?.promise === promise) familyLoads.delete(family);
		});
		return promise;
	};

	const updateVisibility = () => {
		for (const family of hazardFamilies) {
			setFamilyVisibility(
				family,
				family === renderedHazardFamily || family === loadingFamily,
				family === loadingFamily ? 0 : 0.85
			);
		}
	};
	let loadingFamily: HazardFamily | null = null;
	const setLoading = (family: HazardFamily | null) => {
		loadingFamily = family;
		setLoadingFamily(family);
	};

	const addLayers = () => {
		addHazardLayers('flood', layersForFamily('flood'));
		addHazardLayers('storm-surge', layersForFamily('storm-surge'));
		addHazardLayers('landslide', layersForFamily('landslide'));
		addHazardLayers('earthquake', layersForFamily('earthquake'));
		addTyphoonLayers();
	};

	const transition = (nextFamily: HazardFamily) => {
		if (disposed) return;
		const previousFamily = renderedHazardFamily;
		if (nextFamily === previousFamily) {
			setLoading(null);
			updateVisibility();
			return;
		}

		const sequence = ++transitionSequence;
		setLoading(nextFamily);
		for (const family of hazardFamilies) {
			if (family !== previousFamily && family !== nextFamily) setFamilyVisibility(family, false);
		}
		setFamilyVisibility(nextFamily, true, 0);

		void loadFamilyTiles(nextFamily).then(() => {
			if (disposed || sequence !== transitionSequence) return;
			setFamilyVisibility(previousFamily, false);
			setFamilyVisibility(nextFamily, true);
			for (const family of hazardFamilies) {
				if (family !== nextFamily) setFamilyVisibility(family, false);
			}
			renderedHazardFamily = nextFamily;
			setLoading(null);
		});
	};

	const preload = (family: HazardFamily) => {
		if (disposed || family === renderedHazardFamily || family === getActiveFamily()) return;
		setFamilyVisibility(family, true, 0);
		void loadFamilyTiles(family).then(() => {
			if (!disposed && renderedHazardFamily !== family && getActiveFamily() !== family) {
				setFamilyVisibility(family, false);
			}
		});
	};

	const dispose = () => {
		disposed = true;
		transitionSequence += 1;
		for (const load of familyLoads.values()) load.cancel();
		familyLoads.clear();
		setLoading(null);
	};

	return { addLayers, updateVisibility, transition, preload, dispose };
}
