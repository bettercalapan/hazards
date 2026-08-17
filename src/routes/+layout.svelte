<script lang="ts">
	import '../global.css';
	import favicon from '$lib/assets/favicon.png';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to main content</a>
<Header />
<main id="main-content" tabindex="-1">
	<div class="main-wrapper">
		{@render children()}
	</div>
</main>
<Footer />

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
		flex-direction: column;
		align-items: center;
		padding: 1rem 1rem 4rem;
	}

	main:focus {
		outline: none;
	}

	.main-wrapper {
		display: flex;
		flex: 1;
		flex-direction: column;
		width: 100%;
		max-width: 80rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.skip-link {
			transition: none;
		}
	}
</style>
