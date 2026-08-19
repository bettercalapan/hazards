import {
	criticalFacilityColors,
	emptyCriticalFacilities,
	type CriticalFacilityCollection
} from '$lib/data/critical-facilities';

type MapInstance = import('maplibre-gl').Map;
type FirstSymbolLayerId = string | undefined;
type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type LayerMouseEvent = import('maplibre-gl').MapMouseEvent & {
	features?: Array<{ properties?: unknown }>;
};

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
	addLayers: () => void;
	bindInteractions: (Popup: typeof import('maplibre-gl').Popup) => void;
	moveLayersToTop: () => void;
	setVisibility: (visible: boolean) => void;
	load: () => void;
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
	let facilityPopup: import('maplibre-gl').Popup | null = null;
	let facilityPopupConstructor: typeof import('maplibre-gl').Popup;
	let interactionsBound = false;

	const escapeHtml = (value: string): string =>
		value.replace(
			/[&<>'"]/g,
			(character) =>
				({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
				character
		);

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

	const onClusterClick = (event: LayerMouseEvent) => {
		const properties = event.features?.[0]?.properties;
		const clusterId = Number(
			properties && typeof properties === 'object'
				? (properties as Record<string, unknown>).cluster_id
				: undefined
		);
		if (!Number.isFinite(clusterId)) return;
		const source = map.getSource('calapan-critical-facilities') as
			import('maplibre-gl').GeoJSONSource | undefined;
		if (!source) return;
		void source
			.getClusterExpansionZoom(clusterId)
			.then((zoom) => {
				if (!disposed) map.easeTo({ center: event.lngLat, zoom });
			})
			.catch(() => {});
	};

	const onFacilityClick = (event: LayerMouseEvent) => {
		const properties = event.features?.[0]?.properties;
		if (!properties || typeof properties !== 'object') return;
		const values = properties as Record<string, unknown>;
		const name = typeof values.name === 'string' ? values.name : 'Unnamed facility';
		const category =
			typeof values.categoryLabel === 'string' ? values.categoryLabel : 'Critical facility';
		const verification =
			values.verificationStatus === 'map-listed-unverified' ? 'Map-listed, unverified' : null;
		const sourceUrl =
			typeof values.sourceUrl === 'string' && /^https?:\/\//.test(values.sourceUrl)
				? values.sourceUrl
				: null;
		const sourceLabel = typeof values.sourceLabel === 'string' ? values.sourceLabel : 'Source';
		const checkedAt = typeof values.checkedAt === 'string' ? `Checked ${values.checkedAt}` : null;
		const popupDetails = [
			`<small>${escapeHtml(category)}</small>`,
			verification ? `<small>${escapeHtml(verification)}</small>` : '',
			checkedAt ? `<small>${escapeHtml(checkedAt)}</small>` : '',
			sourceUrl
				? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(sourceLabel)}</a>`
				: ''
		].join('');
		facilityPopup?.remove();
		facilityPopup = new facilityPopupConstructor({
			closeButton: true,
			closeOnClick: true,
			offset: 12
		})
			.setLngLat(event.lngLat)
			.setHTML(`<strong>${escapeHtml(name)}</strong>${popupDetails}`)
			.addTo(map);
	};

	const onFacilityMouseEnter = () => {
		map.getCanvas().style.cursor = 'pointer';
	};
	const onFacilityMouseLeave = () => {
		map.getCanvas().style.cursor = '';
	};

	const bindInteractions = (Popup: typeof import('maplibre-gl').Popup) => {
		if (disposed || interactionsBound) return;
		facilityPopupConstructor = Popup;
		interactionsBound = true;
		map.on('click', 'critical-facilities-clusters', onClusterClick);
		map.on('click', 'critical-facilities-points', onFacilityClick);
		map.on('mouseenter', 'critical-facilities-clusters', onFacilityMouseEnter);
		map.on('mouseleave', 'critical-facilities-clusters', onFacilityMouseLeave);
		map.on('mouseenter', 'critical-facilities-points', onFacilityMouseEnter);
		map.on('mouseleave', 'critical-facilities-points', onFacilityMouseLeave);
	};

	const moveLayersToTop = () => {
		if (disposed) return;
		for (const layerId of layerIds) map.moveLayer(layerId);
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
		addLayers,
		bindInteractions,
		moveLayersToTop,
		setVisibility,
		load,
		dispose: () => {
			disposed = true;
			stopPulse();
			if (interactionsBound) {
				map.off('click', 'critical-facilities-clusters', onClusterClick);
				map.off('click', 'critical-facilities-points', onFacilityClick);
				map.off('mouseenter', 'critical-facilities-clusters', onFacilityMouseEnter);
				map.off('mouseleave', 'critical-facilities-clusters', onFacilityMouseLeave);
				map.off('mouseenter', 'critical-facilities-points', onFacilityMouseEnter);
				map.off('mouseleave', 'critical-facilities-points', onFacilityMouseLeave);
			}
			facilityPopup?.remove();
			facilityPopup = null;
		}
	};
}
