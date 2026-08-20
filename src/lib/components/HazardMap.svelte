<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { calapanCityBounds } from '$lib/data/calapan-boundary';
	import {
		calapanBarangayLabelPoints,
		loadCalapanBarangays,
		type BarangayProperties
	} from '$lib/data/barangays';
	import { type ReturnPeriod } from '$lib/data/flood';
	import { type StormSurgeAdvisory } from '$lib/data/storm-surge';
	import { type LandslideLayer } from '$lib/data/landslide';
	import { seismicHazards, type SeismicLayer } from '$lib/data/seismic';
	import { emptyTyphoonMapData, type TyphoonMapData } from '$lib/data/typhoon';
	import { criticalFacilitiesAttribution } from '$lib/data/critical-facilities';
	import {
		createDefaultMapShareState,
		type HazardFamily,
		type MapShareState,
		type ViewMode
	} from '$lib/map-state';
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
	import MapControls from './MapControls.svelte';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import 'maplibre-gl/dist/maplibre-gl.css';

	type Props = {
		typhoonMapData?: TyphoonMapData;
		selectedBarangayId?: string | null;
		initialMapState?: MapShareState;
		onSelectArea?: (area: BarangayProperties | null) => void;
		onHazardFamilyChange?: (family: HazardFamily) => void;
		onMapStateChange?: (state: MapShareState) => void;
	};
	let {
		typhoonMapData = emptyTyphoonMapData,
		selectedBarangayId = null,
		initialMapState = createDefaultMapShareState(),
		onSelectArea,
		onHazardFamilyChange,
		onMapStateChange
	}: Props = $props();
	const initialState = untrack(() => initialMapState);
	let syncSelectedBarangay: (id: string | null) => void = () => {};

	let criticalFacilitiesEnabled = $state(false);
	let criticalFacilitiesState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let loadCriticalFacilities: () => void = () => {};
	let setCriticalFacilitiesVisibility: (visible: boolean) => void = () => {};
	let disposeCriticalFacilityLayerManager = () => {};

	function toggleCriticalFacilities() {
		criticalFacilitiesEnabled = !criticalFacilitiesEnabled;
		setCriticalFacilitiesVisibility(criticalFacilitiesEnabled);
		if (
			criticalFacilitiesEnabled &&
			(criticalFacilitiesState === 'idle' || criticalFacilitiesState === 'error')
		) {
			loadCriticalFacilities();
		}
	}

	let mapElement: HTMLDivElement;
	let viewMode = $state<ViewMode>(initialState.viewMode);
	let mapReady = $state(false);
	let activeHazardFamily = $state<HazardFamily>(initialState.activeHazardFamily);
	let loadingHazardFamily = $state<HazardFamily | null>(null);
	let enabledFloodPeriods = $state<ReturnPeriod[]>([...initialState.enabledFloodPeriods]);
	let enabledStormSurgeAdvisories = $state<StormSurgeAdvisory[]>([
		...initialState.enabledStormSurgeAdvisories
	]);
	let enabledLandslideLayers = $state<LandslideLayer[]>([...initialState.enabledLandslideLayers]);
	let enabledSeismicLayers = $state<SeismicLayer[]>([...initialState.enabledSeismicLayers]);
	let hasInitializedSeismicLayers = $state(initialState.activeHazardFamily === 'earthquake');
	let updateMapCamera: (nextMode: ViewMode) => void = () => {};
	let updateHazardVisibility: () => void = () => {};
	let transitionHazardFamily: (nextFamily: HazardFamily) => void = () => {};
	let preloadHazardFamily = $state<(family: HazardFamily) => void>(() => {});
	let disposeBarangayLayerManager = () => {};
	let disposeHazardLayerManager = () => {};

	function reportMapState() {
		onMapStateChange?.({
			viewMode,
			activeHazardFamily,
			selectedBarangayId,
			enabledFloodPeriods: [...enabledFloodPeriods],
			enabledStormSurgeAdvisories: [...enabledStormSurgeAdvisories],
			enabledLandslideLayers: [...enabledLandslideLayers],
			enabledSeismicLayers: [...enabledSeismicLayers]
		});
	}

	function setViewMode(nextMode: ViewMode) {
		viewMode = nextMode;
		updateMapCamera(nextMode);
		reportMapState();
	}

	function setHazardFamily(nextFamily: HazardFamily) {
		if (nextFamily === activeHazardFamily) return;
		if (nextFamily === 'earthquake' && !hasInitializedSeismicLayers) {
			enabledSeismicLayers = seismicHazards.map((layer) => layer.key);
			hasInitializedSeismicLayers = true;
		}
		activeHazardFamily = nextFamily;
		onHazardFamilyChange?.(nextFamily);
		transitionHazardFamily(nextFamily);
		reportMapState();
	}

	function setFloodPeriodEnabled(period: ReturnPeriod, enabled: boolean) {
		enabledFloodPeriods = enabled
			? [...new Set([...enabledFloodPeriods, period])]
			: enabledFloodPeriods.filter((value) => value !== period);
		updateHazardVisibility();
		reportMapState();
	}

	function setStormSurgeAdvisoryEnabled(advisory: StormSurgeAdvisory, enabled: boolean) {
		enabledStormSurgeAdvisories = enabled
			? [...new Set([...enabledStormSurgeAdvisories, advisory])]
			: enabledStormSurgeAdvisories.filter((value) => value !== advisory);
		updateHazardVisibility();
		reportMapState();
	}

	function setLandslideLayerEnabled(layer: LandslideLayer, enabled: boolean) {
		enabledLandslideLayers = enabled
			? [...new Set([...enabledLandslideLayers, layer])]
			: enabledLandslideLayers.filter((value) => value !== layer);
		updateHazardVisibility();
		reportMapState();
	}

	function setSeismicLayerEnabled(layer: SeismicLayer, enabled: boolean) {
		enabledSeismicLayers = enabled
			? [...new Set([...enabledSeismicLayers, layer])]
			: enabledSeismicLayers.filter((value) => value !== layer);
		updateHazardVisibility();
		reportMapState();
	}

	$effect(() => {
		const id = selectedBarangayId;
		if (mapReady) syncSelectedBarangay(id);
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
					getActiveFamily: () => activeHazardFamily,
					getEnabledLayers: () => ({
						enabledFloodPeriods,
						enabledStormSurgeAdvisories,
						enabledLandslideLayers,
						enabledSeismicLayers
					}),
					setLoadingFamily: (family) => (loadingHazardFamily = family)
				});
				hazardLayerManager.addLayers();
				disposeHazardLayerManager = hazardLayerManager.dispose;
				transitionHazardFamily = hazardLayerManager.transition;
				preloadHazardFamily = hazardLayerManager.preload;
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
					setState: (state) => (criticalFacilitiesState = state)
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
				updateMapCamera(viewMode);
				mapReady = true;
				terrainTimer = setTimeout(() => {
					if (disposed) return;
					terrainEnabled = true;
					mapInstance.setLayoutProperty('calapan-terrain-hillshade', 'visibility', 'visible');
					updateMapCamera(viewMode);
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
			map?.remove();
		};
	});
