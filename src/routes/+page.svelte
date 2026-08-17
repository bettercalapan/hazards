<script lang="ts">
	import { prototypeFloodLayer } from '$lib/data/hazards';
	import HazardMap from '$lib/components/HazardMap.svelte';
</script>

<svelte:head>
	<title>Hazards | Calapan City</title>
	<meta
		name="description"
		content="A localized view of hazard-risk zones and recent official incidents in Calapan City."
	/>
</svelte:head>

<div class="page">
	<section class="intro" aria-labelledby="page-title">
		<div>
			<p class="eyebrow">Calapan City hazard map</p>
			<h1 id="page-title">Understand the risks around you.</h1>
		</div>
		<p class="intro-copy">
			Explore hazard-risk zones across Calapan and check what official sources have reported in the
			last 24 hours.
		</p>
	</section>

	<section class="workspace" aria-label="Hazard map workspace">
		<div class="map-card">
			<HazardMap />
		</div>

		<aside class="information-panel">
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

			<section class="source-note">
				<span class="source-icon">i</span>
				<p>
					Source: {prototypeFloodLayer.sourceName}. Update:
					{prototypeFloodLayer.updatedAt ?? 'not available for prototype data'}. Always check the
					source and update time before making safety decisions.
				</p>
			</section>
		</aside>
	</section>
</div>

<style>
	.page {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 2rem;
	}

	.intro {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
		padding: 2rem 0 1rem;
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
		max-width: 45rem;
		font-size: 2.5rem;
		font-weight: 700;
		line-height: 1.15;
	}

	.intro-copy {
		max-width: 24rem;
		margin-bottom: 0.25rem;
		color: var(--fg-secondary);
		font-size: 1.125rem;
	}

	.workspace {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 20rem;
		gap: 2rem;
		align-items: stretch;
	}

	.map-card,
	.info-card,
	.source-note {
		border: 1px solid var(--gray);
		border-radius: 0.75rem;
	}

	.map-card {
		display: flex;
		min-width: 0;
		overflow: hidden;
		background: var(--neutral-light);
	}

	.information-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.info-card {
		padding: 1.5rem;
		background: var(--bg);
	}

	.active-layer {
		flex: 1;
		border-color: var(--accent-light);
		background: var(--neutral-light);
	}

	.active-layer .card-kicker {
		color: var(--accent-dark);
	}

	.layer-dot {
		display: inline-block;
		width: 0.55rem;
		height: 0.55rem;
		margin-right: 0.35rem;
		border-radius: 50%;
		background: var(--accent);
	}

	h2 {
		margin-bottom: 0.75rem;
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.info-card p,
	.source-note p {
		color: var(--fg-secondary);
		font-size: 1rem;
		line-height: 1.5;
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1.5rem;
		color: var(--fg-secondary);
		font-size: 0.9rem;
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

	.source-note {
		display: flex;
		gap: 0.7rem;
		padding: 1rem;
		background: var(--neutral-light);
	}

	.source-icon {
		display: grid;
		flex: 0 0 auto;
		width: 1.25rem;
		height: 1.25rem;
		place-items: center;
		border: 1px solid var(--neutral-dark);
		border-radius: 50%;
		color: var(--fg-secondary);
		font-size: 0.8rem;
		font-style: italic;
	}

	@media (min-width: 800px) {
		h1 {
			font-size: 3.5rem;
		}
	}

	@media (max-width: 850px) {
		.workspace {
			grid-template-columns: 1fr;
		}

		.information-panel {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.source-note {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 620px) {
		.intro {
			display: block;
			padding: 1rem 0;
		}

		.intro-copy {
			margin-top: 1rem;
		}

		.information-panel {
			display: flex;
		}
	}
</style>
