<script lang="ts">
	import { onMount } from 'svelte';
	import { calapanCityBounds } from '$lib/data/calapan-boundary';
	import {
		calapanBarangayLabelPoints,
		loadCalapanBarangays,
		type BarangayProperties
	} from '$lib/data/barangays';
	import { emptyTyphoonMapData, type TyphoonMapData } from '$lib/data/typhoon';
	import { criticalFacilitiesAttribution } from '$lib/data/critical-facilities';
	import { type HazardFamily, type MapShareState, type ViewMode } from '$lib/map-state';
	import { loadOpenFreeMapStyle, transformOpenFreeMapRequest } from '$lib/map/open-free-map-style';
	import {
		getPanBounds,
		restrictSymbolLayers,
		setupBaseMap,
		updateMapCamera as setMapCamera,
		type MapBounds
	} from '$lib/map/map-setup';
	import { createBarangayLayerManager } from '$lib/map/barangay-layer-manager';
	import { createCriticalFacilityLayerManager } from '$lib/map/critical-facility-layer-manager';
	import { createHazardLayerManager } from '$lib/map/hazard-layer-manager';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import 'maplibre-gl/dist/maplibre-gl.css';

	type CriticalFacilitiesState = 'idle' | 'loading' | 'ready' | 'error';

	type Props = {
		typhoonMapData?: TyphoonMapData;
		selectedBarangayId?: string | null;
		mapState: MapShareState;
		criticalFacilitiesEnabled: boolean;
		onSelectArea?: (area: BarangayProperties | null) => void;
		onPreloadHazardFamilyReady?: (preload: (family: HazardFamily) => void) => void;
		onCriticalFacilitiesStateChange?: (state: CriticalFacilitiesState) => void;
	};
	let {
		typhoonMapData = emptyTyphoonMapData,
		selectedBarangayId = null,
		mapState,
		criticalFacilitiesEnabled,
		onSelectArea,
		onPreloadHazardFamilyReady,
		onCriticalFacilitiesStateChange
	}: Props = $props();
	let syncSelectedBarangay: (id: string | null) => void = () => {};

	let criticalFacilitiesState = $state<CriticalFacilitiesState>('idle');
	let lastCriticalFacilitiesEnabled = $state(false);
	let loadCriticalFacilities: () => void = () => {};
	let setCriticalFacilitiesVisibility: (visible: boolean) => void = () => {};
	let disposeCriticalFacilityLayerManager = () => {};

	let mapElement: HTMLDivElement;
	let mapReady = $state(false);
	let updateMapCamera: (nextMode: ViewMode) => void = () => {};
	let updateHazardVisibility: () => void = () => {};
	let transitionHazardFamily: (nextFamily: HazardFamily) => void = () => {};
	let lastActiveHazardFamily = $state<HazardFamily | null>(null);
	let lastViewMode = $state<ViewMode | null>(null);
	let disposeBarangayLayerManager = () => {};
	let disposeHazardLayerManager = () => {};

	$effect(() => {
		const id = selectedBarangayId;
		if (mapReady) syncSelectedBarangay(id);
	});

	$effect(() => {
		const state = mapState;
		if (!mapReady) return;
		if (lastActiveHazardFamily === null) {
			lastActiveHazardFamily = state.activeHazardFamily;
			updateHazardVisibility();
			return;
		}
		if (state.activeHazardFamily !== lastActiveHazardFamily) {
			lastActiveHazardFamily = state.activeHazardFamily;
			transitionHazardFamily(state.activeHazardFamily);
		} else {
			updateHazardVisibility();
		}
	});

	$effect(() => {
		const mode = mapState.viewMode;
		if (!mapReady || mode === lastViewMode) return;
		lastViewMode = mode;
		updateMapCamera(mode);
	});

	$effect(() => {
		const enabled = criticalFacilitiesEnabled;
		if (!mapReady) return;
		setCriticalFacilitiesVisibility(enabled);
		if (
			enabled &&
			!lastCriticalFacilitiesEnabled &&
			(criticalFacilitiesState === 'idle' || criticalFacilitiesState === 'error')
		) {
			loadCriticalFacilities();
		}
		lastCriticalFacilitiesEnabled = enabled;
	});

	onMount(() => {
		let disposed = false;
		let map: import('maplibre-gl').Map | undefined;
		let terrainReady = false;
		let terrainEnabled = false;
		let terrainTimer: ReturnType<typeof setTimeout> | undefined;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const initialize = async () => {
			const [{ setWorkerUrl, Map: MapLibreMap, Popup }, calapanBarangays] = await Promise.all([
				import('maplibre-gl'),
				loadCalapanBarangays()
			]);

			if (disposed) return;
			setWorkerUrl(workerUrl);
			const style = await loadOpenFreeMapStyle();
			if (disposed) return;
			const cityBounds: MapBounds = [
				[calapanCityBounds[0], calapanCityBounds[1]],
				[calapanCityBounds[2], calapanCityBounds[3]]
			];

			const mapInstance = new MapLibreMap({
				container: mapElement,
				style,
				transformRequest: transformOpenFreeMapRequest,
				center: [121.1783, 13.4117],
				zoom: 11.5,
				pitch: 45,
				bearing: -12,
				maxPitch: 75,
				pitchWithRotate: true,
				attributionControl: { compact: true }
			});
			map = mapInstance;
			mapInstance.on('error', ({ error }) => {
				console.error(`[MapLibre] ${error.message}`);
			});

			updateMapCamera = (nextMode) => {
				setMapCamera(mapInstance, terrainReady && terrainEnabled, nextMode);
			};

			mapInstance.once('load', () => {
				if (disposed) return;
				const baseMap = setupBaseMap(mapInstance, calapanBarangays);
				terrainReady = baseMap.terrainReady;
				const { firstSymbolLayerId } = baseMap;
				const hazardLayerManager = createHazardLayerManager({
					map: mapInstance,
					firstSymbolLayerId,
					typhoonMapData,
					getActiveFamily: () => mapState.activeHazardFamily,
					getEnabledLayers: () => ({
						enabledFloodPeriods: mapState.enabledFloodPeriods,
						enabledStormSurgeAdvisories: mapState.enabledStormSurgeAdvisories,
						enabledLandslideLayers: mapState.enabledLandslideLayers,
						enabledSeismicLayers: mapState.enabledSeismicLayers
					}),
					setLoadingFamily: () => {}
				});
				hazardLayerManager.addLayers();
				disposeHazardLayerManager = hazardLayerManager.dispose;
				transitionHazardFamily = hazardLayerManager.transition;
				onPreloadHazardFamilyReady?.(hazardLayerManager.preload);
				updateHazardVisibility = hazardLayerManager.updateVisibility;
				hazardLayerManager.updateVisibility();
				mapInstance.addLayer(
					{
						id: 'calapan-city-mask-overlay',
						type: 'fill',
						source: 'calapan-city-mask',
						paint: {
							'fill-color': '#f7f2e8',
							'fill-opacity': 0.5
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addLayer(
					{
						id: 'calapan-city-boundary-overlay',
						type: 'line',
						source: 'calapan-city-boundary',
						paint: {
							'line-color': '#d18f38',
							'line-width': 2,
							'line-opacity': 0.9
						}
					},
					firstSymbolLayerId
				);
				const criticalFacilityLayerManager = createCriticalFacilityLayerManager({
					map: mapInstance,
					firstSymbolLayerId,
					reducedMotion,
					setState: (state) => {
						criticalFacilitiesState = state;
						onCriticalFacilitiesStateChange?.(state);
					}
				});
				criticalFacilityLayerManager.addLayers();
				disposeCriticalFacilityLayerManager = criticalFacilityLayerManager.dispose;
				setCriticalFacilitiesVisibility = criticalFacilityLayerManager.setVisibility;
				loadCriticalFacilities = criticalFacilityLayerManager.load;
				const barangayLayerManager = createBarangayLayerManager({
					map: mapInstance,
					barangays: calapanBarangays,
					barangayLabelPoints: calapanBarangayLabelPoints,
					firstSymbolLayerId,
					onSelectArea
				});
				barangayLayerManager.addLayers();
				disposeBarangayLayerManager = barangayLayerManager.dispose;
				syncSelectedBarangay = barangayLayerManager.syncSelection;
				restrictSymbolLayers(mapInstance);
				criticalFacilityLayerManager.bindInteractions(Popup);
				criticalFacilityLayerManager.moveLayersToTop();

				mapInstance.fitBounds(cityBounds, {
					padding: 32,
					maxZoom: 12,
					duration: 0
				});
				mapInstance.setMaxBounds(getPanBounds(mapInstance));
				mapInstance.setMinZoom(mapInstance.getZoom());
				updateMapCamera(mapState.viewMode);
				lastViewMode = mapState.viewMode;
				mapReady = true;
				terrainTimer = setTimeout(() => {
					if (disposed) return;
					terrainEnabled = true;
					mapInstance.setLayoutProperty('calapan-terrain-hillshade', 'visibility', 'visible');
					if (mapState.viewMode === '3d') {
						mapInstance.setTerrain({ source: 'calapan-terrain', exaggeration: 1.15 });
					}
				}, 1500);
			});
		};

		void initialize();

		return () => {
			disposed = true;
			updateMapCamera = () => {};
			disposeBarangayLayerManager();
			disposeBarangayLayerManager = () => {};
			disposeCriticalFacilityLayerManager();
			disposeCriticalFacilityLayerManager = () => {};
			disposeHazardLayerManager();
			disposeHazardLayerManager = () => {};
			if (terrainTimer) clearTimeout(terrainTimer);
			setCriticalFacilitiesVisibility = () => {};
			loadCriticalFacilities = () => {};
			onPreloadHazardFamilyReady?.(() => {});
			map?.remove();
		};
	});
</script>

<div class="map-shell">
	<div
		bind:this={mapElement}
		class="map"
		data-map-ready={mapReady}
		role="region"
		aria-label="Interactive map of Calapan City"
		aria-describedby="map-boundary-note"
	></div>

	<div id="map-boundary-note" class="boundary-note" role="note">
		{#if mapState.activeHazardFamily === 'earthquake'}
			PHIVOLCS Ground Shaking, Liquefaction, and Tsunami vector layers.
		{:else if mapState.activeHazardFamily === 'typhoon'}
			PANaHON track proximity grid. Colors are not wind speeds.
		{:else}
			NOAH {mapState.activeHazardFamily === 'flood'
				? 'flood hazard'
				: mapState.activeHazardFamily === 'storm-surge'
					? 'storm-surge'
					: 'landslide hazard'} layers.
		{/if}
		3D elevation uses Mapzen Terrain Tiles.
		{#if criticalFacilitiesEnabled}
			<br />{criticalFacilitiesAttribution}
		{/if}
	</div>
</div>

<style>
	.map-shell {
		position: relative;
		display: flex;
		flex: 1;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		background: #d9e5e4;
		isolation: isolate;
	}

	.map {
		position: absolute;
		inset: 0;
	}

	.boundary-note {
		position: absolute;
		z-index: 2;
	}

	.boundary-note {
		left: 1rem;
		bottom: 1rem;
		max-width: 18rem;
		padding: 0.65rem 0.8rem;
		border: 1px solid rgb(255 255 255 / 55%);
		border-radius: 0.6rem;
		background: var(--bg);
		color: var(--fg);
		font-size: 0.875rem;
		box-shadow: 0 0.5rem 1.5rem rgb(30 56 55 / 12%);
		backdrop-filter: blur(12px);
	}

	@media (max-width: 899px) {
		.map-shell {
			height: 100%;
			min-height: 0;
		}

		.boundary-note {
			display: none;
			left: 0.75rem;
			bottom: 4.5rem;
			max-width: calc(100% - 1.5rem);
		}

		:global(.maplibregl-ctrl-bottom-right) {
			top: 4.5rem;
			right: 0.75rem;
			bottom: auto;
			left: auto;
			max-width: calc(100% - 1.5rem);
		}
	}
</style>
