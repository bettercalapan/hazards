import { describe, expect, it } from 'vitest';
import {
	createDefaultMapShareState,
	parseMapShareState,
	serializeMapShareState
} from './map-state';

describe('map share state', () => {
	it('uses the default map state when no query parameters exist', () => {
		const state = parseMapShareState('');

		expect(state).toEqual(createDefaultMapShareState());
	});

	it('round-trips the active family, layers, view, and barangay', () => {
		const state = parseMapShareState(
			'?family=earthquake&layers=tsunami,ground-shaking,tsunami&view=2d&area=PH1705205001'
		);

		expect(state.activeHazardFamily).toBe('earthquake');
		expect(state.enabledSeismicLayers).toEqual(['tsunami', 'ground-shaking']);
		expect(state.viewMode).toBe('2d');
		expect(state.selectedBarangayId).toBe('PH1705205001');
		expect(serializeMapShareState(state)).toBe(
			'?family=earthquake&layers=tsunami%2Cground-shaking&view=2d&area=PH1705205001'
		);
	});

	it('falls back safely for invalid values and supports no active layers', () => {
		const state = parseMapShareState(
			'?family=unknown&layers=not-a-layer&view=sideways&area=invalid'
		);

		expect(state.activeHazardFamily).toBe('flood');
		expect(state.enabledFloodPeriods).toEqual([]);
		expect(state.viewMode).toBe('3d');
		expect(state.selectedBarangayId).toBeNull();
	});

	it('serializes typhoon state without hazard layer values', () => {
		const state = parseMapShareState('?family=typhoon&view=2d');

		expect(serializeMapShareState(state)).toBe('?family=typhoon&layers=none&view=2d');
	});
});
