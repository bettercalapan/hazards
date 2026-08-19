import type { FeatureCollection, Point } from 'geojson';
import type { BarangayCollection, BarangayProperties } from '$lib/data/barangays';
import { calapanBarangayLabelPoints } from '$lib/data/barangays';
import type { MapBounds } from './map-setup';

type MapInstance = import('maplibre-gl').Map;
type FirstSymbolLayerId = string | undefined;
type BarangayLabelPoints = FeatureCollection<
	Point,
	Pick<BarangayProperties, 'id' | 'name' | 'sourceName'>
>;
type LayerMouseEvent = import('maplibre-gl').MapMouseEvent & {
	features?: Array<{ properties?: unknown }>;
};

type Options = {
	map: MapInstance;
	barangays: BarangayCollection;
	barangayLabelPoints?: BarangayLabelPoints;
	firstSymbolLayerId: FirstSymbolLayerId;
	onSelectArea?: (area: BarangayProperties | null) => void;
};

export function getBarangayProperties(object: unknown): BarangayProperties | null {
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

export function getBarangayBounds(barangays: BarangayCollection, id: string): MapBounds | null {
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

export function createBarangayLayerManager({
	map,
	barangays,
	barangayLabelPoints = calapanBarangayLabelPoints,
	firstSymbolLayerId,
	onSelectArea
}: Options) {
	let disposed = false;
	let selectedBarangayId: string | null = null;

	const clearSelection = () => {
		if (selectedBarangayId) {
			map.setFeatureState(
				{ source: 'calapan-barangays', id: selectedBarangayId },
				{ selected: false }
			);
		}
		if (map.getLayer('calapan-barangay-dim')) {
			map.setPaintProperty('calapan-barangay-dim', 'fill-opacity', 0);
		}
		selectedBarangayId = null;
		onSelectArea?.(null);
	};

	const selectBarangay = (properties: BarangayProperties) => {
		if (selectedBarangayId === properties.id) {
			clearSelection();
			return;
		}
		if (selectedBarangayId) {
			map.setFeatureState(
				{ source: 'calapan-barangays', id: selectedBarangayId },
				{ selected: false }
			);
		}
		selectedBarangayId = properties.id;
		map.setFeatureState({ source: 'calapan-barangays', id: properties.id }, { selected: true });
		map.setPaintProperty('calapan-barangay-dim', 'fill-opacity', [
			'case',
			['boolean', ['feature-state', 'selected'], false],
			0,
			0.3
		] as unknown as import('maplibre-gl').PropertyValueSpecification<number>);
		onSelectArea?.(properties);
	};

	const syncSelection = (id: string | null) => {
		if (disposed) return;
		if (!id) {
			if (selectedBarangayId) clearSelection();
			return;
		}
		if (selectedBarangayId === id) return;

		const feature = barangays.features.find((item) => item.properties.id === id);
		if (!feature) return;
		selectBarangay(feature.properties);
		const bounds = getBarangayBounds(barangays, id);
		if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 13.5, duration: 650 });
	};

	const onBarangayClick = (event: LayerMouseEvent) => {
		const properties = getBarangayProperties(event.features?.[0]?.properties);
		if (properties) selectBarangay(properties);
	};
	const onMapClick = (event: import('maplibre-gl').MapMouseEvent) => {
		if (
			map.queryRenderedFeatures(event.point, { layers: ['calapan-barangay-fill'] }).length === 0
		) {
			clearSelection();
		}
	};
	const onBarangayMouseEnter = () => {
		map.getCanvas().style.cursor = 'pointer';
	};
	const onBarangayMouseLeave = () => {
		map.getCanvas().style.cursor = '';
	};

	const addLayers = () => {
		map.addSource('calapan-barangays', {
			type: 'geojson',
			data: barangays,
			promoteId: 'id'
		});
		map.addSource('calapan-barangay-labels', {
			type: 'geojson',
			data: barangayLabelPoints,
			promoteId: 'id'
		});
		map.addLayer(
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
		map.addLayer(
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
		map.addLayer(
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
		map.addLayer({
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

		map.on('click', 'calapan-barangay-fill', onBarangayClick);
		map.on('click', onMapClick);
		map.on('mouseenter', 'calapan-barangay-fill', onBarangayMouseEnter);
		map.on('mouseleave', 'calapan-barangay-fill', onBarangayMouseLeave);
	};

	return {
		addLayers,
		syncSelection,
		dispose: () => {
			disposed = true;
			map.off('click', 'calapan-barangay-fill', onBarangayClick);
			map.off('click', onMapClick);
			map.off('mouseenter', 'calapan-barangay-fill', onBarangayMouseEnter);
			map.off('mouseleave', 'calapan-barangay-fill', onBarangayMouseLeave);
			selectedBarangayId = null;
		}
	};
}
