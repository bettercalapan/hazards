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
		calapanBarangays,
		type BarangayProperties
	} from '$lib/data/barangays';
	import { floodHazardPeriods, type ReturnPeriod } from '$lib/data/flood';
	import { stormSurgeAdvisories, type StormSurgeAdvisory } from '$lib/data/storm-surge';
	import { landslideHazards, type LandslideLayer } from '$lib/data/landslide';
	import { seismicHazards, type SeismicLayer } from '$lib/data/seismic';
	import { calapanContourDataUrl, terrainAttribution } from '$lib/data/terrain';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import 'maplibre-gl/dist/maplibre-gl.css';

	type ViewMode = '3d' | '2d';
	type HazardFamily = 'flood' | 'storm-surge' | 'landslide' | 'earthquake';
	type Props = {
		onSelectArea?: (area: BarangayProperties | null) => void;
		onHazardFamilyChange?: (family: HazardFamily) => void;
	};
	type MapBounds = [[number, number], [number, number]];

	let { onSelectArea, onHazardFamilyChange }: Props = $props();

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

	function dimBaseMapTransportLayers(map: import('maplibre-gl').Map) {
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
		const barangayNames = calapanBarangays.features.map((feature) => feature.properties.name);
		const excludeBarangayNames = [
			'!',
			[
				'any',
				['match', ['get', 'name'], barangayNames, true, false],
				['match', ['get', 'name:latin'], barangayNames, true, false]
			]
		] as unknown as import('maplibre-gl').FilterSpecification;
		const opacityAtZoom = (atReveal: number, zoomedIn: number) => [
			'interpolate',
			['linear'],
			['zoom'],
			12.5,
			0,
			13,
			atReveal,
			14,
			zoomedIn
		];
		const roadLineOpacity = [
			'match',
			['get', 'class'],
			['motorway', 'trunk', 'primary'],
			opacityAtZoom(0.12, 0.28),
			['secondary', 'tertiary'],
			opacityAtZoom(0.08, 0.18),
			opacityAtZoom(0.04, 0.1)
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

	onMount(() => {
		let disposed = false;
		let map: import('maplibre-gl').Map | undefined;
		let selectedBarangayId: string | null = null;
		let terrainReady = false;

		const initialize = async () => {
			const { setWorkerUrl, Map: MapLibreMap } = await import('maplibre-gl');

			if (disposed) return;
			setWorkerUrl(workerUrl);
			const cityBounds: MapBounds = [
				[calapanCityBounds[0], calapanCityBounds[1]],
				[calapanCityBounds[2], calapanCityBounds[3]]
			];

			const mapInstance = new MapLibreMap({
				container: mapElement,
				style: 'https://tiles.openfreemap.org/styles/liberty',
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
				if (selectedBarangayId) {
					mapInstance.setFeatureState(
						{ source: 'calapan-barangays', id: selectedBarangayId },
						{ selected: false }
					);
				}
				selectedBarangayId = null;
				onSelectArea?.(null);
			};

			const selectBarangay = (properties: BarangayProperties) => {
				if (selectedBarangayId && selectedBarangayId !== properties.id) {
					mapInstance.setFeatureState(
						{ source: 'calapan-barangays', id: selectedBarangayId },
						{ selected: false }
					);
				}
				selectedBarangayId = properties.id;
				mapInstance.setFeatureState(
					{ source: 'calapan-barangays', id: properties.id },
					{ selected: true }
				);
				onSelectArea?.(properties);
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
				dimBaseMapTransportLayers(mapInstance);
				const firstSymbolLayerId = mapInstance
					.getStyle()
					.layers?.find((layer) => layer.type === 'symbol')?.id;
				mapInstance.addSource('calapan-terrain', {
					type: 'raster-dem',
					tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
					tileSize: 256,
					maxzoom: 15,
					encoding: 'terrarium',
					attribution: terrainAttribution
				});
				mapInstance.addLayer(
					{
						id: 'calapan-terrain-hillshade',
						type: 'hillshade',
						source: 'calapan-terrain',
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
				const hazardFamilies: HazardFamily[] = ['flood', 'storm-surge', 'landslide', 'earthquake'];
				const layersForFamily = (family: HazardFamily) => {
					if (family === 'flood') return floodHazardPeriods;
					if (family === 'storm-surge') return stormSurgeAdvisories;
					if (family === 'landslide') return landslideHazards;
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
					return enabledSeismicLayers.includes(key as SeismicLayer);
				};
				const setFamilyVisibility = (family: HazardFamily, visible: boolean, opacity = 0.85) => {
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
						id: 'calapan-barangay-fill',
						type: 'fill',
						source: 'calapan-barangays',
						paint: {
							'fill-color': '#ff5500',
							'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.35, 0]
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
			map?.remove();
		};
	});
</script>

<div class="map-shell">
	<div class="map-toolbar" aria-label="Map controls">
		<div class="map-control-groups">
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
			</div>

			{#if activeHazardFamily === 'flood'}
				<div class="flood-toggle" role="group" aria-label="Flood return period layers">
					{#each floodHazardPeriods as period (period.key)}
						<label class:active={enabledFloodPeriods.includes(period.key)}>
							<input
								type="checkbox"
								checked={enabledFloodPeriods.includes(period.key)}
								onchange={(event) => setFloodPeriodEnabled(period.key, event.currentTarget.checked)}
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
							<span class="flood-toggle-swatch" style={`background: ${layer.colors.Medium}`}></span>
							<span>{layer.shortName}</span>
						</label>
					{/each}
				</div>
			{:else}
				<div class="flood-toggle" role="group" aria-label="Earthquake hazard layers">
					{#each seismicHazards as layer (layer.key)}
						<label class:active={enabledSeismicLayers.includes(layer.key)}>
							<input
								type="checkbox"
								checked={enabledSeismicLayers.includes(layer.key)}
								onchange={(event) => setSeismicLayerEnabled(layer.key, event.currentTarget.checked)}
							/>
							<span class="flood-toggle-swatch" style={`background: ${layer.classes[0].color}`}
							></span>
							<span>{layer.shortName}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div bind:this={mapElement} class="map" aria-label="Interactive map of Calapan City"></div>

	<div class="map-status" class:ready={mapReady && !loadingHazardFamily} aria-live="polite">
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
			Map ready
		{/if}
	</div>

	<div class="boundary-note">
		{#if activeHazardFamily === 'earthquake'}
			PHIVOLCS Ground Shaking, Liquefaction, and Tsunami vector layers.
		{:else}
			NOAH {activeHazardFamily === 'flood'
				? 'flood hazard'
				: activeHazardFamily === 'storm-surge'
					? 'storm-surge'
					: 'landslide hazard'} layers.
		{/if}
		3D elevation uses Mapzen Terrain Tiles.
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
	.boundary-note {
		position: absolute;
		z-index: 2;
	}

	.map-toolbar {
		top: 1rem;
		left: 1rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.7rem;
		max-width: calc(100% - 2rem);
		padding: 0.45rem;
		border: 1px solid rgb(255 255 255 / 65%);
		border-radius: 999px;
		background: rgb(250 248 242 / 90%);
		box-shadow: 0 0.5rem 1.5rem rgb(30 56 55 / 12%);
		backdrop-filter: blur(12px);
	}

	.map-control-groups {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
	}

	.view-toggle {
		display: flex;
		gap: 0.15rem;
	}

	.view-toggle button {
		border: 0;
		border-radius: 999px;
		padding: 0.45rem 0.75rem;
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
		gap: 0.15rem;
		border-left: 1px solid rgb(71 101 99 / 20%);
		padding-left: 0.3rem;
	}

	.hazard-family-toggle button {
		border: 0;
		border-radius: 999px;
		padding: 0.45rem 0.65rem;
		background: transparent;
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
		gap: 0.2rem;
	}

	.flood-toggle label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border-radius: 999px;
		padding: 0.45rem 0.6rem;
		color: #476563;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}

	.flood-toggle label.active {
		background: rgb(23 62 59 / 10%);
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

	.map-status.ready .status-dot {
		background: #3c9276;
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
			max-width: calc(100% - 1.5rem);
			border-radius: 0.85rem;
		}

		.map-status {
			top: auto;
			right: 0.75rem;
			bottom: 0.75rem;
		}

		.boundary-note {
			left: 0.75rem;
			bottom: 0.75rem;
		}
	}
</style>
