import type { PageServerLoad } from './$types';
import { emptyTyphoonMapData, fetchPanahonTyphoonTracks } from '$lib/data/typhoon';
import { parseMapShareState } from '$lib/map-state';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const fetchedAt = new Date().toISOString();
	let typhoonTrackStatus: 'ready' | 'unavailable' = 'unavailable';
	let typhoonMapData = emptyTyphoonMapData;

	try {
		typhoonMapData = await fetchPanahonTyphoonTracks(fetch);
		typhoonTrackStatus = 'ready';
	} catch {
		// Keep the map available when the optional live track feed fails.
	}

	return {
		initialMapState: parseMapShareState(url.searchParams),
		typhoonTrackStatus,
		typhoonMapData,
		typhoonFetchedAt: fetchedAt
	};
};
