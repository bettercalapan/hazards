import type { PageServerLoad } from './$types';
import { fetchPagasaAlerts } from '$lib/data/alerts';

export const load: PageServerLoad = async ({ fetch }) => {
	const fetchedAt = new Date().toISOString();

	try {
		return {
			alertFeedStatus: 'ready' as const,
			activeAlerts: await fetchPagasaAlerts(fetch),
			alertsFetchedAt: fetchedAt
		};
	} catch {
		return {
			alertFeedStatus: 'unavailable' as const,
			activeAlerts: [],
			alertsFetchedAt: fetchedAt
		};
	}
};
