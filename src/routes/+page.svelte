<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount, untrack } from 'svelte';
	import {
		calapanBarangayAttribution,
		loadCalapanBarangays,
		searchCalapanBarangays,
		type BarangayCollection,
		type BarangayProperties
	} from '$lib/data/barangays';
	import { floodHazardMetadata, floodHazardPeriods, type ReturnPeriod } from '$lib/data/flood';
	import {
		stormSurgeAdvisories,
		stormSurgeMetadata,
		type StormSurgeAdvisory
	} from '$lib/data/storm-surge';
	import { landslideHazards, landslideMetadata, type LandslideLayer } from '$lib/data/landslide';
	import { seismicHazards, seismicMetadata, type SeismicLayer } from '$lib/data/seismic';
	import { safetyGuidance } from '$lib/data/safety';
	import { typhoonMetadata, typhoonSourceUrl } from '$lib/data/typhoon';
	import logo from '$lib/assets/logo.svg';
	import HazardMap from '$lib/components/HazardMap.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import {
		serializeMapShareState,
		type HazardFamily,
		type MapShareState,
		type ViewMode
	} from '$lib/map-state';
	import type { PageData } from './$types';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import Info from '@lucide/svelte/icons/info';
	import Link from '@lucide/svelte/icons/link';
	import X from '@lucide/svelte/icons/x';

	let { data }: { data: PageData } = $props();
	const initialMapState = untrack(() => data.initialMapState);

	let selectedArea = $state<BarangayProperties | null>(null);
	let selectedBarangayId = $state<string | null>(initialMapState.selectedBarangayId);
	let barangayQuery = $state('');
	let barangaySearchOpen = $state(false);
	let highlightedBarangayIndex = $state(0);
	let barangays = $state<BarangayCollection | null>(null);
	let barangaySearchInput: HTMLInputElement;
	let barangaySearchBlurTimeout: ReturnType<typeof setTimeout> | undefined;
	let mapShareState = $state<MapShareState>(initialMapState);
	let activeHazardFamily = $derived(mapShareState.activeHazardFamily);
	let shareStatus = $state<'idle' | 'copied' | 'error'>('idle');
	let shareStatusResetTimeout: ReturnType<typeof setTimeout> | undefined;
	let hasInitializedSeismicLayers = $state(initialMapState.activeHazardFamily === 'earthquake');
	let criticalFacilitiesEnabled = $state(false);
	let criticalFacilitiesState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let mobileSidebarOpen = $state(false);
	let mobileControlsOpen = $state(false);
	let preloadHazardFamily = $state<(family: HazardFamily) => void>(() => {});
	let barangayMatches = $derived(
		barangays ? searchCalapanBarangays(barangays, barangayQuery).slice(0, 8) : []
	);
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

	function updateMapUrl(state: MapShareState) {
		// resolve() is used for the app base path, then the query string is replaced in place.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		replaceState(`${resolve('/')}${serializeMapShareState(state)}`, {});
	}

	function updateMapState(nextState: Partial<MapShareState>) {
		mapShareState = { ...mapShareState, ...nextState };
		updateMapUrl(mapShareState);
	}

	function updateSelectedArea(area: BarangayProperties | null) {
		selectedArea = area;
		selectedBarangayId = area?.id ?? null;
		barangayQuery = area?.name ?? '';
		barangaySearchOpen = false;
		highlightedBarangayIndex = 0;
		updateMapState({ selectedBarangayId });
	}

	function handleBarangaySearchInput(event: Event) {
		if (barangaySearchBlurTimeout) clearTimeout(barangaySearchBlurTimeout);
		barangayQuery = (event.currentTarget as HTMLInputElement).value;
		barangaySearchOpen = true;
		highlightedBarangayIndex = 0;
	}

	function handleBarangaySearchFocus() {
		barangaySearchOpen = barangayMatches.length > 0;
	}

	function handleBarangaySearchFocusOut(event: FocusEvent) {
		const search = event.currentTarget;
		const nextTarget = event.relatedTarget;
		if (
			search instanceof HTMLElement &&
			nextTarget instanceof Node &&
			search.contains(nextTarget)
		) {
			return;
		}
		if (barangaySearchBlurTimeout) clearTimeout(barangaySearchBlurTimeout);
		barangaySearchBlurTimeout = setTimeout(() => {
			barangaySearchOpen = false;
		}, 100);
	}

	function selectSearchBarangay(area: BarangayProperties) {
		updateSelectedArea(area);
		barangaySearchInput?.focus();
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

	function setViewMode(viewMode: ViewMode) {
		updateMapState({ viewMode });
	}

	function setHazardFamily(activeHazardFamily: HazardFamily) {
		if (activeHazardFamily === mapShareState.activeHazardFamily) return;
		const nextState: Partial<MapShareState> = { activeHazardFamily };
		if (activeHazardFamily === 'earthquake' && !hasInitializedSeismicLayers) {
			nextState.enabledSeismicLayers = seismicHazards.map((layer) => layer.key);
			hasInitializedSeismicLayers = true;
		}
		updateMapState(nextState);
	}

	function setFloodPeriodEnabled(period: ReturnPeriod, enabled: boolean) {
		updateMapState({
			enabledFloodPeriods: enabled
				? [...new Set([...mapShareState.enabledFloodPeriods, period])]
				: mapShareState.enabledFloodPeriods.filter((value) => value !== period)
		});
	}

	function setStormSurgeAdvisoryEnabled(advisory: StormSurgeAdvisory, enabled: boolean) {
		updateMapState({
			enabledStormSurgeAdvisories: enabled
				? [...new Set([...mapShareState.enabledStormSurgeAdvisories, advisory])]
				: mapShareState.enabledStormSurgeAdvisories.filter((value) => value !== advisory)
		});
	}

	function setLandslideLayerEnabled(layer: LandslideLayer, enabled: boolean) {
		updateMapState({
			enabledLandslideLayers: enabled
				? [...new Set([...mapShareState.enabledLandslideLayers, layer])]
				: mapShareState.enabledLandslideLayers.filter((value) => value !== layer)
		});
	}

	function setSeismicLayerEnabled(layer: SeismicLayer, enabled: boolean) {
		updateMapState({
			enabledSeismicLayers: enabled
				? [...new Set([...mapShareState.enabledSeismicLayers, layer])]
				: mapShareState.enabledSeismicLayers.filter((value) => value !== layer)
		});
	}

	function toggleCriticalFacilities() {
		criticalFacilitiesEnabled = !criticalFacilitiesEnabled;
	}

	function toggleMobileSidebar() {
		mobileSidebarOpen = !mobileSidebarOpen;
		mobileControlsOpen = false;
	}

	function toggleMobileControls() {
		mobileControlsOpen = !mobileControlsOpen;
		mobileSidebarOpen = false;
	}

	async function copyMapLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			shareStatus = 'copied';
		} catch {
			shareStatus = 'error';
		}
		if (shareStatusResetTimeout) clearTimeout(shareStatusResetTimeout);
		shareStatusResetTimeout = setTimeout(() => {
			shareStatus = 'idle';
			shareStatusResetTimeout = undefined;
		}, 2000);
	}

	onMount(() => {
		loadCalapanBarangays()
			.then((data) => {
				barangays = data;
				const initialAreaId = mapShareState.selectedBarangayId;
				if (!initialAreaId) return;

				const initialArea = data.features.find(
					(feature) => feature.properties.id === initialAreaId
				)?.properties;
				if (initialArea) {
					selectedArea = initialArea;
					barangayQuery = initialArea.name;
					return;
				}

				selectedBarangayId = null;
				updateMapState({ selectedBarangayId: null });
			})
			.catch(() => {
				barangays = null;
			});

		return () => {
			if (shareStatusResetTimeout) clearTimeout(shareStatusResetTimeout);
		};
	});
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
			mapState={mapShareState}
			onSelectArea={updateSelectedArea}
			onPreloadHazardFamilyReady={(preload) => (preloadHazardFamily = preload)}
			{criticalFacilitiesEnabled}
			onCriticalFacilitiesStateChange={(state) => (criticalFacilitiesState = state)}
		/>

		<section
			class="info-card search-card map-search"
			data-search-ready={barangays !== null}
			onfocusout={handleBarangaySearchFocusOut}
		>
			<div class="search-input-wrap">
				<input
					autocomplete="off"
					spellcheck="false"
					bind:this={barangaySearchInput}
					id="barangay-search"
					value={barangayQuery}
					placeholder="Find a barangay..."
					role="combobox"
					aria-autocomplete="list"
					aria-controls={barangaySearchOpen && barangayQuery.trim()
						? 'barangay-search-results'
						: undefined}
					aria-expanded={barangaySearchOpen}
					aria-activedescendant={barangaySearchOpen && barangayMatches.length > 0
						? `barangay-result-${barangayMatches[highlightedBarangayIndex].id}`
						: undefined}
					oninput={handleBarangaySearchInput}
					onkeydown={handleBarangaySearchKeydown}
					onfocus={handleBarangaySearchFocus}
				/>
			</div>
			{#if barangaySearchOpen && (barangayMatches.length > 0 || barangayQuery.trim())}
				<div
					id="barangay-search-results"
					class="search-results"
					role={barangayMatches.length > 0 ? 'listbox' : 'status'}
					aria-live="polite"
				>
					{#if barangayMatches.length > 0}
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
					{:else}
						<p class="search-empty">No barangays found.</p>
					{/if}
				</div>
			{/if}
		</section>

		<div
			id="mobile-map-controls"
			class:mobile-open={mobileControlsOpen}
			class="mobile-controls-panel"
		>
			<MapControls
				viewMode={mapShareState.viewMode}
				activeHazardFamily={mapShareState.activeHazardFamily}
				enabledFloodPeriods={mapShareState.enabledFloodPeriods}
				enabledStormSurgeAdvisories={mapShareState.enabledStormSurgeAdvisories}
				enabledLandslideLayers={mapShareState.enabledLandslideLayers}
				enabledSeismicLayers={mapShareState.enabledSeismicLayers}
				{criticalFacilitiesEnabled}
				{criticalFacilitiesState}
				onViewModeChange={setViewMode}
				onHazardFamilyChange={setHazardFamily}
				onFloodPeriodChange={setFloodPeriodEnabled}
				onStormSurgeAdvisoryChange={setStormSurgeAdvisoryEnabled}
				onLandslideLayerChange={setLandslideLayerEnabled}
				onSeismicLayerChange={setSeismicLayerEnabled}
				onCriticalFacilitiesToggle={toggleCriticalFacilities}
				onPreloadHazardFamily={preloadHazardFamily}
			/>
		</div>

		<div class="mobile-action-bar">
			<button
				class:open={mobileSidebarOpen}
				class="mobile-sidebar-toggle"
				type="button"
				aria-controls="hazard-information"
				aria-expanded={mobileSidebarOpen}
				onclick={toggleMobileSidebar}
			>
				<span class="icon">
					{#if mobileSidebarOpen}
						<ChevronDown />
					{:else}
						<ChevronUp />
					{/if}
				</span>
				<span>{mobileSidebarOpen ? 'Hide details' : 'Show details'}</span>
			</button>
			<button
				class:open={mobileControlsOpen}
				class="mobile-controls-toggle"
				type="button"
				aria-controls="mobile-map-controls"
				aria-expanded={mobileControlsOpen}
				onclick={toggleMobileControls}
			>
				<span class="icon">
					{#if mobileControlsOpen}
						<ChevronDown />
					{:else}
						<ChevronUp />
					{/if}
				</span>
				<span>{mobileControlsOpen ? 'Hide controls' : 'Map controls'}</span>
			</button>
		</div>
	</section>

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

			<section class="info-card selection-card" class:selected={selectedArea} aria-live="polite">
				{#if selectedArea}
					<h2>{selectedArea.name}</h2>
					{#if activeHazardFamily === 'flood'}
						{#each floodHazardPeriods as period (period.key)}
							{@const hazard = selectedArea.floodHazards[period.key]}
							{@const summaryColors = hazard.classes.map(
								(hazardClass) => period.colors[hazardClass]
							)}
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
											<span
												class="legend-swatch"
												style={`background: ${period.colors[hazardClass]}`}
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
							{@const summaryColors = hazard.classes.map(
								(hazardClass) => layer.colors[hazardClass]
							)}
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
					<div class="source">
						<div class="icon">
							<Info />
						</div>
						<p>
							Source:
							<a
								href={activeHazardSource.sourceUrl}
								target="_blank"
								rel="external noopener noreferrer"
							>
								{activeHazardSource.source}
							</a>
						</p>
					</div>
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
						Source-provided flood hazard classes for three return periods. All periods are enabled
						by default.
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
					<div class="source">
						<div class="icon">
							<Info />
						</div>
						<p>
							Source:
							<a
								href={floodHazardMetadata.sourceUrl}
								target="_blank"
								rel="external noopener noreferrer">{floodHazardMetadata.source}</a
							>
						</p>
					</div>
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
					<div class="source">
						<div class="icon">
							<Info />
						</div>
						<p>
							Source:
							<a
								href={stormSurgeMetadata.sourceUrl}
								target="_blank"
								rel="external noopener noreferrer">{stormSurgeMetadata.source}</a
							>
						</p>
					</div>
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
					<div class="source">
						<div class="icon">
							<Info />
						</div>
						<p>
							Source:
							<a
								href={landslideMetadata.sourceUrl}
								target="_blank"
								rel="external noopener noreferrer">{landslideMetadata.source}</a
							>
						</p>
					</div>
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
					<div class="source">
						<div class="icon">
							<Info />
						</div>
						<p>
							Source:
							<a href={seismicMetadata.sourceUrl} target="_blank" rel="external noopener noreferrer"
								>{seismicMetadata.source}</a
							>
						</p>
					</div>
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
					<div class="source">
						<div class="icon">
							<Info />
						</div>
						<p>
							Source:
							<a href={typhoonSourceUrl} target="_blank" rel="external noopener noreferrer">
								PANaHON
							</a>
						</p>
					</div>
				{/if}
			</section>

			<section class="info-card safety-card" aria-labelledby="safety-heading">
				<h2 id="safety-heading">{activeSafetyGuidance.title}</h2>
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
		position: relative;
		min-width: 0;
		min-height: 0;
		background: var(--neutral-light);
	}

	.map-search {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 3;
		width: min(20rem, calc(100% - 2rem));
	}

	@media (min-width: 1250px) {
		.map-search {
			left: auto;
			right: 1rem;
		}
	}

	.mobile-action-bar {
		display: none;
	}

	.mobile-controls-panel {
		display: contents;
	}

	.sidebar {
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		border-left: 1px solid var(--gray);
		background: var(--bg);
		scrollbar-color: var(--gray) transparent;
	}

	/* disabling it for now cause it enables when i interact on the sidebar normally, */
	/* which looks ugly */
	/* .sidebar:focus { */
	/* 	outline: 3px solid var(--accent); */
	/* 	outline-offset: -3px; */
	/* } */

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
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;

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

	.info-card.search-card {
		padding: 0;
		border: none;
		background: transparent;
	}

	.info-card {
		padding: 1.5rem;
		border: none;
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

	.selection-card.selected {
		border-color: var(--accent);
	}

	.selection-card {
		.period {
			margin-top: 1rem;
			display: flex;
			align-items: center;
			gap: 0.75rem;

			.period-label {
				font-weight: 700;
			}
			.period-pill-summary {
				width: 12px;
				height: 12px;
				border-radius: 1rem;
			}
		}

		.period-classes {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem 1.5rem;
			margin-top: 0.5rem;

			p {
				margin: 0;
				display: grid;
				grid-template-columns: 24px 1fr;
				align-items: center;
				gap: 0.5rem;
				color: var(--fg-secondary);
				font-size: 1rem;
			}
		}
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

	.search-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: transparent;
		border-radius: 3rem;
	}

	.search-input-wrap input {
		width: 100%;
		min-width: 0;
		border: none;
		border-radius: 2.5rem;
		padding: 0.75rem 1.25rem;
		color: var(--fg);
		font-size: 1rem;
	}
	.search-input-wrap input::placeholder {
		opacity: 0.5;
	}

	/*    disabling it for now */
	.search-input-wrap input:focus-visible {
		/* outline: 2px solid var(--accent); */
		/* outline-offset: 2px; */
		outline: none;
	}

	.search-results {
		display: grid;
		gap: 0.2rem;
		max-height: 14rem;
		margin-top: 0.5rem;
		overflow-y: auto;
		padding: 0.25rem;
		border-radius: 1.5rem;
		background: var(--bg);
	}

	.search-result {
		border: 0;
		border-radius: 2.5rem;
		padding: 0.5rem 1rem;
		background: transparent;
		color: var(--fg);
		font: inherit;
		font-size: 1rem;
		text-align: left;
		cursor: pointer;
	}

	.search-result:hover,
	.search-result.highlighted,
	.search-result:focus-visible {
		background: var(--neutral-light);
		color: var(--fg);
	}

	.search-empty {
		padding: 0.5rem 1rem;
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
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem;
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

	.source {
		margin-top: 1.5rem;
		font-size: 1rem !important;
		display: grid;
		grid-template-columns: 16px 1fr;
		gap: 0.75rem;
		align-items: center;
		color: var(--fg);

		.icon {
			margin-top: -0.125rem;
		}

		a {
			text-decoration: underline;

			&:hover {
				text-decoration: none;
			}
		}
	}

	.boundary-attribution {
		margin-top: 1rem;
	}

	@media (max-width: 899px) {
		.app-shell {
			display: block;
			position: relative;
			height: 100dvh;
			min-height: 100dvh;
			overflow: hidden;
		}

		.map-pane {
			height: 100%;
			min-height: 100%;
		}

		.sidebar {
			position: absolute;
			inset: auto 0 0;
			z-index: 10;
			max-height: 50dvh;
			overflow-y: auto;
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

		.map-search {
			left: 0.75rem;
			top: 0.75rem;
			right: 0.75rem;
			width: calc(100% - 1.5rem);
		}

		.mobile-controls-panel {
			display: block;
			position: absolute;
			inset: auto 0 0;
			z-index: 10;
			max-height: 50dvh;
			overflow-y: auto;
			border: 1px solid var(--gray);
			border-bottom: 0;
			border-radius: 1.25rem 1.25rem 0 0;
			background: var(--bg);
			box-shadow: 0 -1rem 2rem rgb(30 56 55 / 18%);
			transform: translateY(100%);
			visibility: hidden;
			transition:
				transform 220ms ease-out,
				visibility 0s linear 220ms;
		}

		.mobile-controls-panel.mobile-open {
			transform: translateY(0);
			visibility: visible;
			transition:
				transform 220ms ease-out,
				visibility 0s linear 0s;
		}

		.mobile-action-bar {
			position: absolute;
			left: 50%;
			bottom: 0.75rem;
			z-index: 12;
			display: flex;
			gap: 0.5rem;
			align-items: center;
			justify-content: center;
			width: max-content;
			max-width: calc(100% - 1.5rem);
			transform: translateX(-50%);
		}

		.mobile-sidebar-toggle,
		.mobile-controls-toggle {
			position: static;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 0.35rem;
			min-width: 8.5rem;
			border: 1px solid rgb(23 62 59 / 14%);
			border-radius: 999px;
			padding: 0.65rem 1rem;
			background: var(--fg);
			color: var(--bg);
			font: inherit;
			font-size: 0.8rem;
			font-weight: 700;
			box-shadow: 0 0.75rem 2rem rgb(30 56 55 / 24%);
		}

		.mobile-sidebar-toggle.open,
		.mobile-controls-toggle.open {
			background: var(--accent-dark);
		}

		.mobile-sidebar-toggle .icon,
		.mobile-controls-toggle .icon {
			margin-top: -0.5rem;
			width: 1rem;
			height: 1rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sidebar,
		.mobile-controls-panel {
			transition: none;
		}
	}

	@media (min-width: 900px) and (max-width: 1100px) {
		.sidebar-inner {
			padding: 1.25rem;
		}
	}

	@media (min-width: 900px) {
		.app-shell,
		.map-pane,
		.sidebar {
			height: 100%;
		}
	}
</style>
