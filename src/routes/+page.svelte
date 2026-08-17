<script lang="ts">
	import { resolve } from '$app/paths';
	import { calapanBoundaryAttribution } from '$lib/data/calapan-boundary';
	import { prototypeFloodLayer, type HazardAreaProperties } from '$lib/data/hazards';
	import logo from '$lib/assets/logo.svg';
	import HazardMap from '$lib/components/HazardMap.svelte';

	let selectedArea = $state<HazardAreaProperties | null>(null);

	function handleAreaSelect(area: HazardAreaProperties | null) {
		selectedArea = area;
	}

	function clearSelectedArea() {
		selectedArea = null;
	}
</script>

<svelte:head>
	<title>Hazards | Calapan City</title>
	<meta
		name="description"
		content="A localized view of hazard-risk zones and recent official incidents in Calapan City."
	/>
</svelte:head>

<div class="app-shell">
	<section class="map-pane" aria-label="Hazard map">
		<HazardMap onSelectArea={handleAreaSelect} />
	</section>

	<aside class="sidebar" aria-label="Hazard information">
		<div class="sidebar-inner">
			<div class="brand-row">
				<a class="brand-link" href={resolve('/')} aria-label="Go to Hazards home">
					<img src={logo} alt="" width="36" height="36" />
					<span>BetterCalapan</span>
				</a>
				<span class="product-label">Hazards</span>
			</div>

			<header class="sidebar-intro">
				<p class="eyebrow">Calapan City hazard map</p>
				<h1>Understand the risks around you.</h1>
				<p class="intro-copy">
					Explore hazard-risk zones across Calapan and check what official sources have reported in
					the last 24 hours.
				</p>
			</header>

			<section class="info-card active-layer">
				<div class="card-kicker">
					<span class="layer-dot"></span>
					Active layer
				</div>
				<h2>{prototypeFloodLayer.name}</h2>
				<p>{prototypeFloodLayer.description}</p>
				<div class="legend" aria-label="Prototype map legend">
					<div><span class="legend-swatch demo"></span>{prototypeFloodLayer.legendLabel}</div>
				</div>
			</section>

			<section class="info-card selection-card" class:selected={selectedArea} aria-live="polite">
				{#if selectedArea}
					<div class="card-kicker">Selected area</div>
					<h2>{selectedArea.name}</h2>
					<p>{selectedArea.description}</p>
					<div class="selection-status">
						<span class="layer-dot"></span>
						{selectedArea.status === 'prototype' ? 'Prototype data' : 'Verified data'}
					</div>
					<p class="selection-source">
						Source: {prototypeFloodLayer.sourceName}. Update:
						{prototypeFloodLayer.updatedAt ?? 'not available for prototype data'}.
					</p>
					<button class="clear-selection" type="button" onclick={clearSelectedArea}>
						Clear selection
					</button>
				{:else}
					<div class="card-kicker">Area details</div>
					<h2>Select an area</h2>
					<p>Click the highlighted area on the map to inspect its available details.</p>
				{/if}
			</section>

			<section class="info-card recent-events">
				<div class="card-heading">
					<div>
						<div class="card-kicker">Official reports</div>
						<h2>Past 24 hours</h2>
					</div>
					<span class="coming-soon">Soon</span>
				</div>
				<p>Verified recent events will appear here once an official feed is connected.</p>
			</section>

			<p class="boundary-attribution">{calapanBoundaryAttribution}</p>
		</div>
	</aside>
</div>

<style>
	.app-shell {
		display: grid;
		flex: 1;
		grid-template-columns: minmax(0, 1fr) minmax(22rem, 28rem);
		width: 100%;
		min-height: 0;
	}

	.map-pane {
		min-width: 0;
		min-height: 0;
		background: var(--neutral-light);
	}

	.sidebar {
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		border-left: 1px solid var(--gray);
		background: var(--neutral-lightest);
		scrollbar-color: var(--gray) transparent;
	}

	.sidebar-inner {
		padding: 1.5rem;
	}

	.brand-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--gray);
	}

	.brand-link {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.brand-link img {
		border-radius: 0.65rem;
	}

	.product-label {
		color: var(--fg-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.sidebar-intro {
		padding: 2rem 0 1.5rem;
	}

	.eyebrow,
	.card-kicker {
		margin-bottom: 0.75rem;
		color: var(--accent-dark);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.1;
		text-wrap: balance;
	}

	.intro-copy {
		margin-top: 1rem;
		color: var(--fg-secondary);
		font-size: 1rem;
	}

	.info-card {
		padding: 1.5rem;
		border: 1px solid var(--gray);
		border-radius: 0.75rem;
		background: var(--bg);
	}

	.info-card + .info-card {
		margin-top: 1rem;
	}

	.active-layer {
		border-color: var(--accent-light);
		background: var(--bg);
	}

	.active-layer .card-kicker {
		color: var(--accent-dark);
	}

	.selection-card.selected {
		border-color: var(--accent);
	}

	h2 {
		margin-bottom: 0.75rem;
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.info-card p {
		color: var(--fg-secondary);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.layer-dot {
		display: inline-block;
		width: 0.55rem;
		height: 0.55rem;
		margin-right: 0.35rem;
		border-radius: 50%;
		background: var(--accent);
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1.5rem;
		color: var(--fg-secondary);
		font-size: 0.85rem;
	}

	.legend div {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.legend-swatch {
		width: 1.5rem;
		height: 0.55rem;
		border-radius: 999px;
	}

	.legend-swatch.demo {
		background: var(--accent);
	}

	.selection-status {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 1rem;
		color: var(--fg-secondary);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.selection-status .layer-dot {
		margin-right: 0;
	}

	.selection-source {
		margin-top: 0.75rem;
		font-size: 0.8rem !important;
	}

	.clear-selection {
		margin-top: 1.25rem;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--gray);
		border-radius: 999px;
		background: var(--bg);
		color: var(--fg);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.clear-selection:hover {
		background: var(--neutral-hover);
	}

	.card-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	.card-heading h2 {
		margin-bottom: 0;
	}

	.coming-soon {
		padding: 0.3rem 0.5rem;
		border-radius: 999px;
		background: var(--neutral-light);
		color: var(--fg-secondary);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.boundary-attribution {
		padding: 0.25rem 0.25rem 1rem;
		color: var(--fg-secondary);
		font-size: 0.7rem;
		line-height: 1.4;
	}

	@media (max-width: 850px) {
		.app-shell {
			display: flex;
			flex-direction: column;
			min-height: 100%;
		}

		.map-pane {
			flex: 0 0 auto;
			height: 55dvh;
			min-height: 24rem;
			max-height: 42rem;
		}

		.sidebar {
			flex: 1 0 auto;
			overflow: visible;
			border-top: 1px solid var(--gray);
			border-left: 0;
		}

		.sidebar-inner {
			padding: 1.25rem 1rem 3rem;
		}
	}

	@media (min-width: 851px) and (max-width: 1100px) {
		.sidebar-inner {
			padding: 1.25rem;
		}

		h1 {
			font-size: 2rem;
		}
	}

	@media (min-width: 851px) {
		.app-shell,
		.map-pane,
		.sidebar {
			height: 100%;
		}
	}
</style>
