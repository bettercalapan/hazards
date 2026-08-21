<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="wrapper">
	<div class="content">
		<p class="status-code">404</p>
		<h1 class="status-msg">Page not found</h1>
		<p class="description">The page doesn't exist or it might have been moved.</p>
		<div class="actions">
			<button class="back-btn" type="button" onclick={() => history.back()}>Go back</button>
			<a class="home-btn" href={resolve('/')}>Return to home</a>
		</div>
	</div>
</div>

<style>
	.wrapper {
		display: grid;
		flex: 1;
		place-items: center;
		padding: 1rem;
		text-align: center;
	}

	.status-code {
		color: var(--accent-dark);
		font-weight: 600;
	}

	.status-msg {
		margin: 0.5rem 0;
		font-size: 2.5rem;
		line-height: 1.25;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	:where(a, button) {
		display: inline-block;
		padding: 0.75rem 1.25rem;
		border: 0;
		border-radius: 2rem;
		color: var(--fg);
		font-weight: 600;
		transition: opacity 0.3s ease;
	}

	:where(a, button):hover {
		opacity: 0.8;
	}

	.home-btn {
		background-color: var(--accent);
	}

	.back-btn {
		background-color: var(--fg);
		color: var(--bg);
	}

	@media (min-width: 600px) {
		.status-msg {
			margin: 0;
			font-size: 3.75rem;
		}

		:where(a, button) {
			padding: 0.75rem 2rem;
		}
	}
</style>
