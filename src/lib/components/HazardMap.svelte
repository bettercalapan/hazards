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
	import {
		criticalFacilityCategories,
		criticalFacilitiesAttribution,
		criticalFacilityColors
	} from '$lib/data/critical-facilities';
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
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const initialize = async () => {
			const [{ setWorkerUrl, Map: MapLibreMap, Popup }, calapanBarangays] = await Promise.all([
				import('maplibre-gl'),
				loadCalapanBarangays()
			]);

			if (disposed) return;
			setWorkerUrl(workerUrl);
			const cityBounds: MapBounds = [
				[calapanCityBounds[0], calapanCityBounds[1]],
				[calapanCityBounds[2], calapanCityBounds[3]]
			];

			const mapInstance = new MapLibreMap({
				container: mapElement,
				style: await loadOpenFreeMapStyle(),
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
				setMapCamera(mapInstance, terrainReady, nextMode);
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
		onViewModeChange={setViewMode}
		onHazardFamilyChange={setHazardFamily}
		onFloodPeriodChange={setFloodPeriodEnabled}
		onStormSurgeAdvisoryChange={setStormSurgeAdvisoryEnabled}
		onLandslideLayerChange={setLandslideLayerEnabled}
		onSeismicLayerChange={setSeismicLayerEnabled}
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
	{:else}
		<button
			class="facility-toggle"
			class:active={criticalFacilitiesEnabled}
			class:error={criticalFacilitiesState === 'error'}
			aria-pressed={criticalFacilitiesEnabled}
			aria-busy={criticalFacilitiesState === 'loading'}
			aria-live="polite"
			type="button"
			onclick={toggleCriticalFacilities}
		>
			<span class="facility-toggle-dot"></span>
			<span>
				{criticalFacilitiesState === 'loading'
					? 'Loading facilities'
					: criticalFacilitiesState === 'error'
						? 'Facilities unavailable'
						: 'Critical facilities'}
			</span>
		</button>
	{/if}

	{#if criticalFacilitiesEnabled}
		<div class="facility-legend" role="group" aria-label="Critical facility colors">
			{#each criticalFacilityCategories as facility (facility.category)}
				<div>
					<span
						class="facility-legend-swatch"
						style={`background: ${criticalFacilityColors[facility.category]}`}
					></span>
					{facility.label}
				</div>
			{/each}
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
	.facility-toggle,
	.facility-legend,
	.boundary-note {
		position: absolute;
		z-index: 2;
	}

	.map-status {
		top: 1rem;
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

	.facility-toggle {
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		border: 1px solid rgb(46 157 104 / 35%);
		padding: 0.55rem 0.75rem;
		border-radius: 999px;
		background: rgb(250 248 242 / 92%);
		color: #476563;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		box-shadow: 0 0.5rem 1.5rem rgb(30 56 55 / 12%);
		backdrop-filter: blur(12px);
		cursor: pointer;
	}

	.facility-toggle.active {
		background: #e7f6ed;
		color: #145a3c;
	}

	.facility-toggle.error {
		border-color: rgb(190 77 77 / 35%);
		color: #9a3d3d;
	}

	.facility-toggle-dot {
		width: 0.55rem;
		height: 0.55rem;
		border: 2px solid #249b61;
		border-radius: 50%;
		background: #35c978;
		box-shadow: 0 0 0 3px rgb(53 201 120 / 18%);
	}

	.facility-legend {
		top: 3.5rem;
		right: 1rem;
		display: grid;
		gap: 0.35rem;
		padding: 0.55rem 0.7rem;
		border: 1px solid rgb(255 255 255 / 65%);
		border-radius: 0.65rem;
		background: rgb(250 248 242 / 92%);
		color: #476563;
		font-size: 0.68rem;
		font-weight: 700;
		box-shadow: 0 0.5rem 1.5rem rgb(30 56 55 / 12%);
		backdrop-filter: blur(12px);
	}

	.facility-legend div {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.facility-legend-swatch {
		width: 0.6rem;
		height: 0.6rem;
		border: 1px solid rgb(255 255 255 / 90%);
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgb(23 62 59 / 18%);
	}

	.boundary-note {
		left: 1rem;
		bottom: 1rem;
		max-width: 18rem;
		padding: 0.65rem 0.8rem;
		border: 1px solid rgb(255 255 255 / 55%);
		border-radius: 0.6rem;
		background: rgb(250 248 242 / 88%);
		color: #476563;
		font-size: 0.72rem;
		line-height: 1.4;
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

		.facility-toggle {
			top: auto;
			right: 0.75rem;
			bottom: 0.75rem;
		}

		.facility-legend {
			top: auto;
			right: 0.75rem;
			bottom: 3.7rem;
			max-width: calc(100% - 1.5rem);
		}

		.boundary-note {
			left: 0.75rem;
			bottom: 4.5rem;
			max-width: calc(100% - 1.5rem);
		}
	}
</style>
