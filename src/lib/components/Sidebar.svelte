<script lang="ts">
	import type { BarangayProperties } from '$lib/data/barangays';
	import type { HazardFamily } from '$lib/map-state';

	import { resolve } from '$app/paths';
	import logo from '$lib/assets/logo.svg';
	import { calapanBarangayAttribution } from '$lib/data/barangays';
	import { floodHazardMetadata, floodHazardPeriods } from '$lib/data/flood';
	import { landslideHazards, landslideMetadata } from '$lib/data/landslide';
	import { safetyGuidance } from '$lib/data/safety';
	import { seismicHazards, seismicMetadata } from '$lib/data/seismic';
	import { stormSurgeAdvisories, stormSurgeMetadata } from '$lib/data/storm-surge';
	import { typhoonCategories, typhoonMetadata } from '$lib/data/typhoon';
	import Check from '@lucide/svelte/icons/check';
	import Link from '@lucide/svelte/icons/link';
	import X from '@lucide/svelte/icons/x';
	import Attribution from './Attribution.svelte';

	type Props = {
		selectedArea: BarangayProperties | null;
		activeHazardFamily: HazardFamily;
		mobileSidebarOpen: boolean;
		shareStatus: 'idle' | 'copied' | 'error';
		copyMapLink: () => void;
		typhoonTrackStatus: 'ready' | 'unavailable';
		typhoonNames: readonly string[];
	};

	let {
		selectedArea,
		activeHazardFamily,
		mobileSidebarOpen,
		shareStatus,
		copyMapLink,
		typhoonTrackStatus,
		typhoonNames
	}: Props = $props();

	let activeSafetyGuidance = $derived(safetyGuidance[activeHazardFamily]);
	let activeHazardSource = $derived(
		activeHazardFamily === 'flood'
			? floodHazardMetadata
			: activeHazardFamily === 'storm-surge'
				? stormSurgeMetadata
				: activeHazardFamily === 'landslide'
					? landslideMetadata
					: activeHazardFamily === 'earthquake'
						? seismicMetadata
						: typhoonMetadata
	);
	const hazardClassLevels = ['Low', 'Medium', 'High'] as const;

	function summaryBackground(colors: string[]) {
		return colors.length > 1
			? `linear-gradient(90deg, ${colors.join(', ')})`
			: (colors[0] ?? 'var(--gray)');
	}
</script>

<aside
	id="hazard-information"
	class="sidebar"
	class:mobile-open={mobileSidebarOpen}
	tabindex="-1"
	aria-label="Hazard information"
