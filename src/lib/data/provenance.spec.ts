import { describe, expect, it } from 'vitest';
import { calapanBarangayMetadata } from './barangays';
import { floodHazardMetadata } from './flood';
import hazardDataManifest from './hazard-data-manifest.json';
import { landslideMetadata } from './landslide';
import { seismicMetadata } from './seismic';
import { stormSurgeMetadata } from './storm-surge';

const staticDatasets = [
	floodHazardMetadata,
	stormSurgeMetadata,
	landslideMetadata,
	seismicMetadata,
	calapanBarangayMetadata
];

describe('dataset provenance', () => {
	it('documents coverage, date limitations, and licensing notes', () => {
		for (const dataset of staticDatasets) {
			expect(dataset.coverage).toBeTruthy();
			expect(dataset.sourceDateNote).toBeTruthy();
			expect(dataset.licenseNote).toBeTruthy();
		}
		expect(calapanBarangayMetadata.preparedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('keeps the storm-surge creation date distinct from unknown source dates', () => {
		expect(stormSurgeMetadata.sourceDate).toBe('2021-07-19');
		expect(floodHazardMetadata.sourceDate).toBeNull();
		expect(landslideMetadata.sourceDate).toBeNull();
		expect(seismicMetadata.sourceDate).toBeNull();
	});

	it('records all generated hazard datasets in the manifest', () => {
		expect(Number.isFinite(Date.parse(hazardDataManifest.generatedAt))).toBe(true);
		expect(hazardDataManifest.coverage).toBe('Calapan City');
		expect(hazardDataManifest.hazardSets.map((set) => set.key)).toEqual([
			'flood',
			'storm-surge',
			'landslide',
			'ground-shaking',
			'liquefaction',
			'tsunami'
		]);
	});
});
