<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		calapanCityBoundary,
		calapanCityBounds,
		calapanCityMask
	} from '$lib/data/calapan-boundary';
	import {
		calapanBarangayLabelPoints,
		loadCalapanBarangays,
		type BarangayCollection,
		type BarangayProperties
	} from '$lib/data/barangays';
	import { floodHazardPeriods, type ReturnPeriod } from '$lib/data/flood';
	import { stormSurgeAdvisories, type StormSurgeAdvisory } from '$lib/data/storm-surge';
	import { landslideHazards, type LandslideLayer } from '$lib/data/landslide';
	import { seismicHazards, type SeismicLayer } from '$lib/data/seismic';
	import { calapanContourDataUrl, terrainAttribution } from '$lib/data/terrain';
	import { emptyTyphoonMapData, type TyphoonMapData } from '$lib/data/typhoon';
	import {
		criticalFacilityCategories,
		criticalFacilitiesAttribution,
		criticalFacilityColors,
		emptyCriticalFacilities,
		type CriticalFacilityCollection
	} from '$lib/data/critical-facilities';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import 'maplibre-gl/dist/maplibre-gl.css';

	type ViewMode = '3d' | '2d';
	type HazardFamily = 'flood' | 'storm-surge' | 'landslide' | 'earthquake' | 'typhoon';
	type Props = {
		typhoonMapData?: TyphoonMapData;
		selectedBarangayId?: string | null;
		onSelectArea?: (area: BarangayProperties | null) => void;
		onHazardFamilyChange?: (family: HazardFamily) => void;
	};
	type MapBounds = [[number, number], [number, number]];
	type RemoteStyleLayer = {
		id?: string;
		type?: string;
		filter?: unknown;
		layout?: Record<string, unknown>;
	};
	type RemoteStyle = {
		[key: string]: unknown;
		layers?: RemoteStyleLayer[];
	};

	const openFreeMapStyleUrl = 'https://tiles.openfreemap.org/styles/liberty';

	function filterUsesProperty(filter: unknown, property: string): boolean {
		if (!Array.isArray(filter)) return false;
		return filter.some(
			(value) => value === property || (Array.isArray(value) && filterUsesProperty(value, property))
		);
	}

	function coalesceRefLength(filter: unknown): unknown {
		if (!Array.isArray(filter)) return filter;
		if (
			filter[0] === '<=' &&
			Array.isArray(filter[1]) &&
			filter[1][0] === 'get' &&
			filter[1][1] === 'ref_length'
		) {
			return ['<=', ['coalesce', ['get', 'ref_length'], 0], filter[2]];
		}
		return filter.map((value) => coalesceRefLength(value));
	}

	function usesOpenSansFontStack(font: unknown): boolean {
		if (typeof font === 'string') return font.includes('Open Sans');
		return Array.isArray(font) && font.some((value) => usesOpenSansFontStack(value));
	}

	function transformOpenFreeMapRequest(url: string, resourceType?: string) {
		if (resourceType !== 'Glyphs' || !url.includes('/fonts/')) return { url };

		try {
			const decodedUrl = decodeURIComponent(url);
			const brokenFontPrefix = '/fonts/Open Sans Regular,Arial Unicode MS Regular/';
			const fontStart = decodedUrl.indexOf(brokenFontPrefix);
			if (fontStart < 0) return { url };

			const rangeStart = fontStart + brokenFontPrefix.length;
			const range = decodedUrl.slice(rangeStart);
			return {
				url: encodeURI(`${decodedUrl.slice(0, fontStart)}/fonts/Noto Sans Regular/${range}`)
			};
		} catch {
			return { url };
		}
	}

	function sanitizeOpenFreeMapStyle(style: RemoteStyle): import('maplibre-gl').StyleSpecification {
		return {
			...style,
			layers: style.layers?.map((layer) => {
				const nextLayer = { ...layer };
				const textFont = nextLayer.layout?.['text-font'];
				if (nextLayer.layout && usesOpenSansFontStack(textFont)) {
					nextLayer.layout = { ...nextLayer.layout, 'text-font': ['Noto Sans Regular'] };
				}
				if (filterUsesProperty(nextLayer.filter, 'ref_length')) {
					const filter = coalesceRefLength(nextLayer.filter);
					nextLayer.filter =
						Array.isArray(filter) && filter[0] === 'all'
							? ['all', ['has', 'ref_length'], ...filter.slice(1)]
							: ['all', ['has', 'ref_length'], filter];
				}
				return nextLayer;
			})
		} as unknown as import('maplibre-gl').StyleSpecification;
	}

	async function loadOpenFreeMapStyle(): Promise<
		string | import('maplibre-gl').StyleSpecification
	> {
		try {
			const response = await fetch(openFreeMapStyleUrl);
			if (!response.ok) throw new Error(`Map style returned ${response.status}`);
			return sanitizeOpenFreeMapStyle((await response.json()) as RemoteStyle);
		} catch {
			return openFreeMapStyleUrl;
		}
	}

	let {
		typhoonMapData = emptyTyphoonMapData,
		selectedBarangayId = null,
		onSelectArea,
		onHazardFamilyChange
	}: Props = $props();
	let syncSelectedBarangay: (id: string | null) => void = () => {};

	let criticalFacilitiesEnabled = $state(false);
	let criticalFacilitiesState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let loadCriticalFacilities: () => void = () => {};
	let setCriticalFacilitiesVisibility: (visible: boolean) => void = () => {};
	const criticalFacilityColorExpression = [
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

	function getBarangayProperties(object: unknown): BarangayProperties | null {
		if (!object || typeof object !== 'object') return null;
		const properties = object as Partial<BarangayProperties>;

		if (
			typeof properties.id !== 'string' ||
			typeof properties.name !== 'string' ||
			typeof properties.sourceName !== 'string'
		) {
			return null;
		}

		return properties as BarangayProperties;
	}

	function getBarangayBounds(barangays: BarangayCollection, id: string): MapBounds | null {
		const feature = barangays.features.find((item) => item.properties.id === id);
		if (!feature) return null;

		let minLongitude = Infinity;
		let minLatitude = Infinity;
		let maxLongitude = -Infinity;
		let maxLatitude = -Infinity;

		const visit = (value: unknown): void => {
			if (!Array.isArray(value)) return;
			if (typeof value[0] === 'number' && typeof value[1] === 'number') {
				minLongitude = Math.min(minLongitude, value[0]);
				minLatitude = Math.min(minLatitude, value[1]);
				maxLongitude = Math.max(maxLongitude, value[0]);
				maxLatitude = Math.max(maxLatitude, value[1]);
				return;
			}
			for (const child of value) visit(child);
		};

		visit(feature.geometry.coordinates);
		if (!Number.isFinite(minLongitude) || !Number.isFinite(minLatitude)) return null;
		return [
			[minLongitude, minLatitude],
			[maxLongitude, maxLatitude]
		];
	}

	function escapeHtml(value: string): string {
		return value.replace(
			/[&<>'"]/g,
			(character) =>
				({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
				character
		);
	}

	function getPanBounds(map: import('maplibre-gl').Map): MapBounds {
		const visibleBounds = map.getBounds();
		const horizontalPanPixels = 2;
		const center = map.getCenter();
		const centerPoint = map.project(center);
		const leftPoint = map.unproject([centerPoint.x - horizontalPanPixels, centerPoint.y]);
		const rightPoint = map.unproject([centerPoint.x + horizontalPanPixels, centerPoint.y]);

		return [
			[visibleBounds.getWest() - (center.lng - leftPoint.lng), visibleBounds.getSouth()],
			[visibleBounds.getEast() + (rightPoint.lng - center.lng), visibleBounds.getNorth()]
		];
	}

	function restrictSymbolLayers(map: import('maplibre-gl').Map) {
		const withinBoundary = [
			'within',
			calapanCityBoundary.geometry
		] as unknown as import('maplibre-gl').FilterSpecification;

		for (const layer of map.getStyle().layers ?? []) {
			if (layer.id === 'calapan-barangay-labels' || layer.id === 'calapan-contour-labels') continue;
			if (layer.type !== 'symbol') continue;

			const filter = layer.filter
				? ([
						'all',
						layer.filter,
						withinBoundary
					] as unknown as import('maplibre-gl').FilterSpecification)
				: withinBoundary;

			map.setFilter(layer.id, filter);
		}
	}

	function dimBaseMapTransportLayers(
		map: import('maplibre-gl').Map,
		barangays: BarangayCollection
	) {
		const detailTextOpacity = [
			'interpolate',
			['linear'],
			['zoom'],
			13,
			0,
			15,
			1
		] as unknown as import('maplibre-gl').PropertyValueSpecification<number>;
		const detailHaloWidth = [
			'interpolate',
			['linear'],
			['zoom'],
			13,
			0,
			15,
			1
		] as unknown as import('maplibre-gl').PropertyValueSpecification<number>;
		const barangayNames = barangays.features.map((feature) => feature.properties.name);
		const excludeBarangayNames = [
			'!',
			[
				'any',
				['match', ['get', 'name'], barangayNames, true, false],
				['match', ['get', 'name:latin'], barangayNames, true, false]
			]
		] as unknown as import('maplibre-gl').FilterSpecification;
		const roadOpacityForClass = (motorway: number, secondary: number, other: number) => [
			'match',
			['get', 'class'],
			['motorway', 'trunk', 'primary'],
			motorway,
			['secondary', 'tertiary'],
			secondary,
			other
		];
		const roadLineOpacity = [
			'interpolate',
			['linear'],
			['zoom'],
			12.5,
			0,
			13,
			roadOpacityForClass(0.12, 0.08, 0.04),
			14,
			roadOpacityForClass(0.28, 0.18, 0.1)
		] as unknown as import('maplibre-gl').PropertyValueSpecification<number>;

		for (const layer of map.getStyle().layers ?? []) {
			const styleLayer = layer as {
				source?: string;
				sourceLayer?: string;
				'source-layer'?: string;
				maxzoom?: number;
			};
			const source = styleLayer.source;
			const sourceLayer = styleLayer['source-layer'] ?? styleLayer.sourceLayer;
			if (source !== 'openmaptiles') continue;

			if (sourceLayer === 'transportation') {
				if (layer.type === 'line') {
					const maxzoom = styleLayer.maxzoom ?? 24;
					if (maxzoom > 13) {
						map.setLayerZoomRange(layer.id, 13, maxzoom);
					} else {
						map.setLayoutProperty(layer.id, 'visibility', 'none');
					}
					map.setPaintProperty(layer.id, 'line-opacity', roadLineOpacity);
					map.setPaintProperty(layer.id, 'line-color', '#d9c8b7');
				} else if (layer.type === 'fill' || layer.type === 'symbol') {
					map.setLayoutProperty(layer.id, 'visibility', 'none');
				}
			}

			if (sourceLayer === 'transportation_name' && layer.type === 'symbol') {
				map.setLayoutProperty(layer.id, 'visibility', 'visible');
				map.setPaintProperty(layer.id, 'icon-opacity', 0);
			}

			if (layer.type === 'symbol') {
				map.setPaintProperty(layer.id, 'text-opacity', detailTextOpacity);
				map.setPaintProperty(layer.id, 'text-halo-width', detailHaloWidth);
			}

			if (
				sourceLayer === 'place' &&
				(layer.id === 'label_city' || layer.id === 'label_city_capital') &&
				layer.type === 'symbol'
			) {
				map.setLayoutProperty(layer.id, 'visibility', 'none');
			}

			if (sourceLayer === 'place' && layer.type === 'symbol') {
				const existingFilter = layer.filter;
				map.setFilter(
					layer.id,
					existingFilter
						? ([
								'all',
								existingFilter,
								excludeBarangayNames
							] as unknown as import('maplibre-gl').FilterSpecification)
						: excludeBarangayNames
				);
			}
		}
	}

	let mapElement: HTMLDivElement;
	let viewMode = $state<ViewMode>('3d');
	let mapReady = $state(false);
	let activeHazardFamily = $state<HazardFamily>('flood');
	let loadingHazardFamily = $state<HazardFamily | null>(null);
	let enabledFloodPeriods = $state<ReturnPeriod[]>([5, 25, 100]);
	let enabledStormSurgeAdvisories = $state<StormSurgeAdvisory[]>([1, 2, 3, 4]);
	let enabledLandslideLayers = $state<LandslideLayer[]>(['main']);
	let enabledSeismicLayers = $state<SeismicLayer[]>(['ground-shaking']);
	let hasInitializedSeismicLayers = $state(false);
	let updateMapCamera: (nextMode: ViewMode) => void = () => {};
	let updateHazardVisibility: () => void = () => {};
	let transitionHazardFamily: (nextFamily: HazardFamily) => void = () => {};
	let preloadHazardFamily: (family: HazardFamily) => void = () => {};

	function setViewMode(nextMode: ViewMode) {
		viewMode = nextMode;
		updateMapCamera(nextMode);
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
	}

	function hazardFamilyLabel(family: HazardFamily): string {
		if (family === 'storm-surge') return 'Storm surge';
		return family.charAt(0).toUpperCase() + family.slice(1);
	}

	function setFloodPeriodEnabled(period: ReturnPeriod, enabled: boolean) {
		enabledFloodPeriods = enabled
			? [...new Set([...enabledFloodPeriods, period])]
			: enabledFloodPeriods.filter((value) => value !== period);
		updateHazardVisibility();
	}

	function setStormSurgeAdvisoryEnabled(advisory: StormSurgeAdvisory, enabled: boolean) {
		enabledStormSurgeAdvisories = enabled
			? [...new Set([...enabledStormSurgeAdvisories, advisory])]
			: enabledStormSurgeAdvisories.filter((value) => value !== advisory);
		updateHazardVisibility();
	}

	function setLandslideLayerEnabled(layer: LandslideLayer, enabled: boolean) {
		enabledLandslideLayers = enabled
			? [...new Set([...enabledLandslideLayers, layer])]
			: enabledLandslideLayers.filter((value) => value !== layer);
		updateHazardVisibility();
	}

	function setSeismicLayerEnabled(layer: SeismicLayer, enabled: boolean) {
		enabledSeismicLayers = enabled
			? [...new Set([...enabledSeismicLayers, layer])]
			: enabledSeismicLayers.filter((value) => value !== layer);
		updateHazardVisibility();
	}

	$effect(() => {
		const id = selectedBarangayId;
		if (mapReady) syncSelectedBarangay(id);
	});

	onMount(() => {
		let disposed = false;
		let map: import('maplibre-gl').Map | undefined;
		let selectedMapBarangayId: string | null = null;
		let terrainReady = false;
		let facilityPulseFrame: number | null = null;
		let facilityPopup: import('maplibre-gl').Popup | null = null;
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

			const clearSelection = () => {
				if (selectedMapBarangayId) {
					mapInstance.setFeatureState(
						{ source: 'calapan-barangays', id: selectedMapBarangayId },
						{ selected: false }
					);
				}
				if (mapInstance.getLayer('calapan-barangay-dim')) {
					mapInstance.setPaintProperty('calapan-barangay-dim', 'fill-opacity', 0);
				}
				selectedMapBarangayId = null;
				onSelectArea?.(null);
			};

			const selectBarangay = (properties: BarangayProperties) => {
				if (selectedMapBarangayId === properties.id) {
					clearSelection();
					return;
				}
				if (selectedMapBarangayId && selectedMapBarangayId !== properties.id) {
					mapInstance.setFeatureState(
						{ source: 'calapan-barangays', id: selectedMapBarangayId },
						{ selected: false }
					);
				}
				selectedMapBarangayId = properties.id;
				mapInstance.setFeatureState(
					{ source: 'calapan-barangays', id: properties.id },
					{ selected: true }
				);
				mapInstance.setPaintProperty('calapan-barangay-dim', 'fill-opacity', [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					0,
					0.3
				] as unknown as import('maplibre-gl').PropertyValueSpecification<number>);
				onSelectArea?.(properties);
			};

			syncSelectedBarangay = (id) => {
				if (!id) {
					if (selectedMapBarangayId) clearSelection();
					return;
				}
				if (selectedMapBarangayId === id) return;

				const feature = calapanBarangays.features.find((item) => item.properties.id === id);
				if (!feature) return;
				selectBarangay(feature.properties);
				const bounds = getBarangayBounds(calapanBarangays, id);
				if (bounds) {
					mapInstance.fitBounds(bounds, { padding: 48, maxZoom: 13.5, duration: 650 });
				}
			};

			updateMapCamera = (nextMode) => {
				const is3d = nextMode === '3d';
				if (terrainReady) {
					mapInstance.setTerrain(is3d ? { source: 'calapan-terrain', exaggeration: 1.15 } : null);
				}

				if (is3d) {
					mapInstance.dragRotate.enable();
					mapInstance.touchZoomRotate.enableRotation();
				} else {
					mapInstance.dragRotate.disable();
					mapInstance.touchZoomRotate.disableRotation();
				}

				mapInstance.easeTo({
					pitch: is3d ? 45 : 0,
					bearing: is3d ? -12 : 0,
					duration: 500
				});
			};

			mapInstance.once('load', () => {
				if (disposed) return;
				dimBaseMapTransportLayers(mapInstance, calapanBarangays);
				const firstSymbolLayerId = mapInstance
					.getStyle()
					.layers?.find((layer) => layer.type === 'symbol')?.id;
				const terrainSource: import('maplibre-gl').RasterDEMSourceSpecification = {
					type: 'raster-dem',
					tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
					tileSize: 256,
					maxzoom: 15,
					encoding: 'terrarium',
					attribution: terrainAttribution
				};
				mapInstance.addSource('calapan-terrain', terrainSource);
				mapInstance.addSource('calapan-terrain-hillshade', terrainSource);
				mapInstance.addLayer(
					{
						id: 'calapan-terrain-hillshade',
						type: 'hillshade',
						source: 'calapan-terrain-hillshade',
						paint: {
							'hillshade-exaggeration': 0.18,
							'hillshade-shadow-color': '#756c5f',
							'hillshade-highlight-color': '#fffaf0'
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addSource('calapan-contours', {
					type: 'geojson',
					data: calapanContourDataUrl
				});
				mapInstance.addLayer(
					{
						id: 'calapan-contours-minor',
						type: 'line',
						source: 'calapan-contours',
						filter: ['==', ['get', 'major'], false],
						paint: {
							'line-color': '#8d8878',
							'line-width': 0.65,
							'line-opacity': 0.35
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addLayer(
					{
						id: 'calapan-contours-major',
						type: 'line',
						source: 'calapan-contours',
						filter: ['==', ['get', 'major'], true],
						paint: {
							'line-color': '#756c5f',
							'line-width': 1.1,
							'line-opacity': 0.58
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addLayer(
					{
						id: 'calapan-contour-labels',
						type: 'symbol',
						source: 'calapan-contours',
						minzoom: 13,
						filter: ['==', ['get', 'major'], true],
						layout: {
							'symbol-placement': 'line',
							'symbol-spacing': 300,
							'text-field': ['concat', ['to-string', ['get', 'elevation']], ' m'],
							'text-size': 10,
							'text-allow-overlap': false
						},
						paint: {
							'text-color': '#756c5f',
							'text-halo-color': '#f7f2e8',
							'text-halo-width': 1.2
						}
					},
					firstSymbolLayerId
				);
				terrainReady = true;

				mapInstance.addSource('calapan-city-mask', {
					type: 'geojson',
					data: calapanCityMask
				});
				mapInstance.addLayer(
					{
						id: 'calapan-city-mask',
						type: 'fill',
						source: 'calapan-city-mask',
						paint: {
							'fill-color': '#f7f2e8',
							'fill-opacity': 0.5
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addSource('calapan-city-boundary', {
					type: 'geojson',
					data: calapanCityBoundary
				});
				mapInstance.addLayer(
					{
						id: 'calapan-city-boundary',
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
				const addHazardLayers = (
					family: HazardFamily,
					layers: readonly {
						key: string | number;
						tilePath: string;
						colors?: { readonly Low: string; readonly Medium: string; readonly High: string };
						classes?: readonly { readonly color: string }[];
					}[],
					sourceLayer: string
				) => {
					for (const layer of [...layers].reverse()) {
						const sourceId =
							family === 'flood'
								? `calapan-flood-hazard-${layer.key}`
								: family === 'storm-surge'
									? `calapan-storm-surge-advisory-${layer.key}`
									: family === 'landslide'
										? `calapan-landslide-hazard-${layer.key}`
										: `calapan-${layer.key}`;
						const classColors = layer.classes?.map((item) => item.color) ?? [
							layer.colors?.Low ?? '#000000',
							layer.colors?.Medium ?? '#000000',
							layer.colors?.High ?? '#000000'
						];
						const fillColor = [
							'match',
							['get', 'Var'],
							...classColors.flatMap((color, index) => [index + 1, color]),
							'#000000'
						] as unknown as import('maplibre-gl').PropertyValueSpecification<string>;
						mapInstance.addSource(sourceId, {
							type: 'vector',
							tiles: [layer.tilePath],
							minzoom: 10,
							maxzoom: 15,
							bounds: [
								121.10036758600006, 13.296270203000063, 121.28920787700008, 13.467073836000054
							]
						});
						mapInstance.addLayer(
							{
								id: sourceId,
								type: 'fill',
								source: sourceId,
								'source-layer': sourceLayer,
								layout: { visibility: 'none' },
								paint: {
									'fill-color': fillColor,
									'fill-opacity': 0.85
								}
							},
							firstSymbolLayerId
						);
					}
				};
				addHazardLayers('flood', floodHazardPeriods, 'flood');
				addHazardLayers('storm-surge', stormSurgeAdvisories, 'storm-surge');
				addHazardLayers('landslide', landslideHazards, 'landslide');
				for (const layer of seismicHazards) {
					addHazardLayers('earthquake', [layer], layer.sourceLayer);
				}
				const typhoonLayerIds = [
					'calapan-typhoon-grid',
					'calapan-typhoon-track-observed',
					'calapan-typhoon-track-forecast',
					'calapan-typhoon-points'
				];
				mapInstance.addSource('calapan-typhoon-grid', {
					type: 'geojson',
					data: typhoonMapData.grid
				});
				mapInstance.addLayer(
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
				mapInstance.addSource('calapan-typhoon-track', {
					type: 'geojson',
					data: typhoonMapData.tracks
				});
				mapInstance.addLayer(
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
				mapInstance.addLayer(
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
				mapInstance.addSource('calapan-typhoon-points', {
					type: 'geojson',
					data: typhoonMapData.points
				});
				mapInstance.addLayer(
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

				const hazardFamilies: HazardFamily[] = [
					'flood',
					'storm-surge',
					'landslide',
					'earthquake',
					'typhoon'
				];
				const layersForFamily = (family: HazardFamily) => {
					if (family === 'flood') return floodHazardPeriods;
					if (family === 'storm-surge') return stormSurgeAdvisories;
					if (family === 'landslide') return landslideHazards;
					if (family === 'typhoon') return [];
					return seismicHazards;
				};
				const layerIdFor = (family: HazardFamily, key: string | number) => {
					if (family === 'flood') return `calapan-flood-hazard-${key}`;
					if (family === 'storm-surge') return `calapan-storm-surge-advisory-${key}`;
					if (family === 'landslide') return `calapan-landslide-hazard-${key}`;
					return `calapan-${key}`;
				};
				const layerEnabled = (family: HazardFamily, key: string | number) => {
					if (family === 'flood') return enabledFloodPeriods.includes(key as ReturnPeriod);
					if (family === 'storm-surge') {
						return enabledStormSurgeAdvisories.includes(key as StormSurgeAdvisory);
					}
					if (family === 'landslide') return enabledLandslideLayers.includes(key as LandslideLayer);
					if (family === 'typhoon') return true;
					return enabledSeismicLayers.includes(key as SeismicLayer);
				};
				const setFamilyVisibility = (family: HazardFamily, visible: boolean, opacity = 0.85) => {
					if (family === 'typhoon') {
						for (const layerId of typhoonLayerIds) {
							if (!mapInstance.getLayer(layerId)) continue;
							mapInstance.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
							if (layerId === 'calapan-typhoon-grid') {
								mapInstance.setPaintProperty(
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
					for (const layer of layersForFamily(family)) {
						const layerId = layerIdFor(family, layer.key);
						const shouldShow = visible && layerEnabled(family, layer.key);
						if (!mapInstance.getLayer(layerId)) continue;
						mapInstance.setLayoutProperty(layerId, 'visibility', shouldShow ? 'visible' : 'none');
						mapInstance.setPaintProperty(layerId, 'fill-opacity', shouldShow ? opacity : 0.85);
					}
				};
				const sourceIdsForFamily = (family: HazardFamily) =>
					layersForFamily(family)
						.filter((layer) => layerEnabled(family, layer.key))
						.map((layer) => layerIdFor(family, layer.key));
				const familyLoads = new SvelteMap<HazardFamily, Promise<void>>();
				const loadFamilyTiles = (family: HazardFamily) => {
					const existingLoad = familyLoads.get(family);
					if (existingLoad) return existingLoad;

					const sourceIds = sourceIdsForFamily(family);
					if (sourceIds.length === 0) return Promise.resolve();

					const load = new Promise<void>((resolve) => {
						let timeout: ReturnType<typeof setTimeout>;
						let settled = false;
						const finish = () => {
							if (settled) return;
							settled = true;
							clearTimeout(timeout);
							mapInstance.off('sourcedata', onSourceData);
							mapInstance.off('idle', onIdle);
							resolve();
						};
						const check = () => {
							if (sourceIds.every((sourceId) => mapInstance.isSourceLoaded(sourceId))) finish();
						};
						const onSourceData = () => check();
						const onIdle = () => check();

						mapInstance.on('sourcedata', onSourceData);
						mapInstance.on('idle', onIdle);
						timeout = setTimeout(finish, 10000);
						check();
					});

					familyLoads.set(family, load);
					void load.finally(() => {
						if (familyLoads.get(family) === load) familyLoads.delete(family);
					});
					return load;
				};
				let renderedHazardFamily: HazardFamily = activeHazardFamily;
				let transitionSequence = 0;
				transitionHazardFamily = (nextFamily) => {
					const previousFamily = renderedHazardFamily;
					if (nextFamily === previousFamily) {
						loadingHazardFamily = null;
						updateHazardVisibility();
						return;
					}

					const sequence = ++transitionSequence;
					loadingHazardFamily = nextFamily;
					for (const family of hazardFamilies) {
						if (family !== previousFamily && family !== nextFamily) {
							setFamilyVisibility(family, false);
						}
					}
					setFamilyVisibility(nextFamily, true, 0);

					void loadFamilyTiles(nextFamily).then(() => {
						if (sequence !== transitionSequence) return;
						setFamilyVisibility(previousFamily, false);
						setFamilyVisibility(nextFamily, true);
						for (const family of hazardFamilies) {
							if (family !== nextFamily) setFamilyVisibility(family, false);
						}
						renderedHazardFamily = nextFamily;
						loadingHazardFamily = null;
					});
				};
				preloadHazardFamily = (family) => {
					if (family === renderedHazardFamily || family === activeHazardFamily) return;
					setFamilyVisibility(family, true, 0);
					void loadFamilyTiles(family).then(() => {
						if (renderedHazardFamily !== family && activeHazardFamily !== family) {
							setFamilyVisibility(family, false);
						}
					});
				};
				updateHazardVisibility = () => {
					for (const family of hazardFamilies) {
						setFamilyVisibility(
							family,
							family === renderedHazardFamily || family === loadingHazardFamily,
							family === loadingHazardFamily ? 0 : 0.85
						);
					}
				};
				updateHazardVisibility();
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
				const criticalFacilityLayerIds = [
					'critical-facilities-clusters',
					'critical-facilities-cluster-count',
					'critical-facilities-pulse',
					'critical-facilities-points',
					'critical-facilities-labels'
				];
				mapInstance.addSource('calapan-critical-facilities', {
					type: 'geojson',
					data: emptyCriticalFacilities,
					cluster: true,
					clusterMaxZoom: 12,
					clusterMinPoints: 3,
					clusterRadius: 48
				});
				mapInstance.addLayer(
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
				mapInstance.addLayer(
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
				mapInstance.addLayer(
					{
						id: 'critical-facilities-pulse',
						type: 'circle',
						source: 'calapan-critical-facilities',
						filter: ['!', ['has', 'point_count']],
						layout: { visibility: 'none' },
						paint: {
							'circle-radius': 9,
							'circle-color': criticalFacilityColorExpression,
							'circle-opacity': 0.22,
							'circle-blur': 0.8
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addLayer(
					{
						id: 'critical-facilities-points',
						type: 'circle',
						source: 'calapan-critical-facilities',
						filter: ['!', ['has', 'point_count']],
						layout: { visibility: 'none' },
						paint: {
							'circle-radius': 5,
							'circle-color': criticalFacilityColorExpression,
							'circle-opacity': 1,
							'circle-stroke-color': '#f7fff9',
							'circle-stroke-width': 1.5
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addLayer(
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
							'text-color': criticalFacilityColorExpression,
							'text-halo-color': '#f7fff9',
							'text-halo-width': 1.25
						}
					},
					firstSymbolLayerId
				);

				const stopFacilityPulse = () => {
					if (facilityPulseFrame !== null) cancelAnimationFrame(facilityPulseFrame);
					facilityPulseFrame = null;
				};
				const startFacilityPulse = () => {
					if (reducedMotion || facilityPulseFrame !== null) return;
					const animate = (time: number) => {
						if (!criticalFacilitiesEnabled || !mapInstance.getLayer('critical-facilities-pulse')) {
							stopFacilityPulse();
							return;
						}
						const wave = (Math.sin(time / 700) + 1) / 2;
						mapInstance.setPaintProperty(
							'critical-facilities-pulse',
							'circle-radius',
							8 + wave * 8
						);
						mapInstance.setPaintProperty(
							'critical-facilities-pulse',
							'circle-opacity',
							0.3 - wave * 0.18
						);
						facilityPulseFrame = requestAnimationFrame(animate);
					};
					facilityPulseFrame = requestAnimationFrame(animate);
				};
				setCriticalFacilitiesVisibility = (visible) => {
					for (const layerId of criticalFacilityLayerIds) {
						if (mapInstance.getLayer(layerId)) {
							mapInstance.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
						}
					}
					if (visible) startFacilityPulse();
					else stopFacilityPulse();
				};

				let facilityRequest: Promise<void> | null = null;
				loadCriticalFacilities = () => {
					if (facilityRequest) return;
					criticalFacilitiesState = 'loading';
					facilityRequest = fetch('/critical-facilities.json')
						.then(async (response) => {
							if (!response.ok) throw new Error(`Critical facilities returned ${response.status}`);
							const data = (await response.json()) as CriticalFacilityCollection;
							const source = mapInstance.getSource('calapan-critical-facilities') as
								import('maplibre-gl').GeoJSONSource | undefined;
							if (!source) throw new Error('Critical facility map source is unavailable');
							source.setData(data);
							criticalFacilitiesState = 'ready';
						})
						.catch(() => {
							criticalFacilitiesState = 'error';
						})
						.finally(() => {
							facilityRequest = null;
						});
				};

				mapInstance.addSource('calapan-barangays', {
					type: 'geojson',
					data: calapanBarangays,
					promoteId: 'id'
				});
				mapInstance.addSource('calapan-barangay-labels', {
					type: 'geojson',
					data: calapanBarangayLabelPoints,
					promoteId: 'id'
				});
				mapInstance.addLayer(
					{
						id: 'calapan-barangay-dim',
						type: 'fill',
						source: 'calapan-barangays',
						paint: {
							'fill-color': '#000000',
							'fill-opacity': 0
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addLayer(
					{
						id: 'calapan-barangay-fill',
						type: 'fill',
						source: 'calapan-barangays',
						paint: {
							'fill-color': '#ff5500',
							'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0, 0]
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addLayer(
					{
						id: 'calapan-barangay-boundaries',
						type: 'line',
						source: 'calapan-barangays',
						paint: {
							'line-color': [
								'case',
								['boolean', ['feature-state', 'selected'], false],
								'#ff5500',
								'#6f8881'
							],
							'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 1],
							'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0.8]
						}
					},
					firstSymbolLayerId
				);
				mapInstance.addLayer({
					id: 'calapan-barangay-labels',
					type: 'symbol',
					source: 'calapan-barangay-labels',
					minzoom: 2,
					layout: {
						'symbol-placement': 'point',
						'text-field': ['get', 'name'],
						'text-size': 11,
						'text-allow-overlap': false,
						'text-ignore-placement': false
					},
					paint: {
						'text-color': '#173e3b',
						'text-halo-color': '#fffdf7',
						'text-opacity': ['step', ['zoom'], 0, 2, 1],
						'text-halo-width': ['step', ['zoom'], 0, 2, 1.5]
					}
				});
				restrictSymbolLayers(mapInstance);
				for (const layerId of criticalFacilityLayerIds) {
					mapInstance.moveLayer(layerId);
				}

				mapInstance.on('click', 'calapan-barangay-fill', (event) => {
					const properties = getBarangayProperties(event.features?.[0]?.properties);
					if (properties) selectBarangay(properties);
				});
				mapInstance.on('click', (event) => {
					if (
						mapInstance.queryRenderedFeatures(event.point, { layers: ['calapan-barangay-fill'] })
							.length === 0
					) {
						clearSelection();
					}
				});
				mapInstance.on('mouseenter', 'calapan-barangay-fill', () => {
					mapInstance.getCanvas().style.cursor = 'pointer';
				});
				mapInstance.on('mouseleave', 'calapan-barangay-fill', () => {
					mapInstance.getCanvas().style.cursor = '';
				});
				mapInstance.on('click', 'critical-facilities-clusters', (event) => {
					const cluster = event.features?.[0];
					const clusterId = Number(cluster?.properties?.cluster_id);
					if (!Number.isFinite(clusterId)) return;
					const source = mapInstance.getSource('calapan-critical-facilities') as
						import('maplibre-gl').GeoJSONSource | undefined;
					if (!source) return;
					void source
						.getClusterExpansionZoom(clusterId)
						.then((zoom) => mapInstance.easeTo({ center: event.lngLat, zoom }))
						.catch(() => {});
				});
				mapInstance.on('click', 'critical-facilities-points', (event) => {
					const properties = event.features?.[0]?.properties as Record<string, unknown> | undefined;
					if (!properties) return;
					const name = typeof properties.name === 'string' ? properties.name : 'Unnamed facility';
					const category =
						typeof properties.categoryLabel === 'string'
							? properties.categoryLabel
							: 'Critical facility';
					const verification =
						properties.verificationStatus === 'map-listed-unverified'
							? 'Map-listed, unverified'
							: null;
					const sourceUrl =
						typeof properties.sourceUrl === 'string' && /^https?:\/\//.test(properties.sourceUrl)
							? properties.sourceUrl
							: null;
					const sourceLabel =
						typeof properties.sourceLabel === 'string' ? properties.sourceLabel : 'Source';
					const checkedAt =
						typeof properties.checkedAt === 'string' ? `Checked ${properties.checkedAt}` : null;
					const popupDetails = [
						`<small>${escapeHtml(category)}</small>`,
						verification ? `<small>${escapeHtml(verification)}</small>` : '',
						checkedAt ? `<small>${escapeHtml(checkedAt)}</small>` : '',
						sourceUrl
							? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(sourceLabel)}</a>`
							: ''
					].join('');
					facilityPopup?.remove();
					facilityPopup = new Popup({ closeButton: true, closeOnClick: true, offset: 12 })
						.setLngLat(event.lngLat)
						.setHTML(`<strong>${escapeHtml(name)}</strong>${popupDetails}`)
						.addTo(mapInstance);
				});
				for (const layerId of ['critical-facilities-clusters', 'critical-facilities-points']) {
					mapInstance.on('mouseenter', layerId, () => {
						mapInstance.getCanvas().style.cursor = 'pointer';
					});
					mapInstance.on('mouseleave', layerId, () => {
						mapInstance.getCanvas().style.cursor = '';
					});
				}

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
			setCriticalFacilitiesVisibility = () => {};
			loadCriticalFacilities = () => {};
			if (facilityPulseFrame !== null) cancelAnimationFrame(facilityPulseFrame);
			facilityPopup?.remove();
			map?.remove();
		};
	});
</script>

<div class="map-shell">
	<div class="map-toolbar" role="region" aria-label="Map controls">
		<div class="map-control-groups">
			<div class="control-header">
				<div class="control-heading">
					<span class="control-kicker">Map view</span>
					<strong>Explore Calapan</strong>
				</div>
				<div class="view-toggle" role="group" aria-label="Map view mode">
					<button
						class:active={viewMode === '3d'}
						aria-pressed={viewMode === '3d'}
						type="button"
						onclick={() => setViewMode('3d')}
					>
						3D
					</button>
					<button
						class:active={viewMode === '2d'}
						aria-pressed={viewMode === '2d'}
						type="button"
						onclick={() => setViewMode('2d')}
					>
						2D
					</button>
				</div>
			</div>

			<div class="control-section">
				<div class="control-section-heading">
					<div class="control-heading">
						<span class="control-kicker">Hazard layers</span>
						<strong>{hazardFamilyLabel(activeHazardFamily)}</strong>
					</div>
					<span class="control-hint">Choose a view</span>
				</div>
				<div class="hazard-family-toggle" role="group" aria-label="Hazard type">
					<button
						class:active={activeHazardFamily === 'flood'}
						aria-pressed={activeHazardFamily === 'flood'}
						type="button"
						onclick={() => setHazardFamily('flood')}
						onmouseenter={() => preloadHazardFamily('flood')}
						onfocus={() => preloadHazardFamily('flood')}
					>
						Flood
					</button>
					<button
						class:active={activeHazardFamily === 'storm-surge'}
						aria-pressed={activeHazardFamily === 'storm-surge'}
						type="button"
						onclick={() => setHazardFamily('storm-surge')}
						onmouseenter={() => preloadHazardFamily('storm-surge')}
						onfocus={() => preloadHazardFamily('storm-surge')}
					>
						Storm surge
					</button>
					<button
						class:active={activeHazardFamily === 'landslide'}
						aria-pressed={activeHazardFamily === 'landslide'}
						type="button"
						onclick={() => setHazardFamily('landslide')}
						onmouseenter={() => preloadHazardFamily('landslide')}
						onfocus={() => preloadHazardFamily('landslide')}
					>
						Landslide
					</button>
					<button
						class:active={activeHazardFamily === 'earthquake'}
						aria-pressed={activeHazardFamily === 'earthquake'}
						type="button"
						onclick={() => setHazardFamily('earthquake')}
						onmouseenter={() => preloadHazardFamily('earthquake')}
						onfocus={() => preloadHazardFamily('earthquake')}
					>
						Earthquake
					</button>
					<button
						class:active={activeHazardFamily === 'typhoon'}
						aria-pressed={activeHazardFamily === 'typhoon'}
						type="button"
						onclick={() => setHazardFamily('typhoon')}
						onmouseenter={() => preloadHazardFamily('typhoon')}
						onfocus={() => preloadHazardFamily('typhoon')}
					>
						Typhoon
					</button>
				</div>

				<div class="context-controls">
					{#if activeHazardFamily === 'flood'}
						<div class="flood-toggle" role="group" aria-label="Flood return period layers">
							{#each floodHazardPeriods as period (period.key)}
								<label class:active={enabledFloodPeriods.includes(period.key)}>
									<input
										type="checkbox"
										checked={enabledFloodPeriods.includes(period.key)}
										onchange={(event) =>
											setFloodPeriodEnabled(period.key, event.currentTarget.checked)}
									/>
									<span class="flood-toggle-swatch" style={`background: ${period.colors.Medium}`}
									></span>
									<span>{period.shortName}</span>
								</label>
							{/each}
						</div>
					{:else if activeHazardFamily === 'storm-surge'}
						<div class="flood-toggle" role="group" aria-label="Storm surge advisory layers">
							{#each stormSurgeAdvisories as advisory (advisory.key)}
								<label class:active={enabledStormSurgeAdvisories.includes(advisory.key)}>
									<input
										type="checkbox"
										checked={enabledStormSurgeAdvisories.includes(advisory.key)}
										onchange={(event) =>
											setStormSurgeAdvisoryEnabled(advisory.key, event.currentTarget.checked)}
									/>
									<span class="flood-toggle-swatch" style={`background: ${advisory.colors.Medium}`}
									></span>
									<span>{advisory.shortName}</span>
								</label>
							{/each}
						</div>
					{:else if activeHazardFamily === 'landslide'}
						<div class="flood-toggle" role="group" aria-label="Landslide hazard layers">
							{#each landslideHazards as layer (layer.key)}
								<label class:active={enabledLandslideLayers.includes(layer.key)}>
									<input
										type="checkbox"
										checked={enabledLandslideLayers.includes(layer.key)}
										onchange={(event) =>
											setLandslideLayerEnabled(layer.key, event.currentTarget.checked)}
									/>
									<span class="flood-toggle-swatch" style={`background: ${layer.colors.Medium}`}
									></span>
									<span>{layer.shortName}</span>
								</label>
							{/each}
						</div>
					{:else if activeHazardFamily === 'earthquake'}
						<div class="flood-toggle" role="group" aria-label="Earthquake hazard layers">
							{#each seismicHazards as layer (layer.key)}
								<label class:active={enabledSeismicLayers.includes(layer.key)}>
									<input
										type="checkbox"
										checked={enabledSeismicLayers.includes(layer.key)}
										onchange={(event) =>
											setSeismicLayerEnabled(layer.key, event.currentTarget.checked)}
									/>
									<span class="flood-toggle-swatch" style={`background: ${layer.classes[0].color}`}
									></span>
									<span>{layer.shortName}</span>
								</label>
							{/each}
						</div>
					{:else}
						<div
							class="flood-toggle typhoon-toggle"
							role="status"
							aria-label="Typhoon track status"
						>
							<span class="typhoon-toggle-swatch"></span>
							<span>Track proximity</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

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

	.map-toolbar,
	.map-status,
	.facility-toggle,
	.facility-legend,
	.boundary-note {
		position: absolute;
		z-index: 2;
	}

	.map-toolbar {
		top: 1rem;
		left: 1rem;
		width: min(35rem, calc(100% - 2rem));
		overflow: hidden;
		border: 1px solid rgb(23 62 59 / 14%);
		border-radius: 0.9rem;
		background: rgb(250 248 242 / 96%);
		box-shadow: 0 0.75rem 2rem rgb(30 56 55 / 18%);
		backdrop-filter: blur(12px);
	}

	.map-control-groups {
		display: grid;
	}

	.control-header,
	.control-section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.control-header {
		padding: 0.75rem 0.85rem;
		border-bottom: 1px solid rgb(23 62 59 / 12%);
	}

	.control-heading {
		display: grid;
		gap: 0.1rem;
	}

	.control-heading strong {
		color: #173e3b;
		font-size: 0.88rem;
		line-height: 1.15;
	}

	.control-kicker {
		color: #788d88;
		font-size: 0.61rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.control-hint {
		color: #788d88;
		font-size: 0.68rem;
		font-weight: 700;
	}

	.control-section {
		display: grid;
		gap: 0.65rem;
		padding: 0.8rem 0.85rem 0.85rem;
	}

	.context-controls {
		display: grid;
		gap: 0.65rem;
		padding-top: 0.65rem;
		border-top: 1px solid rgb(23 62 59 / 12%);
	}

	.view-toggle {
		display: flex;
		gap: 0.15rem;
	}

	.view-toggle button {
		border: 1px solid rgb(23 62 59 / 14%);
		border-radius: 999px;
		padding: 0.4rem 0.7rem;
		background: transparent;
		color: #476563;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}

	.view-toggle button.active {
		background: #173e3b;
		color: #fffdf7;
	}

	.hazard-family-toggle {
		display: flex;
		gap: 0.3rem;
		overflow-x: auto;
		padding-bottom: 0.1rem;
		scrollbar-width: none;
	}

	.hazard-family-toggle::-webkit-scrollbar {
		display: none;
	}

	.hazard-family-toggle button {
		flex: 0 0 auto;
		border: 1px solid rgb(23 62 59 / 14%);
		border-radius: 999px;
		padding: 0.42rem 0.72rem;
		background: rgb(255 255 255 / 35%);
		color: #476563;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}

	.hazard-family-toggle button.active {
		background: #173e3b;
		color: #fffdf7;
	}

	.flood-toggle {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.flood-toggle label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid rgb(23 62 59 / 12%);
		border-radius: 0.5rem;
		padding: 0.42rem 0.6rem;
		background: rgb(255 255 255 / 42%);
		color: #476563;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}

	.flood-toggle label.active {
		border-color: rgb(23 62 59 / 30%);
		background: rgb(23 62 59 / 9%);
		color: #173e3b;
	}

	.flood-toggle input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.flood-toggle label:has(input:focus-visible) {
		outline: 2px solid #d18f38;
		outline-offset: 2px;
	}

	.flood-toggle-swatch {
		width: 0.65rem;
		height: 0.65rem;
		border: 1px solid rgb(23 62 59 / 20%);
		border-radius: 50%;
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

		.map-toolbar {
			top: 0.75rem;
			left: 0.75rem;
			width: calc(100% - 1.5rem);
			max-width: calc(100% - 1.5rem);
			border-radius: 0.85rem;
		}

		.control-section-heading {
			align-items: flex-start;
		}

		.control-hint {
			display: none;
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