>
	<div class="sidebar-inner">
		<div class="brand-row">
			<a class="brand-link" href={resolve('/')} aria-label="Go to Hazards home">
				<img src={logo} alt="" width="36" height="36" />
				<span>BetterCalapan</span>
			</a>
			<button
				class="share-button"
				aria-label={shareStatus === 'copied'
					? 'Map link copied'
					: shareStatus === 'error'
						? 'Copy map link failed'
						: 'Copy map link'}
				type="button"
				onclick={copyMapLink}
			>
				<span class="icon">
					{#if shareStatus === 'copied'}
						<Check />
					{:else if shareStatus === 'error'}
						<X />
					{:else}
						<Link />
					{/if}
				</span>
			</button>
		</div>

		<section class="info-card selection-card" aria-live="polite">
			{#if selectedArea}
				<h2>{selectedArea.name}</h2>
				{#if activeHazardFamily === 'flood'}
					{#each floodHazardPeriods as period (period.key)}
						{@const hazard = selectedArea.floodHazards[period.key]}
						{@const summaryColors = hazard.classes.map((hazardClass) => period.colors[hazardClass])}
						<div class="period">
							<p class="period-label">
								{period.shortName}
							</p>
							<div
								class="period-pill-summary"
								style={`background: ${summaryBackground(summaryColors)}`}
							></div>
						</div>
						{#if hazard.classes.length > 0}
							<div class="period-classes">
								{#each hazard.classes as hazardClass (hazardClass)}
									<p>
										<span class="legend-swatch" style={`background: ${period.colors[hazardClass]}`}
										></span>{hazardClass}
									</p>
								{/each}
							</div>
						{:else}
							<div class="period-classes">
								<p>
									<span class="legend-swatch" style="background: var(--gray)"></span>
									No data
								</p>
							</div>
						{/if}
					{/each}
				{:else if activeHazardFamily === 'storm-surge'}
					{#each stormSurgeAdvisories as advisory (advisory.key)}
						{@const hazard = selectedArea.stormSurgeHazards[advisory.key]}
						{@const summaryColors = hazard.classes.map(
							(hazardClass) => advisory.colors[hazardClass]
						)}
						<div class="period">
							<p class="period-label">{advisory.shortName}, {advisory.height}</p>
							<div
								class="period-pill-summary"
								style={`background: ${summaryBackground(summaryColors)}`}
							></div>
						</div>
						{#if hazard.classes.length > 0}
							<div class="period-classes">
								{#each hazard.classes as hazardClass (hazardClass)}
									<p>
										<span
											class="legend-swatch"
											style={`background: ${advisory.colors[hazardClass]}`}
										></span>{hazardClass}
									</p>
								{/each}
							</div>
						{:else}
							<div class="period-classes">
								<p>
									<span class="legend-swatch" style="background: var(--gray)"></span>
									No data
								</p>
							</div>
						{/if}
					{/each}
				{:else if activeHazardFamily === 'landslide'}
					{#each landslideHazards as layer (layer.key)}
						{@const hazard = selectedArea.landslideHazards[layer.key]}
						{@const summaryColors = hazard.classes.map((hazardClass) => layer.colors[hazardClass])}
						<div class="period">
							<p class="period-label">{layer.shortName}</p>
							<div
								class="period-pill-summary"
								style={`background: ${summaryBackground(summaryColors)}`}
							></div>
						</div>
						{#if hazard.classes.length > 0}
							<div class="period-classes">
								{#each hazard.classes as hazardClass (hazardClass)}
									<p>
										<span class="legend-swatch" style={`background: ${layer.colors[hazardClass]}`}
										></span>{hazardClass}
									</p>
								{/each}
							</div>
						{:else}
							<div class="period-classes">
								<p>
									<span class="legend-swatch" style="background: var(--gray)"></span>
									No data
								</p>
							</div>
						{/if}
					{/each}
				{:else if activeHazardFamily === 'earthquake'}
					{#each seismicHazards as layer (layer.key)}
						{@const hazard = selectedArea.seismicHazards[layer.key]}
						{@const summaryColors = hazard.classes.map(
							(hazardClass) =>
								layer.classes.find((item) => item.label === hazardClass)?.color ?? 'var(--gray)'
						)}
						<div class="period">
							<p class="period-label">{layer.name}</p>
							<div
								class="period-pill-summary"
								style={`background: ${summaryBackground(summaryColors)}`}
							></div>
						</div>
						{#if hazard.classes.length > 0}
							<div class="period-classes">
								{#each hazard.classes as hazardClass (hazardClass)}
									{@const classColor =
										layer.classes.find((item) => item.label === hazardClass)?.color ??
										'var(--gray)'}
									<p>
										<span class="legend-swatch" style={`background: ${classColor}`}
										></span>{hazardClass}
									</p>
								{/each}
							</div>
						{:else}
							<div class="period-classes">
								<p>
									<span class="legend-swatch" style="background: var(--gray)"></span>
									No data
								</p>
							</div>
						{/if}
					{/each}
				{:else}
					<p class="selection-source">
						Typhoon track proximity is shown on the map and does not provide barangay-level hazard
						classifications.
					</p>
				{/if}
				<Attribution source={activeHazardSource.source} sourceUrl={activeHazardSource.sourceUrl} />
			{:else}
				<h2>Select an area</h2>
				<p>Click an area on the map to inspect its available details.</p>
				<p class="boundary-attribution">
					{calapanBarangayAttribution}
				</p>
			{/if}
		</section>

		<section class="info-card active-layer">
			{#if activeHazardFamily === 'flood'}
				<h2>Flood hazard periods</h2>
				<p>
					Source-provided flood hazard classes for three return periods. All periods are enabled by
					default.
				</p>
				<div class="period-legends" aria-label="Flood hazard legends">
					{#each floodHazardPeriods as period (period.key)}
						<div class="period-legend">
							<strong>{period.shortName}</strong>
							<div class="legend">
								{#each hazardClassLevels as level (level)}
									<div>
										<span class="legend-swatch" style={`background: ${period.colors[level]}`}
										></span>{level}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
				<Attribution
					source={floodHazardMetadata.source}
					sourceUrl={floodHazardMetadata.sourceUrl}
				/>
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
								{#each hazardClassLevels as level (level)}
									<div>
										<span class="legend-swatch" style={`background: ${advisory.colors[level]}`}
										></span>{level}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
				<Attribution source={stormSurgeMetadata.source} sourceUrl={stormSurgeMetadata.sourceUrl} />
			{:else if activeHazardFamily === 'landslide'}
				<h2>Landslide hazard</h2>
				<p>Source-provided landslide hazard classes for Calapan City.</p>
				<div class="period-legends" aria-label="Landslide hazard legends">
					{#each landslideHazards as layer (layer.key)}
						<div class="period-legend">
							<strong>{layer.shortName}</strong>
							<div class="legend">
								{#each hazardClassLevels as level (level)}
									<div>
										<span class="legend-swatch" style={`background: ${layer.colors[level]}`}
										></span>{level}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
				<Attribution source={landslideMetadata.source} sourceUrl={landslideMetadata.sourceUrl} />
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
				</div>
				<Attribution source={seismicMetadata.source} sourceUrl={seismicMetadata.sourceUrl} />
			{:else}
				<h2>Typhoon track proximity</h2>
				{#if typhoonTrackStatus === 'unavailable'}
					<p>No PANaHON typhoon track data is available right now.</p>
				{:else if typhoonNames.length === 0}
					<p>No active PANaHON typhoon track currently covers the map.</p>
				{:else}
					<p>
						Squares show distance from the PANaHON track for
						{typhoonNames.join(', ')}.
					</p>
					<div class="period-legends" aria-label="Typhoon track proximity legend">
						<div class="legend">
							{#each typhoonCategories as category (category.key)}
								<div>
									<span class="legend-swatch" style={`background: ${category.color}`}
									></span>{category.key}
								</div>
							{/each}
						</div>
					</div>
				{/if}
				<Attribution source={typhoonMetadata.source} sourceUrl={typhoonMetadata.sourceUrl} />
			{/if}
		</section>

		<section class="info-card safety-card" aria-labelledby="safety-heading">
			<h2 id="safety-heading">Safety measures</h2>
			<p>{activeSafetyGuidance.summary}</p>
			<ul class="safety-list">
				{#each activeSafetyGuidance.actions as action (action)}
					<li>{action}</li>
				{/each}
			</ul>
			<p class="safety-note">
				General guidance only. Follow current instructions from local authorities.
			</p>
		</section>
	</div>
</aside>

<style>
	.sidebar {
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		border-left: 1px solid var(--gray);
		background: var(--bg);
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
		gap: 0.75rem;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.brand-link img {
		border-radius: 0.65rem;
	}

	.share-button {
		padding: 0;
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border: 1px solid var(--gray);
		border-radius: 50%;
		background: var(--bg);
		color: var(--fg);
		font-size: 0.75rem;
		font-weight: 700;

		.icon {
			width: 16px;
			aspect-ratio: 1 / 1;
		}
	}

	.share-button:hover {
		border-color: var(--fg);
		background: var(--fg);
		color: var(--bg);
	}

	.info-card {
		padding: 1.5rem;
		border-radius: 0.75rem;
		background: var(--neutral-light);
	}

	.info-card + .info-card {
		margin-top: 1rem;
	}

	.safety-list {
		display: grid;
		gap: 0.6rem;
		margin: 1rem 0 0;
		padding-left: 1.15rem;
		color: var(--fg-secondary);
		line-height: 1.45;
	}

	.safety-note {
		margin-top: 1rem;
	}

	.selection-card .period {
		margin-top: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.selection-card .period-label {
		font-weight: 700;
	}

	.selection-card .period-pill-summary {
		width: 12px;
		height: 12px;
		border-radius: 1rem;
	}

	.selection-card .period-classes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		margin-top: 0.5rem;
	}

	.selection-card .period-classes p {
		display: grid;
		grid-template-columns: 24px 1fr;
		align-items: center;
		gap: 0.5rem;
		color: var(--fg-secondary);
		font-size: 1rem;
	}

	h2 {
		margin-bottom: 0.75rem;
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.info-card p {
		color: var(--fg-secondary);
		font-size: 1rem;
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		color: var(--fg-secondary);
		font-size: 1rem;

		div {
			display: grid;
			grid-template-columns: 24px 1fr;
			align-items: center;
			gap: 0.5rem;
		}
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
		font-size: 1rem;
	}

	.period-legend .legend {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
	}

	.legend-swatch {
		width: 1.5rem;
		height: 0.625rem;
		border-radius: 2rem;
	}

	.boundary-attribution {
		margin-top: 1rem;
	}

	@media (max-width: 899px) {
		.sidebar {
			position: absolute;
			inset: auto 0 0;
			z-index: 10;
			max-height: 50dvh;
			border: 1px solid var(--gray);
			border-bottom: 0;
			border-radius: 1.25rem 1.25rem 0 0;
			box-shadow: 0 -1rem 2rem rgb(30 56 55 / 18%);
			transform: translateY(100%);
			visibility: hidden;
			transition:
				transform 220ms ease-out,
				visibility 0s linear 220ms;
		}

		.sidebar.mobile-open {
			transform: translateY(0);
			visibility: visible;
			transition:
				transform 220ms ease-out,
				visibility 0s linear 0s;
		}

		.sidebar-inner {
			padding: 1rem 1rem 5rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sidebar {
			transition: none;
		}
	}

	@media (min-width: 900px) and (max-width: 1100px) {
		.sidebar-inner {
			padding: 1.25rem;
		}
	}

	@media (min-width: 900px) {
		.sidebar {
			height: 100%;
		}
	}
</style>
