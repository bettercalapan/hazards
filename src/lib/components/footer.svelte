<script lang="ts">
	import Facebook from '$lib/icons/facebook.svelte';
	import GitHub from '$lib/icons/github.svelte';

	const apps = [
		{ name: 'Portal', url: 'https://bettercalapan.org' },
		{ name: 'Roadmap', url: 'https://roadmap.bettercalapan.org' }
	];

	const bettergov = [
		{ name: 'Transparency Portal', url: 'https://transparency.bettergov.ph' },
		{ name: 'Open Data Portal', url: 'https://data.bettergov.ph' },
		{ name: 'Budget Tracker', url: 'https://budget.bettergov.ph' },
		{ name: 'SALN Tracker', url: 'https://saln.bettergov.ph' },
		{ name: 'Juris', url: 'https://juris.ph' }
	];
</script>

<footer>
	<div class="wrapper">
		<div class="info">
			<h1>BetterCalapan</h1>
			<p class="description">
				An open-source initiative providing transparent access to municipal services, local
				legislation, and public data for the people of Calapan.
			</p>
			<div class="socials">
				<a
					class="social"
					href="https://facebook.com/bettercalapan.org"
					target="_blank"
					rel="external noopener noreferrer"
					aria-label="Go to BetterCalapan Facebook page"
				>
					<Facebook />
				</a>
				<a
					class="social"
					href="https://github.com/BetterCalapan/bettercalapan"
					target="_blank"
					rel="external noopener noreferrer"
					aria-label="Go to BetterCalapan GitHub repository"
				>
					<GitHub />
				</a>
			</div>
		</div>

		<div class="footer-sections">
			<div class="footer-section">
				<h1>Apps</h1>
				<ul class="footer-section-list">
					{#each apps as app (app.name)}
						<li>
							<a href={app.url} target="_blank" rel="external noopener noreferrer">{app.name}</a>
						</li>
					{/each}
				</ul>
			</div>

			<div class="footer-section">
				<h1>BetterGov</h1>
				<ul class="footer-section-list">
					{#each bettergov as project (project.name)}
						<li>
							<a href={project.url} target="_blank" rel="external noopener noreferrer"
								>{project.name}</a
							>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</footer>

<style>
	h1 {
		color: var(--bg);
		font-size: 1.125rem;
		font-weight: 500;
	}

	footer {
		display: grid;
		place-items: center;
		gap: 3rem;
		padding: 4rem 1rem;
		background: var(--fg);
		color: var(--neutral-dark);
	}

	.wrapper {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		max-width: 80rem;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.description {
		max-width: 28rem;
	}

	.socials {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.social {
		width: 20px;
		height: 20px;
		color: var(--neutral-dark);
	}

	.footer-sections {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		margin-top: 1.75rem;
	}

	.footer-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.footer-section-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
	}

	.footer-section-list a {
		color: var(--neutral-dark);
	}

	.footer-section-list a:hover {
		text-decoration: underline;
	}

	@media (min-width: 600px) {
		.footer-sections {
			display: grid;
			grid-template-columns: repeat(2, 12rem);
		}
	}

	@media (min-width: 1100px) {
		.wrapper {
			display: grid;
			grid-template-columns: 1fr 24rem;
			gap: 20rem;
		}

		.footer-sections {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			margin: 0;
		}
	}
</style>
