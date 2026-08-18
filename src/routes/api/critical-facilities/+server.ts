import { json, type RequestHandler } from '@sveltejs/kit';
import {
	criticalFacilitySources,
	emptyCriticalFacilities,
	normalizeCriticalFacilities,
	type CriticalFacilityCollection
} from '$lib/data/critical-facilities';

export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
	});

	try {
		const responses = await Promise.all(
			criticalFacilitySources.map(async (source) => {
				const response = await fetch(source.url, {
					headers: { accept: 'application/geo+json, application/json' }
				});
				if (!response.ok) throw new Error(`${source.category} returned ${response.status}`);
				return { source, value: await response.json() };
			})
		);

		const result = responses.reduce<CriticalFacilityCollection>(
			(collection, { source, value }) => {
				collection.features.push(...normalizeCriticalFacilities(source, value).features);
				return collection;
			},
			{ ...emptyCriticalFacilities, features: [] }
		);

		return json(result);
	} catch {
		return json({ error: 'Critical facility data is unavailable.' }, { status: 502 });
	}
};
