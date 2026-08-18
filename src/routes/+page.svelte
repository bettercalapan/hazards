<script lang="ts">
	import { resolve } from '$app/paths';
	import { calapanBarangayAttribution, type BarangayProperties } from '$lib/data/barangays';
	import { floodHazardMetadata, floodHazardPeriods } from '$lib/data/flood';
	import { formatAlertDate } from '$lib/data/alerts';
	import { stormSurgeAdvisories, stormSurgeMetadata } from '$lib/data/storm-surge';
	import { landslideHazards, landslideMetadata } from '$lib/data/landslide';
	import { seismicHazards, seismicMetadata } from '$lib/data/seismic';
	import logo from '$lib/assets/logo.svg';
	import HazardMap from '$lib/components/HazardMap.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedArea = $state<BarangayProperties | null>(null);
	type HazardFamily = 'flood' | 'storm-surge' | 'landslide' | 'earthquake';
	let activeHazardFamily = $state<HazardFamily>('flood');

	function handleAreaSelect(area: BarangayProperties | null) {
		selectedArea = area;
	}

	function handleHazardFamilyChange(family: HazardFamily) {
		activeHazardFamily = family;
	}
</script>

<svelte:head>
	<title>Hazards</title>
	<meta
		name="description"
		content="A localized view of hazard-risk zones and active official alerts in Calapan City."
	/>
</svelte:head>

