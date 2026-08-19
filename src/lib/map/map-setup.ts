import { calapanCityBoundary, calapanCityMask } from '$lib/data/calapan-boundary';
import type { BarangayCollection } from '$lib/data/barangays';
import type { ViewMode } from '$lib/map-state';

type MapInstance = import('maplibre-gl').Map;
const calapanContourDataUrl = '/calapan-contours.json';
const terrainAttribution =
	'Elevation data © Mapzen, sourced from USGS, NASA, and other contributors.';

export type MapBounds = [[number, number], [number, number]];

export function getPanBounds(map: MapInstance): MapBounds {
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

function restrictSymbolLayers(map: MapInstance) {
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

function dimBaseMapTransportLayers(map: MapInstance, barangays: BarangayCollection) {
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

export function updateMapCamera(map: MapInstance, terrainReady: boolean, nextMode: ViewMode) {
	const is3d = nextMode === '3d';
	if (terrainReady) {
		map.setTerrain(is3d ? { source: 'calapan-terrain', exaggeration: 1.15 } : null);
	}

	if (is3d) {
		map.dragRotate.enable();
		map.touchZoomRotate.enableRotation();
	} else {
		map.dragRotate.disable();
		map.touchZoomRotate.disableRotation();
	}

	map.easeTo({
		pitch: is3d ? 45 : 0,
		bearing: is3d ? -12 : 0,
		duration: 500
	});
}

export function setupBaseMap(map: MapInstance, barangays: BarangayCollection) {
	dimBaseMapTransportLayers(map, barangays);
	const firstSymbolLayerId = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
	const terrainSource: import('maplibre-gl').RasterDEMSourceSpecification = {
		type: 'raster-dem',
		tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
		tileSize: 256,
		maxzoom: 15,
		encoding: 'terrarium',
		attribution: terrainAttribution
	};

	map.addSource('calapan-terrain', terrainSource);
	map.addSource('calapan-terrain-hillshade', terrainSource);
	map.addLayer(
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
	map.addSource('calapan-contours', {
		type: 'geojson',
		data: calapanContourDataUrl
	});
	map.addLayer(
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
	map.addLayer(
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
	map.addLayer(
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
	map.addSource('calapan-city-mask', {
		type: 'geojson',
		data: calapanCityMask
	});
	map.addLayer(
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
	map.addSource('calapan-city-boundary', {
		type: 'geojson',
		data: calapanCityBoundary
	});
	map.addLayer(
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

	return { firstSymbolLayerId, terrainReady: true as const };
}

export { restrictSymbolLayers };
