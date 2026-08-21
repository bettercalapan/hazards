import type { Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

const barangayName = 'Balingayan';
const barangayId = 'PH1705205001';

type BrowserDiagnostics = {
	assertClean: () => Promise<void>;
};

function isMapAsset(url: string): boolean {
	return /openfreemap|elevation-tiles-prod|\/fonts\/|\/calapan-[^/?]+-tiles\/|\/critical-facilities\.json|calapan-barangays/.test(
		url
	);
}

function installDiagnostics(page: Page): BrowserDiagnostics {
	const failures: string[] = [];

	page.on('console', (message) => {
		if (message.type() === 'error') failures.push(`[console] ${message.text()}`);
	});
	page.on('pageerror', (error) => failures.push(`[pageerror] ${error.message}`));
	page.on('requestfailed', (request) => {
		if (isMapAsset(request.url())) {
			const errorText = request.failure()?.errorText ?? '';
			if (errorText !== 'net::ERR_ABORTED') {
				failures.push(`[requestfailed] ${request.url()} ${errorText}`.trim());
			}
		}
	});
	page.on('response', (response) => {
		if (isMapAsset(response.url()) && response.status() >= 400) {
			failures.push(`[response ${response.status()}] ${response.url()}`);
		}
	});

	return {
		assertClean: async () => {
			await page.waitForTimeout(250);
			expect(failures, failures.join('\n')).toEqual([]);
		}
	};
}

async function stubLiveFeeds(page: Page) {
	await page.route('https://publicalert.pagasa.dost.gov.ph/feeds/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/atom+xml',
			body: '<feed xmlns="http://www.w3.org/2005/Atom"></feed>'
		})
	);
	await page.route('https://www.panahon.gov.ph/api/v1/cyclone-track', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
	);
}

async function openMap(page: Page) {
	await stubLiveFeeds(page);
	await page.goto('/');
	await expect(page.getByRole('region', { name: 'Interactive map of Calapan City' })).toBeVisible();
	await expect(page.locator('.map')).toHaveAttribute('data-map-ready', 'true', { timeout: 30_000 });
	await expect(page.locator('.map-search')).toHaveAttribute('data-search-ready', 'true', {
		timeout: 30_000
	});
	await page.waitForTimeout(750);
}

