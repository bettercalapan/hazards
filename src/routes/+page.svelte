<script lang="ts">
	import type { BarangayCollection, BarangayProperties } from '$lib/data/barangays';
	import type { ReturnPeriod } from '$lib/data/flood';
	import type { LandslideLayer } from '$lib/data/landslide';
	import type { SeismicLayer } from '$lib/data/seismic';
	import type { StormSurgeAdvisory } from '$lib/data/storm-surge';
	import type { HazardFamily, MapShareState, ViewMode } from '$lib/map-state';
	import type { PageData } from './$types';

	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { loadCalapanBarangays, searchCalapanBarangays } from '$lib/data/barangays';
	import { seismicHazards } from '$lib/data/seismic';
	import HazardMap from '$lib/components/HazardMap.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { serializeMapShareState } from '$lib/map-state';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import { onMount, untrack } from 'svelte';

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
		content="A localized view of hazard-risk zones and typhoon tracks in Calapan City."
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
			class="map-search"
			data-search-ready={barangays !== null}
			onfocusout={handleBarangaySearchFocusOut}
		>
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

	<Sidebar
		{selectedArea}
		{activeHazardFamily}
		{mobileSidebarOpen}
		{shareStatus}
		{copyMapLink}
		typhoonTrackStatus={data.typhoonTrackStatus}
		typhoonNames={data.typhoonMapData.names}
	/>
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

	.map-search input {
		width: 100%;
		min-width: 0;
		border: none;
		border-radius: 2.5rem;
		padding: 0.75rem 1.25rem;
		color: var(--fg);
		font-size: 1rem;
	}
	.map-search input::placeholder {
		opacity: 0.5;
	}

	.map-search input:focus-visible {
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
		font-size: 1rem;
		text-align: left;
	}

	.search-result:hover,
	.search-result.highlighted,
	.search-result:focus-visible {
		background: var(--neutral-light);
	}

	.search-empty {
		padding: 0.5rem 1rem;
		color: var(--fg-secondary);
		font-size: 1rem;
	}

	@media (max-width: 899px) {
		.app-shell {
			display: block;
			position: relative;
			height: 100dvh;
			overflow: hidden;
		}

		.map-pane {
			height: 100%;
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
		.mobile-controls-panel {
			transition: none;
		}
	}

	@media (min-width: 900px) {
		.app-shell,
		.map-pane {
			height: 100%;
		}
	}
</style>
