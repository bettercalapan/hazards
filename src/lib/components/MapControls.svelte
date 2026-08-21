<script lang="ts">
	import { floodHazardPeriods, type ReturnPeriod } from '$lib/data/flood';
	import { stormSurgeAdvisories, type StormSurgeAdvisory } from '$lib/data/storm-surge';
	import { landslideHazards, type LandslideLayer } from '$lib/data/landslide';
	import { seismicHazards, type SeismicLayer } from '$lib/data/seismic';
	import type { HazardFamily, ViewMode } from '$lib/map-state';
	import HouseHeart from '@lucide/svelte/icons/house-heart';

	type Props = {
		viewMode: ViewMode;
		activeHazardFamily: HazardFamily;
		enabledFloodPeriods: readonly ReturnPeriod[];
		enabledStormSurgeAdvisories: readonly StormSurgeAdvisory[];
		enabledLandslideLayers: readonly LandslideLayer[];
		enabledSeismicLayers: readonly SeismicLayer[];
		criticalFacilitiesEnabled: boolean;
		criticalFacilitiesState: 'idle' | 'loading' | 'ready' | 'error';
		onViewModeChange: (mode: ViewMode) => void;
		onHazardFamilyChange: (family: HazardFamily) => void;
		onFloodPeriodChange: (period: ReturnPeriod, enabled: boolean) => void;
		onStormSurgeAdvisoryChange: (advisory: StormSurgeAdvisory, enabled: boolean) => void;
		onLandslideLayerChange: (layer: LandslideLayer, enabled: boolean) => void;
		onSeismicLayerChange: (layer: SeismicLayer, enabled: boolean) => void;
		onCriticalFacilitiesToggle: () => void;
		onPreloadHazardFamily: (family: HazardFamily) => void;
	};

	let {
		viewMode,
		activeHazardFamily,
		enabledFloodPeriods,
		enabledStormSurgeAdvisories,
		enabledLandslideLayers,
		enabledSeismicLayers,
		criticalFacilitiesEnabled,
		criticalFacilitiesState,
		onViewModeChange,
		onHazardFamilyChange,
		onFloodPeriodChange,
		onStormSurgeAdvisoryChange,
		onLandslideLayerChange,
		onSeismicLayerChange,
		onCriticalFacilitiesToggle,
		onPreloadHazardFamily
	}: Props = $props();

	const hazardFamilies = [
		{ family: 'flood', label: 'Flood' },
		{ family: 'storm-surge', label: 'Storm surge' },
		{ family: 'landslide', label: 'Landslide' },
		{ family: 'earthquake', label: 'Earthquake' },
		{ family: 'typhoon', label: 'Typhoon' }
	] as const satisfies readonly { family: HazardFamily; label: string }[];
</script>

