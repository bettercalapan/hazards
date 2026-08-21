<script lang="ts">
	import '../global.css';
	import favicon from '$lib/assets/favicon.png';

	let { children } = $props();

	function focusHazardInformation(event: MouseEvent) {
		event.preventDefault();
		const target = document.getElementById('hazard-information');
		target?.focus();
		target?.scrollIntoView({ block: 'start' });
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="skip-link" href="#hazard-information" onclick={focusHazardInformation}
	>Skip to hazard information</a
>
<main id="main-content" tabindex="-1">
	{@render children()}
</main>

<style>
	.skip-link {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 1000;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		background: var(--fg);
		color: var(--bg);
		box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 20%);
		transform: translateY(calc(-100% - 1rem));
		opacity: 0;
		pointer-events: none;
		transition:
			transform 120ms ease-out,
			opacity 120ms ease-out;
	}

	.skip-link:focus-visible {
		transform: translateY(0);
		opacity: 1;
		pointer-events: auto;
		outline: 2px solid var(--accent);
		box-shadow:
			0 0.25rem 1rem rgb(0 0 0 / 20%),
			0 0 0 3px var(--accent);
	}

	main {
		display: flex;
		flex: 1;
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	main:focus {
		outline: none;
	}

	@media (max-width: 899px) {
		main {
			height: 100%;
			min-height: 100dvh;
			overflow: hidden;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skip-link {
			transition: none;
		}
	}
</style>
