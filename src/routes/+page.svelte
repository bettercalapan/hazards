<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		calapanBarangayAttribution,
		calapanBarangayMetadata,
		searchCalapanBarangays,
		type BarangayProperties
	} from '$lib/data/barangays';
	import { floodHazardMetadata, floodHazardPeriods } from '$lib/data/flood';
	import { formatAlertDate } from '$lib/data/alerts';
	import { stormSurgeAdvisories, stormSurgeMetadata } from '$lib/data/storm-surge';
	import { landslideHazards, landslideMetadata } from '$lib/data/landslide';
	import { seismicHazards, seismicMetadata } from '$lib/data/seismic';
	import { emergencyContacts, safetyGuidance, type HazardFamily } from '$lib/data/safety';
	import { formatDataDate, freshnessLabel, getFreshnessStatus } from '$lib/data/freshness';
	import hazardDataManifest from '$lib/data/hazard-data-manifest.json';
	import { typhoonSourceUrl } from '$lib/data/typhoon';
	import logo from '$lib/assets/logo.svg';
	import HazardMap from '$lib/components/HazardMap.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedArea = $state<BarangayProperties | null>(null);
	let selectedBarangayId = $state<string | null>(null);
	let barangayQuery = $state('');
	let barangaySearchOpen = $state(false);
	let highlightedBarangayIndex = $state(0);
	let activeHazardFamily = $state<HazardFamily>('flood');
	let barangayMatches = $derived(searchCalapanBarangays(barangayQuery).slice(0, 8));
	let activeSafetyGuidance = $derived(safetyGuidance[activeHazardFamily]);
	const hazardMetadataByFamily = {
		flood: floodHazardMetadata,
		'storm-surge': stormSurgeMetadata,
		landslide: landslideMetadata,
		earthquake: seismicMetadata
	} as const;
	let activeHazardMetadata = $derived(
		activeHazardFamily === 'typhoon'
			? null
			: hazardMetadataByFamily[activeHazardFamily as Exclude<HazardFamily, 'typhoon'>]
	);
	let activeHazardFreshness = $derived(
		activeHazardMetadata ? getFreshnessStatus(activeHazardMetadata.sourceDate) : 'unknown'
	);
	let alertsFreshness = $derived(
		data.alertFeedStatus === 'unavailable'
			? ('unavailable' as const)
			: getFreshnessStatus(data.alertsSourceUpdatedAt)
	);
	let typhoonFreshness = $derived(
		data.typhoonTrackStatus === 'unavailable'
			? ('unavailable' as const)
			: getFreshnessStatus(data.typhoonMapData.latestDataAt)
	);

	function handleAreaSelect(area: BarangayProperties | null) {
		selectedArea = area;
		selectedBarangayId = area?.id ?? null;
		barangayQuery = area?.name ?? '';
		barangaySearchOpen = false;
		highlightedBarangayIndex = 0;
	}

	function handleBarangaySearchInput(event: Event) {
		barangayQuery = (event.currentTarget as HTMLInputElement).value;
		barangaySearchOpen = true;
		highlightedBarangayIndex = 0;
	}

	function selectSearchBarangay(area: BarangayProperties) {
		selectedArea = area;
		selectedBarangayId = area.id;
		barangayQuery = area.name;
		barangaySearchOpen = false;
		highlightedBarangayIndex = 0;
	}

	function clearBarangaySearch() {
		selectedArea = null;
		selectedBarangayId = null;
		barangayQuery = '';
		barangaySearchOpen = false;
		highlightedBarangayIndex = 0;
	}

	function handleBarangaySearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			barangaySearchOpen = false;
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			barangaySearchOpen = true;
			if (barangayMatches.length > 0) {
				highlightedBarangayIndex = Math.min(
					highlightedBarangayIndex + 1,
					barangayMatches.length - 1
				);
			}
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (barangayMatches.length > 0) {
				highlightedBarangayIndex = Math.max(highlightedBarangayIndex - 1, 0);
			}
			return;
		}
		if (event.key === 'Enter' && barangaySearchOpen && barangayMatches.length > 0) {
			event.preventDefault();
			selectSearchBarangay(barangayMatches[highlightedBarangayIndex]);
		}
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
		<HazardMap
			typhoonMapData={data.typhoonMapData}
			{selectedBarangayId}
			onSelectArea={handleAreaSelect}
			onHazardFamilyChange={handleHazardFamilyChange}
		/>
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

			<section class="info-card search-card">
				<label class="search-label" for="barangay-search">Find a barangay</label>
				<div class="search-input-wrap">
					<input
						id="barangay-search"
						value={barangayQuery}
						placeholder="Search by name"
						role="combobox"
						aria-autocomplete="list"
						aria-controls="barangay-search-results"
						aria-expanded={barangaySearchOpen && barangayMatches.length > 0}
						aria-activedescendant={barangaySearchOpen && barangayMatches.length > 0
							? `barangay-result-${barangayMatches[highlightedBarangayIndex].id}`
							: undefined}
						oninput={handleBarangaySearchInput}
						onkeydown={handleBarangaySearchKeydown}
						onfocus={() => (barangaySearchOpen = barangayMatches.length > 0)}
						onblur={() => setTimeout(() => (barangaySearchOpen = false), 100)}
					/>
					{#if barangayQuery}
						<button
							class="search-clear"
							type="button"
							aria-label="Clear barangay search"
							onclick={clearBarangaySearch}
						>
							Clear
						</button>
					{/if}
				</div>
				{#if barangaySearchOpen && barangayMatches.length > 0}
					<div id="barangay-search-results" class="search-results" role="listbox">
						{#each barangayMatches as barangay, index (barangay.id)}
							<button
								id={`barangay-result-${barangay.id}`}
								class:highlighted={highlightedBarangayIndex === index}
								class="search-result"
								role="option"
								aria-selected={selectedBarangayId === barangay.id}
								type="button"
								onclick={() => selectSearchBarangay(barangay)}
								onmouseenter={() => (highlightedBarangayIndex = index)}
							>
								{barangay.name}
							</button>
						{/each}
					</div>
				{:else if barangaySearchOpen && barangayQuery.trim()}
					<p class="search-empty" role="status">No barangays found.</p>
				{/if}
			</section>
			<section class="info-card active-layer">
				<div class="card-kicker">
					<span class="layer-dot"></span>
					{activeHazardFamily === 'flood'
						? 'Flood layers'
						: activeHazardFamily === 'storm-surge'
							? 'Storm-surge layers'
							: activeHazardFamily === 'landslide'
								? 'Landslide layers'
								: activeHazardFamily === 'earthquake'
									? 'Ground-shaking layers'
									: 'Typhoon track'}
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
				{:else if activeHazardFamily === 'earthquake'}
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
				{:else}
					<h2>Typhoon track proximity</h2>
					{#if data.typhoonTrackStatus === 'unavailable'}
						<p>No PANaHON typhoon track data is available right now.</p>
					{:else if data.typhoonMapData.names.length === 0}
						<p>No active PANaHON typhoon track currently covers the map.</p>
					{:else}
						<p>
							Squares show distance from the PANaHON track for
							{data.typhoonMapData.names.join(', ')}.
						</p>
						<div class="period-legends" aria-label="Typhoon track proximity legend">
							<div class="legend">
								<div><span class="legend-swatch typhoon-lpa"></span>LPA</div>
								<div><span class="legend-swatch typhoon-td"></span>TD</div>
								<div><span class="legend-swatch typhoon-ts"></span>TS</div>
								<div><span class="legend-swatch typhoon-sts"></span>STS</div>
								<div><span class="legend-swatch typhoon-ty"></span>TY</div>
								<div><span class="legend-swatch typhoon-sty"></span>STY</div>
							</div>
						</div>
					{/if}
					<p class="selection-source">
						Source:
						<!-- External source links do not pass through SvelteKit routing. -->
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a href={typhoonSourceUrl} target="_blank" rel="noreferrer">PANaHON cyclone track</a>.
						{#if data.typhoonTrackStatus === 'unavailable'}
							The feed could not be checked.
						{:else}
							Source updated
							{data.typhoonMapData.latestDataAt
								? formatAlertDate(data.typhoonMapData.latestDataAt)
								: 'not provided'}. Checked {formatAlertDate(data.typhoonFetchedAt)}.
						{/if}
					</p>
					<p class="selection-source">
						Caveat: Colors show PANaHON cyclone type. Opacity shows distance from the track, not
						wind speed or damage.
					</p>
				{/if}
				{#if activeHazardFamily === 'typhoon'}
					<p class="data-freshness">
						<span
							class="freshness-badge"
							class:stale={typhoonFreshness === 'stale'}
							class:unknown={typhoonFreshness === 'unknown'}
							class:unavailable={typhoonFreshness === 'unavailable'}
						>
							{typhoonFreshness === 'unavailable'
								? 'Unavailable'
								: freshnessLabel(typhoonFreshness)}
						</span>
						{#if typhoonFreshness === 'unavailable'}
							PANaHON track feed could not be checked.
						{:else if data.typhoonMapData.latestDataAt}
							Source updated {formatAlertDate(data.typhoonMapData.latestDataAt)}.
						{:else}
							Source update not provided.
						{/if}
					</p>
				{:else}
					<p class="data-freshness">
						<span
							class="freshness-badge"
							class:stale={activeHazardFreshness === 'stale'}
							class:unknown={activeHazardFreshness === 'unknown'}
						>
							{freshnessLabel(activeHazardFreshness)}
						</span>
						Source date: {formatDataDate(activeHazardMetadata?.sourceDate ?? null)}.
						{#if activeHazardFreshness === 'stale'}
							This dataset may need review.
						{/if}
					</p>
					<p class="provenance-note">
						{activeHazardMetadata?.sourceDateNote} Coverage: {activeHazardMetadata?.coverage}
						Prepared in app: {formatDataDate(hazardDataManifest.generatedAt)}.
					</p>
				{/if}
			</section>

			<section class="info-card safety-card" aria-labelledby="safety-heading">
				<div class="card-kicker">Safety guidance</div>
				<h2 id="safety-heading">{activeSafetyGuidance.title}</h2>
				<p>{activeSafetyGuidance.summary}</p>
				<ul class="safety-list">
					{#each activeSafetyGuidance.actions as action (action)}
						<li>{action}</li>
					{/each}
				</ul>
				<p class="selection-source">
					Based on
					<!-- External source links do not pass through SvelteKit routing. -->
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={activeSafetyGuidance.sourceUrl} target="_blank" rel="noreferrer"
						>{activeSafetyGuidance.sourceLabel}</a
					>. General guidance only. Follow current instructions from local authorities.
				</p>
			</section>

			<section class="info-card emergency-card" aria-labelledby="emergency-heading">
				<div class="card-kicker">Emergency contacts</div>
				<h2 id="emergency-heading">Get help or official information</h2>
				<div class="contact-list">
					{#each emergencyContacts as contact (contact.value)}
						<div class="contact-row">
							<div>
								<strong>{contact.label}</strong>
								<span>{contact.note}</span>
							</div>
							<!-- Telephone links do not pass through SvelteKit routing. -->
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<a class="contact-value" href={contact.href}>{contact.value}</a>
						</div>
						<p class="selection-source contact-source">
							Source:
							<!-- External source links do not pass through SvelteKit routing. -->
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<a href={contact.sourceUrl} target="_blank" rel="noreferrer">{contact.sourceLabel}</a
							>.
						</p>
					{/each}
				</div>
			</section>

			<section class="info-card selection-card" class:selected={selectedArea} aria-live="polite">
				{#if selectedArea}
					<div class="card-kicker">Selected area</div>
					<h2>{selectedArea.name}</h2>
					<p class="selection-source">
						Source name: {selectedArea.sourceName}. Administrative boundary data.
					</p>
					<p class="provenance-note">
						{calapanBarangayMetadata.sourceDateNote} Coverage: {calapanBarangayMetadata.coverage}
						Prepared in app: {formatDataDate(calapanBarangayMetadata.preparedAt)}.
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
					{:else if activeHazardFamily === 'earthquake'}
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
					{:else}
						<p class="selection-source">
							Typhoon track proximity is shown on the map and does not provide barangay-level hazard
							classifications.
						</p>
					{/if}
					{#if activeHazardFamily !== 'typhoon'}
						<p class="data-freshness selection-freshness">
							<span
								class="freshness-badge"
								class:stale={activeHazardFreshness === 'stale'}
								class:unknown={activeHazardFreshness === 'unknown'}
							>
								{freshnessLabel(activeHazardFreshness)}
							</span>
							Source date: {formatDataDate(activeHazardMetadata?.sourceDate ?? null)}.
						</p>
						<p class="provenance-note">
							{activeHazardMetadata?.sourceDateNote} Prepared in app:
							{formatDataDate(hazardDataManifest.generatedAt)}.
						</p>
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
					<span
						class="feed-status"
						class:stale={alertsFreshness === 'stale'}
						class:unavailable={alertsFreshness === 'unavailable'}
					>
						{alertsFreshness === 'unavailable'
							? 'Unavailable'
							: `PAGASA · ${freshnessLabel(alertsFreshness)}`}
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
					>.
					{#if data.alertFeedStatus === 'unavailable'}
						The feed could not be checked.
					{:else}
						Source updated
						{data.alertsSourceUpdatedAt
							? formatAlertDate(data.alertsSourceUpdatedAt)
							: 'not provided'}. Checked {formatAlertDate(data.alertsFetchedAt)}.
					{/if}
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

	.card-kicker {
		margin-bottom: 0.75rem;
		color: var(--accent-dark);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
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

	.safety-card {
		border-color: #b8d8c7;
		background: #f6fbf7;
	}

	.safety-list {
		display: grid;
		gap: 0.6rem;
		margin: 1rem 0 0;
		padding-left: 1.15rem;
		color: var(--fg-secondary);
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.emergency-card {
		border-color: #e5c995;
		background: #fffaf0;
	}

	.contact-list {
		display: grid;
		gap: 0.85rem;
		margin-top: 1rem;
	}

	.contact-row {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	.contact-row strong,
	.contact-row span {
		display: block;
	}

	.contact-row strong {
		margin-bottom: 0.25rem;
		font-size: 0.88rem;
	}

	.contact-row span {
		max-width: 15rem;
		color: var(--fg-secondary);
		font-size: 0.78rem;
		line-height: 1.4;
	}

	.contact-value {
		flex: 0 0 auto;
		color: var(--accent-dark);
		font-size: 1rem;
		font-weight: 800;
		text-decoration: none;
		white-space: nowrap;
	}

	.contact-value:hover,
	.contact-value:focus-visible {
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.contact-source {
		margin-top: 0.35rem !important;
		padding-top: 0.5rem;
		border-top: 1px solid rgb(71 101 99 / 16%);
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

	.search-label {
		display: block;
		margin-bottom: 0.65rem;
		color: var(--fg);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.search-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.search-input-wrap input {
		width: 100%;
		min-width: 0;
		border: 1px solid var(--gray);
		border-radius: 0.5rem;
		padding: 0.7rem 0.8rem;
		background: var(--neutral-lightest);
		color: var(--fg);
		font: inherit;
		font-size: 0.9rem;
	}

	.search-input-wrap input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.search-clear {
		flex: 0 0 auto;
		border: 0;
		padding: 0.35rem 0;
		background: transparent;
		color: var(--fg-secondary);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}

	.search-clear:hover,
	.search-clear:focus-visible {
		color: var(--accent-dark);
		text-decoration: underline;
	}

	.search-results {
		display: grid;
		gap: 0.2rem;
		max-height: 14rem;
		margin-top: 0.5rem;
		overflow-y: auto;
		padding: 0.25rem;
		border: 1px solid var(--gray);
		border-radius: 0.5rem;
		background: var(--neutral-lightest);
	}

	.search-result {
		border: 0;
		border-radius: 0.35rem;
		padding: 0.55rem 0.6rem;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 0.85rem;
		text-align: left;
		cursor: pointer;
	}

	.search-result:hover,
	.search-result.highlighted,
	.search-result:focus-visible {
		background: var(--neutral-light);
		color: var(--accent-dark);
	}

	.search-empty {
		margin: 0.6rem 0 0 !important;
		font-size: 0.8rem !important;
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

	.legend-swatch.typhoon-lpa {
		background: #9aa5b1;
	}

	.legend-swatch.typhoon-td {
		background: #00e400;
	}

	.legend-swatch.typhoon-ts {
		background: #ffe400;
	}

	.legend-swatch.typhoon-sts {
		background: #ff9800;
	}

	.legend-swatch.typhoon-ty {
		background: #ff2020;
	}

	.legend-swatch.typhoon-sty {
		background: #e000e0;
	}

	.boundary-legend {
		margin-top: 0.2rem;
	}

	.selection-source {
		margin-top: 0.75rem;
		font-size: 0.8rem !important;
	}

	.data-freshness {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 1rem;
		color: var(--fg-secondary);
		font-size: 0.78rem !important;
		line-height: 1.4;
	}

	.freshness-badge {
		padding: 0.25rem 0.45rem;
		border-radius: 999px;
		background: #e5f3e9;
		color: #2c7047;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.freshness-badge.stale,
	.feed-status.stale {
		background: #fff0d6;
		color: #8a5a16;
	}

	.freshness-badge.unknown {
		background: #eef1f0;
		color: #61716d;
	}

	.freshness-badge.unavailable,
	.feed-status.unavailable {
		background: #fce8e6;
		color: #9d3a32;
	}

	.selection-freshness {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--gray);
	}

	.provenance-note {
		margin-top: 0.55rem;
		color: var(--fg-secondary);
		font-size: 0.72rem !important;
		line-height: 1.45;
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
	}

	@media (min-width: 851px) {
		.app-shell,
		.map-pane,
		.sidebar {
			height: 100%;
		}
	}
</style>
