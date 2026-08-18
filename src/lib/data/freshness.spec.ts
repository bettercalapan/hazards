import { describe, expect, it } from 'vitest';
import { formatDataDate, freshnessLabel, getFreshnessStatus } from './freshness';

const now = Date.parse('2026-08-18T12:00:00Z');

describe('hazard data freshness', () => {
	it('marks recent data current', () => {
		expect(getFreshnessStatus('2026-08-18T00:00:00Z', now)).toBe('current');
	});

	it('marks old data stale', () => {
		expect(getFreshnessStatus('2026-08-16T00:00:00Z', now)).toBe('stale');
	});

	it('marks missing, invalid, and future dates unknown', () => {
		expect(getFreshnessStatus(null, now)).toBe('unknown');
		expect(getFreshnessStatus('not-a-date', now)).toBe('unknown');
		expect(getFreshnessStatus('2026-08-19T00:00:00Z', now)).toBe('unknown');
	});

	it('formats dates and labels for the interface', () => {
		expect(formatDataDate(null)).toBe('Source date not provided');
		expect(formatDataDate('2026-08-18T00:00:00Z')).toBe('Aug 18, 2026');
		expect(freshnessLabel('current')).toBe('Current');
		expect(freshnessLabel('stale')).toBe('Stale');
		expect(freshnessLabel('unknown')).toBe('Date unknown');
	});
});