test.describe('map browser smoke tests', () => {
	test('loads the map without browser or map asset errors', async ({ page }) => {
		const diagnostics = installDiagnostics(page);
		await openMap(page);
		await diagnostics.assertClean();
	});

	test('stacks tablet map controls and moves search right on wide maps', async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 800 });
		await openMap(page);

		const tabletLayout = await page.evaluate(() => {
			const map = document.querySelector('.map-pane')!.getBoundingClientRect();
			const search = document.querySelector('.map-search')!.getBoundingClientRect();
			const controls = document.querySelector('.map-toolbar')!.getBoundingClientRect();
			return { map, search, controls };
		});
		expect(tabletLayout.search.left).toBeCloseTo(tabletLayout.map.left + 16, 0);
		expect(tabletLayout.controls.left).toBeCloseTo(tabletLayout.map.left + 16, 0);
		expect(tabletLayout.controls.top).toBeGreaterThan(tabletLayout.search.bottom);

		await page.setViewportSize({ width: 1280, height: 800 });
		await page.waitForTimeout(250);
		const wideLayout = await page.evaluate(() => {
			const map = document.querySelector('.map-pane')!.getBoundingClientRect();
			const search = document.querySelector('.map-search')!.getBoundingClientRect();
			return { map, search };
		});
		expect(wideLayout.search.right).toBeCloseTo(wideLayout.map.right - 16, 0);
	});

	test('toggles critical facilities from the map controls', async ({ page }) => {
		const diagnostics = installDiagnostics(page);
		await openMap(page);

		const facilities = page.getByRole('button', { name: 'Critical facilities', exact: true });
		await facilities.click();
		await expect(facilities).toHaveAttribute('aria-pressed', 'true');
		await diagnostics.assertClean();
	});

	test('resets the share button after copying the map link', async ({ page }) => {
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
			origin: 'http://127.0.0.1:4173'
		});
		const diagnostics = installDiagnostics(page);
		await openMap(page);

		const share = page.locator('.share-button');
		await expect(share).toHaveAttribute('aria-label', 'Copy map link');
		await share.click();
		await expect(share).toHaveAttribute('aria-label', 'Map link copied');
		await expect(share).toHaveAttribute('aria-label', 'Copy map link', { timeout: 5_000 });
		await diagnostics.assertClean();
	});

	test('switches hazard families and updates active layer state', async ({ page }) => {
		test.setTimeout(90_000);
		const diagnostics = installDiagnostics(page);
		await openMap(page);

		for (const family of ['Storm surge', 'Landslide', 'Earthquake', 'Typhoon', 'Flood']) {
			const button = page.getByRole('button', { name: family, exact: true });
			await button.click();
			await expect(button).toHaveAttribute('aria-pressed', 'true');
			if (family === 'Typhoon') {
				await expect(page.locator('.context-controls')).toHaveCount(0);
				await expect(page.getByText('Track proximity', { exact: true })).toHaveCount(0);
			}
		}

		await page.getByRole('checkbox', { name: '5-year', exact: true }).uncheck({ force: true });
		await expect(page.getByRole('checkbox', { name: '5-year', exact: true })).not.toBeChecked();
		await expect(page).toHaveURL(/family=flood.*layers=25%2C100/);
		await diagnostics.assertClean();
	});

	test('searches for and selects a barangay', async ({ page }) => {
		const diagnostics = installDiagnostics(page);
		await openMap(page);

		const search = page.locator('.map-search').getByRole('combobox', { name: 'Find a barangay' });
		await search.fill(barangayName);
		const result = page.getByRole('option', { name: barangayName, exact: true });
		await expect(result).toBeVisible();
		await search.press('Tab');
		await expect(result).toBeFocused();
		await expect(page.locator('#barangay-search-results')).toBeVisible();
		await result.click();
		await expect(search).toHaveValue(barangayName);
		await expect(page).toHaveURL(new RegExp(`area=${barangayId}`));
		await diagnostics.assertClean();
	});

	test('shows no-results feedback inside the search results', async ({ page }) => {
		await openMap(page);

		const search = page.locator('.map-search').getByRole('combobox', { name: 'Find a barangay' });
		await search.fill('not-a-real-barangay');
		const results = page.locator('#barangay-search-results');
		await expect(results).toBeVisible();
		await expect(results).toHaveRole('status');
		await expect(results).toContainText('No barangays found.');
		await expect(search).toHaveAttribute('aria-controls', 'barangay-search-results');
	});

	test('uses a full-screen mobile map with a bottom details drawer', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		const diagnostics = installDiagnostics(page);
		await openMap(page);

		await expect(page.locator('.map-pane')).toHaveCSS('height', '844px');
		await expect(page.locator('.boundary-note')).toBeHidden();
		await expect(page.locator('.map-summary')).toHaveCount(0);
		const mobilePositions = await page.evaluate(() => ({
			search: document.querySelector('.map-search')!.getBoundingClientRect(),
			attribution: document.querySelector('.maplibregl-ctrl-bottom-right')!.getBoundingClientRect()
		}));
		expect(mobilePositions.attribution.top).toBeGreaterThanOrEqual(mobilePositions.search.bottom);

		const detailsToggle = page.locator('.mobile-sidebar-toggle');
		const controlsToggle = page.locator('.mobile-controls-toggle');
		const sidebar = page.locator('#hazard-information');
		const controlsPanel = page.locator('#mobile-map-controls');
		const controls = controlsPanel.getByRole('region', { name: 'Map controls' });
		await expect(detailsToggle).toHaveAttribute('aria-expanded', 'false');
		await expect(controlsToggle).toHaveAttribute('aria-expanded', 'false');
		await expect(sidebar).not.toHaveClass(/mobile-open/);
		await expect(controlsPanel).not.toHaveClass(/mobile-open/);

		await controlsToggle.click();
		await expect(controlsToggle).toHaveAttribute('aria-expanded', 'true');
		await expect(detailsToggle).toHaveAttribute('aria-expanded', 'false');
		await expect(controlsPanel).toHaveClass(/mobile-open/);
		await expect(controls).toBeVisible();
		await expect(controlsPanel).toHaveCSS('max-height', '422px');
		await expect(sidebar.getByRole('region', { name: 'Map controls' })).toHaveCount(0);

		await detailsToggle.click();
		await expect(detailsToggle).toHaveAttribute('aria-expanded', 'true');
		await expect(controlsToggle).toHaveAttribute('aria-expanded', 'false');
		await expect(sidebar).toHaveClass(/mobile-open/);
		await expect(controlsPanel).not.toHaveClass(/mobile-open/);
		await expect(sidebar).toHaveCSS('max-height', '422px');
		await expect(sidebar.locator('.selection-card')).toBeVisible();

		await detailsToggle.click();
		await expect(detailsToggle).toHaveAttribute('aria-expanded', 'false');
		await expect(sidebar).not.toHaveClass(/mobile-open/);
		await diagnostics.assertClean();
	});

	test('keeps mobile chrome at 860px', async ({ page }) => {
		await page.setViewportSize({ width: 860, height: 800 });
		await openMap(page);

		await expect(page.locator('.mobile-action-bar')).toBeVisible();
		await expect(page.locator('.map-toolbar')).toHaveCSS('position', 'static');
	});
});
