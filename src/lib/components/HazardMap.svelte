<script lang="ts">
	import { onMount } from 'svelte';
	import type { FeatureCollection, Polygon } from 'geojson';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import 'maplibre-gl/dist/maplibre-gl.css';

	type ViewMode = '3d' | '2d';

	const prototypeFloodZone: FeatureCollection<Polygon> = {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: { name: 'Prototype flood-risk zone' },
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[121.165, 13.402],
							[121.185, 13.402],
							[121.19, 13.415],
							[121.172, 13.422],
							[121.16, 13.414],
							[121.165, 13.402]
						]
					]
				}
			}
		]
	};

	let mapElement: HTMLDivElement;
	let viewMode = $state<ViewMode>('3d');
	let mapReady = $state(false);
	let updateDeckLayer = () => {};
	let updateMapCamera: (nextMode: ViewMode) => void = () => {};

	function setViewMode(nextMode: ViewMode) {
		viewMode = nextMode;
		updateMapCamera(nextMode);
		updateDeckLayer();
	}

	onMount(() => {
		let disposed = false;
		let map: import('maplibre-gl').Map | undefined;
		let overlay: import('@deck.gl/mapbox').MapboxOverlay | undefined;

		const initialize = async () => {
			const [{ setWorkerUrl, Map: MapLibreMap }, { MapboxOverlay }, { GeoJsonLayer }] =
				await Promise.all([
					import('maplibre-gl'),
					import('@deck.gl/mapbox'),
					import('@deck.gl/layers')
				]);

			if (disposed) return;
			setWorkerUrl(workerUrl);

			const mapInstance = new MapLibreMap({
				container: mapElement,
				style: 'https://tiles.openfreemap.org/styles/liberty',
				center: [121.1783, 13.4117],
				zoom: 11.5,
				pitch: 45,
				bearing: -12,
				attributionControl: { compact: true }
			});
			map = mapInstance;

			updateMapCamera = (nextMode) => {
				const is3d = nextMode === '3d';

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

			overlay = new MapboxOverlay({
				interleaved: false,
				layers: []
			});

			updateDeckLayer = () => {
				if (!overlay) return;

				overlay.setProps({
					layers: [
						new GeoJsonLayer({
							id: 'prototype-flood-zone',
							data: prototypeFloodZone,
							filled: true,
							stroked: true,
							extruded: viewMode === '3d',
							getElevation: 35,
							getFillColor: [228, 154, 61, 115],
							getLineColor: [145, 78, 21, 220],
							getLineWidth: 3,
							lineWidthUnits: 'pixels',
							pickable: true,
							autoHighlight: true
						})
					]
				});
			};

			mapInstance.once('load', () => {
				if (!overlay || disposed) return;

				mapInstance.addControl(overlay);
				updateMapCamera(viewMode);
				updateDeckLayer();
				mapReady = true;
			});
		};

		void initialize();

		return () => {
			disposed = true;
			updateMapCamera = () => {};
			updateDeckLayer = () => {};
			overlay?.finalize();
			map?.remove();
		};
	});
</script>

<div class="map-shell">
	<div class="map-toolbar" aria-label="Map view controls">
		<span class="toolbar-label">View</span>
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

	<div bind:this={mapElement} class="map" aria-label="Interactive map of Calapan City"></div>

	<div class="map-status" class:ready={mapReady}>
		<span class="status-dot"></span>
		{mapReady ? 'Map ready' : 'Loading map'}
	</div>

	<div class="prototype-note">Demo geometry only. Official flood data is not connected yet.</div>
</div>

<style>
	.map-shell {
		position: relative;
		min-height: 34rem;
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
	.prototype-note {
		position: absolute;
		z-index: 2;
	}

	.map-toolbar {
		top: 1rem;
		left: 1rem;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.45rem;
		border: 1px solid rgb(255 255 255 / 65%);
		border-radius: 999px;
		background: rgb(250 248 242 / 90%);
		box-shadow: 0 0.5rem 1.5rem rgb(30 56 55 / 12%);
		backdrop-filter: blur(12px);
	}

	.toolbar-label {
		padding-left: 0.55rem;
		color: #476563;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
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

	.prototype-note {
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
			min-height: 27rem;
		}

		.map-toolbar {
			top: 0.75rem;
			left: 0.75rem;
		}

		.map-status {
			top: auto;
			right: 0.75rem;
			bottom: 0.75rem;
		}

		.prototype-note {
			left: 0.75rem;
			bottom: 0.75rem;
		}
	}
</style>
