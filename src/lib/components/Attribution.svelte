<script lang="ts">
	import Info from '@lucide/svelte/icons/info';

	let { source, sourceUrl }: { source: string; sourceUrl: string } = $props();
</script>

<div class="source">
	<div class="icon">
		<Info />
	</div>
	<p>
		Source:
		<a href={sourceUrl} target="_blank" rel="external noopener noreferrer">
			{source}
		</a>
	</p>
</div>

<style>
	.source {
		margin-top: 1.5rem;
		display: grid;
		grid-template-columns: 16px 1fr;
		gap: 0.75rem;
		align-items: center;
		color: var(--fg);

		.icon {
			margin-top: -0.125rem;
		}

		p {
			color: var(--fg-secondary);
			font-size: 1rem;
		}

		a {
			text-decoration: underline;

			&:hover {
				text-decoration: none;
			}
		}
	}
</style>