<div class="app-shell">
	<section class="map-pane" aria-label="Hazard map">
		<HazardMap onSelectArea={handleAreaSelect} onHazardFamilyChange={handleHazardFamilyChange} />
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
					Explore hazard-risk zones across Calapan and check active official alerts from PAGASA.
				</p>
			</header>

			<section class="info-card active-layer">
				<div class="card-kicker">
					<span class="layer-dot"></span>
					{activeHazardFamily === 'flood'
						? 'Flood layers'
						: activeHazardFamily === 'storm-surge'
							? 'Storm-surge layers'
							: activeHazardFamily === 'landslide'
								? 'Landslide layers'
								: 'Ground-shaking layers'}
				</div>
				{#if activeHazardFamily === 'flood'}
					<h2>Flood hazard periods</h2>
					<p>
						Source-provided flood hazard classes for three return periods. All periods are enabled
						by default.
					</p>
					<div class="period-legends" aria-label="Flood hazard legends">
						{#each floodHazardPeriods as period (period.key)}
							<div class="period-legend">
								<strong>{period.shortName}</strong>
								<div class="legend">
									<div>
										<span class="legend-swatch" style={`background: ${period.colors.Low}`}
										></span>Low
									</div>
									<div>
										<span class="legend-swatch" style={`background: ${period.colors.Medium}`}
										></span>Medium
									</div>
									<div>
										<span class="legend-swatch" style={`background: ${period.colors.High}`}
										></span>High
									</div>
								</div>
							</div>
						{/each}
						<div class="legend boundary-legend">
							<div><span class="legend-swatch boundary"></span>Barangay boundary</div>
						</div>
					</div>
					<p class="selection-source">
						Source: {floodHazardMetadata.source}. {floodHazardMetadata.classification}
					</p>
				{:else if activeHazardFamily === 'storm-surge'}
					<h2>Storm-surge advisories</h2>
					<p>
						Source-provided storm-surge hazard classes. All four advisories are enabled by default.
					</p>
					<div class="period-legends" aria-label="Storm-surge hazard legends">
						{#each stormSurgeAdvisories as advisory (advisory.key)}
							<div class="period-legend">
								<strong>{advisory.shortName}, {advisory.height}</strong>
								<div class="legend">
									<div>
										<span class="legend-swatch" style={`background: ${advisory.colors.Low}`}
										></span>Low
									</div>
									<div>
										<span class="legend-swatch" style={`background: ${advisory.colors.Medium}`}
										></span>Medium
									</div>
									<div>
										<span class="legend-swatch" style={`background: ${advisory.colors.High}`}
										></span>High
									</div>
								</div>
							</div>
						{/each}
						<div class="legend boundary-legend">
							<div><span class="legend-swatch boundary"></span>Barangay boundary</div>
						</div>
					</div>
					<p class="selection-source">
						Source: {stormSurgeMetadata.source}. {stormSurgeMetadata.classification}
					</p>
				{:else if activeHazardFamily === 'landslide'}
					<h2>Landslide hazard</h2>
					<p>Source-provided landslide hazard classes for Calapan City.</p>
					<div class="period-legends" aria-label="Landslide hazard legends">
						{#each landslideHazards as layer (layer.key)}
							<div class="period-legend">
								<strong>{layer.shortName}</strong>
								<div class="legend">
									<div>
										<span class="legend-swatch" style={`background: ${layer.colors.Low}`}></span>Low
									</div>
									<div>
										<span class="legend-swatch" style={`background: ${layer.colors.Medium}`}
										></span>Medium
									</div>
									<div>
										<span class="legend-swatch" style={`background: ${layer.colors.High}`}
										></span>High
									</div>
								</div>
							</div>
						{/each}
						<div class="legend boundary-legend">
							<div><span class="legend-swatch boundary"></span>Barangay boundary</div>
						</div>
					</div>
					<p class="selection-source">
						Source: {landslideMetadata.source}. {landslideMetadata.classification}
					</p>
				{:else}
					<h2>Earthquake hazards</h2>
					<p>
						Official PHIVOLCS vector layers for ground shaking, liquefaction, and tsunami hazard in
						Calapan City.
					</p>
					<div class="period-legends" aria-label="PHIVOLCS earthquake hazard legends">
						{#each seismicHazards as layer (layer.key)}
							<div class="period-legend">
								<strong>{layer.name}</strong>
								<div class="legend">
									{#each layer.classes as item (item.value)}
										<div>
											<span class="legend-swatch" style={`background: ${item.color}`}
											></span>{item.label}
										</div>
									{/each}
								</div>
							</div>
						{/each}
						<div class="legend boundary-legend">
							<div><span class="legend-swatch boundary"></span>Barangay boundary</div>
						</div>
					</div>
					<p class="selection-source">
						Source: {seismicMetadata.source}. {seismicMetadata.classification}
					</p>
					<p class="selection-source">Caveat: {seismicMetadata.caveat}</p>
				{/if}
			</section>

			<section class="info-card selection-card" class:selected={selectedArea} aria-live="polite">
				{#if selectedArea}
					<div class="card-kicker">Selected area</div>
					<h2>{selectedArea.name}</h2>
					<p class="selection-source">
						Source name: {selectedArea.sourceName}. Administrative boundary data.
					</p>
					{#if activeHazardFamily === 'flood'}
						{#each floodHazardPeriods as period (period.key)}
							{@const hazard = selectedArea.floodHazards[period.key]}
							<p class="selection-source">
								{period.shortName} flood hazard: {hazard.summary}.
							</p>
							{#if hazard.classes.length > 0}
								<p class="selection-source">
									Classes mapped: {hazard.classes.join(', ')}.
								</p>
							{/if}
						{/each}
					{:else if activeHazardFamily === 'storm-surge'}
						{#each stormSurgeAdvisories as advisory (advisory.key)}
							{@const hazard = selectedArea.stormSurgeHazards[advisory.key]}
							<p class="selection-source">
								{advisory.shortName} storm surge: {hazard.summary}.
							</p>
							{#if hazard.classes.length > 0}
								<p class="selection-source">
									Classes mapped: {hazard.classes.join(', ')}.
								</p>
							{/if}
						{/each}
					{:else if activeHazardFamily === 'landslide'}
						{#each landslideHazards as layer (layer.key)}
							{@const hazard = selectedArea.landslideHazards[layer.key]}
							<p class="selection-source">
								{layer.name}: {hazard.summary}.
							</p>
							{#if hazard.classes.length > 0}
								<p class="selection-source">
									Classes mapped: {hazard.classes.join(', ')}.
								</p>
							{/if}
						{/each}
					{:else}
						{#each seismicHazards as layer (layer.key)}
							{@const hazard = selectedArea.seismicHazards[layer.key]}
							<p class="selection-source">
								{layer.name}: {hazard.summary}.
							</p>
							{#if hazard.classes.length > 0}
								<p class="selection-source">
									Classes mapped: {hazard.classes.join(', ')}.
								</p>
							{/if}
						{/each}
					{/if}
				{:else}
					<div class="card-kicker">Area details</div>
					<h2>Select an area</h2>
					<p>Click the highlighted area on the map to inspect its available details.</p>
				{/if}
			</section>

			<section class="info-card recent-events">
				<div class="card-heading">
					<div>
						<div class="card-kicker">Official alerts</div>
						<h2>Active advisories</h2>
					</div>
					<span class:unavailable={data.alertFeedStatus === 'unavailable'} class="feed-status">
						{data.alertFeedStatus === 'unavailable' ? 'Unavailable' : 'PAGASA'}
					</span>
				</div>

				{#if data.alertFeedStatus === 'unavailable'}
					<p>No PAGASA alert data is available right now. No alerts are being inferred.</p>
				{:else if data.activeAlerts.length === 0}
					<p>No active PAGASA advisories currently cover Calapan or Oriental Mindoro.</p>
				{:else}
					<ul class="alert-list">
						{#each data.activeAlerts as alert (alert.id)}
							<li
								class:severe={alert.severity.toLowerCase() === 'severe'}
								class:moderate={alert.severity.toLowerCase() === 'moderate'}
							>
								<!-- External source links do not pass through SvelteKit routing. -->
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a href={alert.url} target="_blank" rel="noreferrer">
									<strong>{alert.title}</strong>
									<span>{alert.event}</span>
								</a>
								<small>
									{alert.severity || 'Severity not provided'} ·
									{alert.urgency || 'Urgency not provided'} ·
									{alert.certainty || 'Certainty not provided'}
								</small>
								<small>
									Issued {formatAlertDate(alert.sentAt)} ·
									{alert.expiresAt
										? `Expires ${formatAlertDate(alert.expiresAt)}`
										: 'No expiry provided'}
								</small>
								<small>Area: {alert.localAreas.join(', ') || 'Local area not specified'}</small>
								{#if alert.instruction}
									<p>{alert.instruction}</p>
								{/if}
								<p class="alert-note">
									Official PAGASA advisory. This does not confirm an on-the-ground incident.
								</p>
							</li>
						{/each}
					</ul>
				{/if}

				<p class="selection-source">
					Source:
					<a href="https://publicalert.pagasa.dost.gov.ph/feeds/" target="_blank" rel="noreferrer"
						>PAGASA Public Alert CAP</a
					>. Checked {formatAlertDate(data.alertsFetchedAt)}.
				</p>
			</section>

			<p class="boundary-attribution">{calapanBarangayAttribution}</p>
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
		color: var(--fg-secondary);
		font-size: 0.85rem;
	}

	.period-legends {
		display: grid;
		gap: 0.9rem;
		margin-top: 1.5rem;
	}

	.period-legend strong {
		display: block;
		margin-bottom: 0.45rem;
		color: var(--fg);
		font-size: 0.82rem;
	}

	.period-legend .legend {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem;
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

	.legend-swatch.boundary {
		background: var(--accent);
	}

	.boundary-legend {
		margin-top: 0.2rem;
	}

	.selection-source {
		margin-top: 0.75rem;
		font-size: 0.8rem !important;
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

	.feed-status {
		padding: 0.3rem 0.5rem;
		border-radius: 999px;
		background: var(--neutral-light);
		color: var(--fg-secondary);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.feed-status.unavailable {
		background: #fce8e6;
		color: #9d3a32;
	}

	.alert-list {
		display: grid;
		gap: 0.75rem;
		margin: 1.25rem 0 0;
		padding: 0;
		list-style: none;
	}

	.alert-list li {
		padding-top: 0.75rem;
		border-top: 1px solid var(--gray);
	}

	.alert-list li.severe {
		border-top-color: #eb5757;
	}

	.alert-list li.moderate {
		border-top-color: #f2994a;
	}

	.alert-list a {
		display: grid;
		gap: 0.35rem;
		color: var(--fg);
		text-decoration: none;
	}

	.alert-list a:hover strong,
	.alert-list a:focus-visible strong {
		color: var(--accent-dark);
		text-decoration: underline;
	}

	.alert-list strong {
		font-size: 0.9rem;
		line-height: 1.35;
	}

	.alert-list span,
	.alert-list small {
		color: var(--fg-secondary);
		font-size: 0.75rem;
	}

	.alert-list p {
		margin-top: 0.55rem;
		font-size: 0.82rem !important;
	}

	.alert-list .alert-note {
		color: var(--fg-secondary);
		font-size: 0.76rem !important;
	}

	.alert-list small {
		display: block;
		margin-top: 0.35rem;
	}

	.selection-source a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.15em;
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
