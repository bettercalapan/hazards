export type FreshnessStatus = 'current' | 'stale' | 'unknown';

export const defaultFreshnessWindowMs = 24 * 60 * 60 * 1000;

export function getFreshnessStatus(
	value: string | null,
	now = Date.now(),
	maxAgeMs = defaultFreshnessWindowMs
): FreshnessStatus {
	if (!value) return 'unknown';

	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp) || timestamp > now) return 'unknown';

	return now - timestamp > maxAgeMs ? 'stale' : 'current';
}

export function formatDataDate(value: string | null): string {
	if (!value) return 'Source date not provided';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Source date not provided';

	return new Intl.DateTimeFormat('en-PH', {
		dateStyle: 'medium',
		timeZone: 'Asia/Manila'
	}).format(date);
}

export function freshnessLabel(status: FreshnessStatus): string {
	if (status === 'current') return 'Current';
	if (status === 'stale') return 'Stale';
	return 'Date unknown';
}
