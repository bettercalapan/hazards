<script lang="ts">
	import { resolve } from '$app/paths';
	import logo from '$lib/assets/logo.svg';
</script>

<header>
	<div class="wrapper">
		<a href={resolve('/')} aria-label="Go to Hazards home">
			<img src={logo} alt="BetterCalapan logo" width="36" height="36" />
			<h1>BetterCalapan</h1>
		</a>
	</div>
</header>

<style>
	header {
		display: grid;
		place-items: center;
		padding: 1rem;
		background: var(--bg);
	}

	.wrapper {
		width: 100%;
		max-width: 80rem;
	}

	a {
		display: grid;
		grid-template-columns: 36px 1fr;
		align-items: center;
		gap: 0.75rem;
		width: fit-content;
	}

	img {
		border-radius: 0.75rem;
	}

	h1 {
		font-size: 1.25rem;
	}
</style>