<div class="map-toolbar" role="region" aria-label="Map controls">
	<div class="map-control-groups">
		<div class="control-header">
			<div class="control-heading">
				<span class="control-kicker">Map Controls</span>
			</div>
			<div class="view-toggle" role="group" aria-label="Map view mode">
				<button
					class:active={viewMode === '3d'}
					aria-pressed={viewMode === '3d'}
					type="button"
					onclick={() => onViewModeChange('3d')}
				>
					3D
				</button>
				<button
					class:active={viewMode === '2d'}
					aria-pressed={viewMode === '2d'}
					type="button"
					onclick={() => onViewModeChange('2d')}
				>
					2D
				</button>
				<button
					class="critical-facilities"
					class:active={criticalFacilitiesEnabled}
					class:error={criticalFacilitiesState === 'error'}
					aria-label="Critical facilities"
					aria-pressed={criticalFacilitiesEnabled}
					aria-busy={criticalFacilitiesState === 'loading'}
					title={criticalFacilitiesState === 'loading'
						? 'Loading facilities'
						: criticalFacilitiesState === 'error'
							? 'Facilities unavailable'
							: 'Critical facilities'}
					type="button"
					onclick={onCriticalFacilitiesToggle}
				>
					<div class="icon">
						<HouseHeart />
					</div>
				</button>
			</div>
		</div>

		<div class="control-section">
			<div class="hazard-family-toggle" role="group" aria-label="Hazard type">
				{#each hazardFamilies as item (item.family)}
					<button
						class:active={activeHazardFamily === item.family}
						aria-pressed={activeHazardFamily === item.family}
						type="button"
						onclick={() => onHazardFamilyChange(item.family)}
						onmouseenter={() => onPreloadHazardFamily(item.family)}
						onfocus={() => onPreloadHazardFamily(item.family)}
					>
						{item.label}
					</button>
				{/each}
			</div>

			{#if activeHazardFamily !== 'typhoon'}
				<div class="context-controls">
					{#if activeHazardFamily === 'flood'}
						<div class="flood-toggle" role="group" aria-label="Flood return period layers">
							{#each floodHazardPeriods as period (period.key)}
								<label class:active={enabledFloodPeriods.includes(period.key)}>
									<input
										type="checkbox"
										checked={enabledFloodPeriods.includes(period.key)}
										onchange={(event) =>
											onFloodPeriodChange(period.key, event.currentTarget.checked)}
									/>
									<span class="flood-toggle-swatch" style={`background: ${period.colors.Medium}`}
									></span>
									<span>{period.shortName}</span>
								</label>
							{/each}
						</div>
					{:else if activeHazardFamily === 'storm-surge'}
						<div class="flood-toggle" role="group" aria-label="Storm surge advisory layers">
							{#each stormSurgeAdvisories as advisory (advisory.key)}
								<label class:active={enabledStormSurgeAdvisories.includes(advisory.key)}>
									<input
										type="checkbox"
										checked={enabledStormSurgeAdvisories.includes(advisory.key)}
										onchange={(event) =>
											onStormSurgeAdvisoryChange(advisory.key, event.currentTarget.checked)}
									/>
									<span class="flood-toggle-swatch" style={`background: ${advisory.colors.Medium}`}
									></span>
									<span>{advisory.shortName}</span>
								</label>
							{/each}
						</div>
					{:else if activeHazardFamily === 'landslide'}
						<div class="flood-toggle" role="group" aria-label="Landslide hazard layers">
							{#each landslideHazards as layer (layer.key)}
								<label class:active={enabledLandslideLayers.includes(layer.key)}>
									<input
										type="checkbox"
										checked={enabledLandslideLayers.includes(layer.key)}
										onchange={(event) =>
											onLandslideLayerChange(layer.key, event.currentTarget.checked)}
									/>
									<span class="flood-toggle-swatch" style={`background: ${layer.colors.Medium}`}
									></span>
									<span>{layer.shortName}</span>
								</label>
							{/each}
						</div>
					{:else if activeHazardFamily === 'earthquake'}
						<div class="flood-toggle" role="group" aria-label="Earthquake hazard layers">
							{#each seismicHazards as layer (layer.key)}
								<label class:active={enabledSeismicLayers.includes(layer.key)}>
									<input
										type="checkbox"
										checked={enabledSeismicLayers.includes(layer.key)}
										onchange={(event) =>
											onSeismicLayerChange(layer.key, event.currentTarget.checked)}
									/>
									<span
										class="flood-toggle-swatch"
										style={`background: ${layer.classes[layer.key === 'ground-shaking' ? 2 : layer.key === 'liquefaction' ? 6 : 4]!.color}`}
									></span>
									<span>{layer.shortName}</span>
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.map-toolbar {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 2;
		width: min(25rem, calc(100% - 2rem));
		overflow: hidden;
		border: 1px solid rgb(23 62 59 / 14%);
		border-radius: 0.9rem;
		background: var(--bg);
		box-shadow: 0 0.75rem 2rem rgb(30 56 55 / 18%);
		backdrop-filter: blur(12px);
	}

	.map-control-groups {
		display: grid;
	}

	.control-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.control-header {
		padding: 1.5rem;
		border-bottom: 1px dashed var(--gray);
	}

	.control-heading {
		display: grid;
		gap: 0.1rem;
	}

	.control-kicker {
		color: var(--fg);
		font-size: 1.25rem;
		font-weight: 700;
	}

	.context-controls {
		padding: 1.5rem;
		display: grid;
		gap: 0.75rem;
	}

	.view-toggle {
		display: flex;
		gap: 0.5rem;
	}

	.view-toggle button {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border: 1px solid rgb(23 62 59 / 14%);
		border-radius: 50%;
		background: transparent;
		color: #476563;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.3s ease;

		.icon {
			width: 18px;
			aspect-ratio: 1 / 1;
		}
	}

	.view-toggle button:hover {
		opacity: 0.75;
	}

	.view-toggle button.active {
		background: var(--fg);
		color: var(--bg);
	}

	.hazard-family-toggle {
		padding: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		scrollbar-width: none;
		border-bottom: 1px dashed var(--gray);
	}

	.hazard-family-toggle::-webkit-scrollbar {
		display: none;
	}

	.hazard-family-toggle button {
		flex: 0 0 auto;
		border: none;
		border-radius: 4rem;
		padding: 0.5rem 1.25rem;
		background: var(--neutral-light);
		color: var(--fg);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.3s ease;
	}

	.hazard-family-toggle button:hover {
		opacity: 0.75;
	}

	.hazard-family-toggle button.active {
		background: var(--fg);
		color: var(--bg);
	}

	.flood-toggle {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.flood-toggle label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border-radius: 5rem;
		padding: 0.5rem 1rem;
		background: var(--neutral-light);
		color: var(--fg);
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.3s ease;
	}

	.flood-toggle label:hover {
		opacity: 0.75;
	}

	.flood-toggle label.active {
		background: var(--fg);
		color: var(--neutral-lightest);
	}

	.flood-toggle input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.flood-toggle label:has(input:focus-visible) {
		outline: 2px solid #d18f38;
		outline-offset: 2px;
	}

	.flood-toggle-swatch {
		width: 0.65rem;
		height: 0.65rem;
		border: 1px solid rgb(23 62 59 / 20%);
		border-radius: 50%;
	}

	@media (min-width: 900px) and (max-width: 1249px) {
		.map-toolbar {
			top: 5.5rem;
		}
	}

	@media (max-width: 899px) {
		.map-toolbar {
			position: static;
			width: auto;
			max-width: none;
			border-radius: 1rem 1rem 0 0;
			border-bottom: none;
			margin-bottom: 3.5rem;
			box-shadow: none;
			backdrop-filter: none;
		}
	}
</style>
