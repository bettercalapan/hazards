import { expect, test, type Page } from '@playwright/test';

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
	await expect(page.locator('.map-status')).toBeHidden({ timeout: 30_000 });
	await page.waitForTimeout(750);
}

test.describe('map browser smoke tests', () => {
	test('loads the map without browser or map asset errors', async ({ page }) => {
		const diagnostics = installDiagnostics(page);
		await openMap(page);
		await diagnostics.assertClean();
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
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'clipboard', {
				configurable: true,
				value: { writeText: async () => undefined }
			});
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
			await expect(page.locator('.map-status')).toBeHidden({ timeout: 30_000 });
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
});
