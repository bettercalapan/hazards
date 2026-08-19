<script lang="ts">
	import { floodHazardPeriods, type ReturnPeriod } from '$lib/data/flood';
	import { stormSurgeAdvisories, type StormSurgeAdvisory } from '$lib/data/storm-surge';
	import { landslideHazards, type LandslideLayer } from '$lib/data/landslide';
	import { seismicHazards, type SeismicLayer } from '$lib/data/seismic';
	import type { HazardFamily, ViewMode } from '$lib/map-state';

	type Props = {
		viewMode: ViewMode;
		activeHazardFamily: HazardFamily;
		enabledFloodPeriods: readonly ReturnPeriod[];
		enabledStormSurgeAdvisories: readonly StormSurgeAdvisory[];
		enabledLandslideLayers: readonly LandslideLayer[];
		enabledSeismicLayers: readonly SeismicLayer[];
		onViewModeChange: (mode: ViewMode) => void;
		onHazardFamilyChange: (family: HazardFamily) => void;
		onFloodPeriodChange: (period: ReturnPeriod, enabled: boolean) => void;
		onStormSurgeAdvisoryChange: (advisory: StormSurgeAdvisory, enabled: boolean) => void;
		onLandslideLayerChange: (layer: LandslideLayer, enabled: boolean) => void;
		onSeismicLayerChange: (layer: SeismicLayer, enabled: boolean) => void;
		onPreloadHazardFamily: (family: HazardFamily) => void;
	};

	let {
		viewMode,
		activeHazardFamily,
		enabledFloodPeriods,
		enabledStormSurgeAdvisories,
		enabledLandslideLayers,
		enabledSeismicLayers,
		onViewModeChange,
		onHazardFamilyChange,
		onFloodPeriodChange,
		onStormSurgeAdvisoryChange,
		onLandslideLayerChange,
		onSeismicLayerChange,
		onPreloadHazardFamily
	}: Props = $props();

	function hazardFamilyLabel(family: HazardFamily): string {
		if (family === 'storm-surge') return 'Storm surge';
		return family.charAt(0).toUpperCase() + family.slice(1);
	}

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
				<span class="control-kicker">Map view</span>
				<strong>Explore Calapan</strong>
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
			</div>
		</div>

		<div class="control-section">
			<div class="control-section-heading">
				<div class="control-heading">
					<span class="control-kicker">Hazard layers</span>
					<strong>{hazardFamilyLabel(activeHazardFamily)}</strong>
				</div>
				<span class="control-hint">Choose a view</span>
			</div>
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

			<div class="context-controls">
				{#if activeHazardFamily === 'flood'}
					<div class="flood-toggle" role="group" aria-label="Flood return period layers">
						{#each floodHazardPeriods as period (period.key)}
							<label class:active={enabledFloodPeriods.includes(period.key)}>
								<input
									type="checkbox"
									checked={enabledFloodPeriods.includes(period.key)}
									onchange={(event) => onFloodPeriodChange(period.key, event.currentTarget.checked)}
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
									onchange={(event) => onSeismicLayerChange(layer.key, event.currentTarget.checked)}
								/>
								<span class="flood-toggle-swatch" style={`background: ${layer.classes[0].color}`}
								></span>
								<span>{layer.shortName}</span>
							</label>
						{/each}
					</div>
				{:else}
					<div class="flood-toggle typhoon-toggle" role="status" aria-label="Typhoon track status">
						<span class="typhoon-toggle-swatch"></span>
						<span>Track proximity</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.map-toolbar {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 2;
		width: min(35rem, calc(100% - 2rem));
		overflow: hidden;
		border: 1px solid rgb(23 62 59 / 14%);
		border-radius: 0.9rem;
		background: rgb(250 248 242 / 96%);
		box-shadow: 0 0.75rem 2rem rgb(30 56 55 / 18%);
		backdrop-filter: blur(12px);
	}

	.map-control-groups {
		display: grid;
	}

	.control-header,
	.control-section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.control-header {
		padding: 0.75rem 0.85rem;
		border-bottom: 1px solid rgb(23 62 59 / 12%);
	}

	.control-heading {
		display: grid;
		gap: 0.1rem;
	}

	.control-heading strong {
		color: #173e3b;
		font-size: 0.88rem;
		line-height: 1.15;
	}

	.control-kicker {
		color: #788d88;
		font-size: 0.61rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.control-hint {
		color: #788d88;
		font-size: 0.68rem;
		font-weight: 700;
	}

	.control-section {
		display: grid;
		gap: 0.65rem;
		padding: 0.8rem 0.85rem 0.85rem;
	}

	.context-controls {
		display: grid;
		gap: 0.65rem;
		padding-top: 0.65rem;
		border-top: 1px solid rgb(23 62 59 / 12%);
	}

	.view-toggle {
		display: flex;
		gap: 0.15rem;
	}

	.view-toggle button {
		border: 1px solid rgb(23 62 59 / 14%);
		border-radius: 999px;
		padding: 0.4rem 0.7rem;
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

	.hazard-family-toggle {
		display: flex;
		gap: 0.3rem;
		overflow-x: auto;
		padding-bottom: 0.1rem;
		scrollbar-width: none;
	}

	.hazard-family-toggle::-webkit-scrollbar {
		display: none;
	}

	.hazard-family-toggle button {
		flex: 0 0 auto;
		border: 1px solid rgb(23 62 59 / 14%);
		border-radius: 999px;
		padding: 0.42rem 0.72rem;
		background: rgb(255 255 255 / 35%);
		color: #476563;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}

	.hazard-family-toggle button.active {
		background: #173e3b;
		color: #fffdf7;
	}

	.flood-toggle {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.flood-toggle label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid rgb(23 62 59 / 12%);
		border-radius: 0.5rem;
		padding: 0.42rem 0.6rem;
		background: rgb(255 255 255 / 42%);
		color: #476563;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}

	.flood-toggle label.active {
		border-color: rgb(23 62 59 / 30%);
		background: rgb(23 62 59 / 9%);
		color: #173e3b;
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

	@media (max-width: 640px) {
		.map-toolbar {
			top: 0.75rem;
			left: 0.75rem;
			width: calc(100% - 1.5rem);
			max-width: calc(100% - 1.5rem);
			border-radius: 0.85rem;
		}

		.control-section-heading {
			align-items: flex-start;
		}

		.control-hint {
			display: none;
		}
	}
</style>