</script>

<div class="map-shell">
	<MapControls
		{viewMode}
		{activeHazardFamily}
		{enabledFloodPeriods}
		{enabledStormSurgeAdvisories}
		{enabledLandslideLayers}
		{enabledSeismicLayers}
		{criticalFacilitiesEnabled}
		{criticalFacilitiesState}
		onViewModeChange={setViewMode}
		onHazardFamilyChange={setHazardFamily}
		onFloodPeriodChange={setFloodPeriodEnabled}
		onStormSurgeAdvisoryChange={setStormSurgeAdvisoryEnabled}
		onLandslideLayerChange={setLandslideLayerEnabled}
		onSeismicLayerChange={setSeismicLayerEnabled}
		onCriticalFacilitiesToggle={toggleCriticalFacilities}
		onPreloadHazardFamily={preloadHazardFamily}
	/>

	<div
		bind:this={mapElement}
		class="map"
		role="region"
		aria-label="Interactive map of Calapan City"
		aria-describedby="map-boundary-note"
	></div>

	{#if !mapReady || loadingHazardFamily}
		<div class="map-status" role="status" aria-live="polite">
			<span class="status-dot"></span>
			{#if !mapReady}
				Loading map
			{:else if loadingHazardFamily === 'flood'}
				Loading flood tiles
			{:else if loadingHazardFamily === 'storm-surge'}
				Loading storm-surge tiles
			{:else if loadingHazardFamily === 'landslide'}
				Loading landslide tiles
			{:else if loadingHazardFamily === 'earthquake'}
				Loading earthquake tiles
			{:else}
				Loading typhoon track
			{/if}
		</div>
	{/if}

	<div id="map-boundary-note" class="boundary-note" role="note">
		{#if activeHazardFamily === 'earthquake'}
			PHIVOLCS Ground Shaking, Liquefaction, and Tsunami vector layers.
		{:else if activeHazardFamily === 'typhoon'}
			PANaHON track proximity grid. Colors are not wind speeds.
		{:else}
			NOAH {activeHazardFamily === 'flood'
				? 'flood hazard'
				: activeHazardFamily === 'storm-surge'
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

	.map-status,
	.boundary-note {
		position: absolute;
		z-index: 2;
	}

	.map-status {
		top: 4.5rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 0.75rem;
		border-radius: 999px;
		background: rgb(250 248 242 / 90%);
		color: #476563;
		font-size: 0.72rem;
		font-weight: 700;
		box-shadow: 0 0.5rem 1.5rem rgb(30 56 55 / 12%);
		backdrop-filter: blur(12px);
	}

	.status-dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: #d18f38;
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

	@media (max-width: 640px) {
		.map-shell {
			height: 100%;
			min-height: 0;
		}

		.map-status {
			top: auto;
			right: 0.75rem;
			bottom: 0.75rem;
		}

		.boundary-note {
			left: 0.75rem;
			bottom: 4.5rem;
			max-width: calc(100% - 1.5rem);
		}
	}
</style>
