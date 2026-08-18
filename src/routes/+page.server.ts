import type { PageServerLoad } from './$types';
import { fetchPagasaAlerts } from '$lib/data/alerts';
import { emptyTyphoonMapData, fetchPanahonTyphoonTracks } from '$lib/data/typhoon';

export const load: PageServerLoad = async ({ fetch }) => {
	const fetchedAt = new Date().toISOString();
	const [alertsResult, typhoonResult] = await Promise.allSettled([
		fetchPagasaAlerts(fetch),
		fetchPanahonTyphoonTracks(fetch)
	]);

	return {
		alertFeedStatus:
			alertsResult.status === 'fulfilled' ? ('ready' as const) : ('unavailable' as const),
		activeAlerts: alertsResult.status === 'fulfilled' ? alertsResult.value.alerts : [],
		alertsSourceUpdatedAt:
			alertsResult.status === 'fulfilled' ? alertsResult.value.sourceUpdatedAt : null,
		alertsFetchedAt: fetchedAt,
		typhoonTrackStatus:
			typhoonResult.status === 'fulfilled' ? ('ready' as const) : ('unavailable' as const),
		typhoonMapData:
			typhoonResult.status === 'fulfilled' ? typhoonResult.value : emptyTyphoonMapData,
		typhoonFetchedAt: fetchedAt
	};
};
