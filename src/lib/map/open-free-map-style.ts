import type { StyleSpecification } from 'maplibre-gl';

export type RemoteStyleLayer = {
	id?: string;
	type?: string;
	filter?: unknown;
	layout?: Record<string, unknown>;
};

export type RemoteStyle = {
	[key: string]: unknown;
	layers?: RemoteStyleLayer[];
};

export const openFreeMapStyleUrl = 'https://tiles.openfreemap.org/styles/liberty';

function filterUsesProperty(filter: unknown, property: string): boolean {
	if (!Array.isArray(filter)) return false;
	return filter.some(
		(value) => value === property || (Array.isArray(value) && filterUsesProperty(value, property))
	);
}

function coalesceRefLength(filter: unknown): unknown {
	if (!Array.isArray(filter)) return filter;
	if (
		filter[0] === '<=' &&
		Array.isArray(filter[1]) &&
		filter[1][0] === 'get' &&
		filter[1][1] === 'ref_length'
	) {
		return ['<=', ['coalesce', ['get', 'ref_length'], 0], filter[2]];
	}
	return filter.map((value) => coalesceRefLength(value));
}

function usesOpenSansFontStack(font: unknown): boolean {
	if (typeof font === 'string') return font.includes('Open Sans');
	return Array.isArray(font) && font.some((value) => usesOpenSansFontStack(value));
}

export function transformOpenFreeMapRequest(url: string, resourceType?: string) {
	if (resourceType !== 'Glyphs' || !url.includes('/fonts/')) return { url };

	try {
		const decodedUrl = decodeURIComponent(url);
		const brokenFontPrefix = '/fonts/Open Sans Regular,Arial Unicode MS Regular/';
		const fontStart = decodedUrl.indexOf(brokenFontPrefix);
		if (fontStart < 0) return { url };

		const rangeStart = fontStart + brokenFontPrefix.length;
		const range = decodedUrl.slice(rangeStart);
		return {
			url: encodeURI(`${decodedUrl.slice(0, fontStart)}/fonts/Noto Sans Regular/${range}`)
		};
	} catch {
		return { url };
	}
}

export function sanitizeOpenFreeMapStyle(style: RemoteStyle): StyleSpecification {
	return {
		...style,
		layers: style.layers?.map((layer) => {
			const nextLayer = { ...layer };
			const textFont = nextLayer.layout?.['text-font'];
			if (nextLayer.layout && usesOpenSansFontStack(textFont)) {
				nextLayer.layout = { ...nextLayer.layout, 'text-font': ['Noto Sans Regular'] };
			}
			if (filterUsesProperty(nextLayer.filter, 'ref_length')) {
				const filter = coalesceRefLength(nextLayer.filter);
				nextLayer.filter =
					Array.isArray(filter) && filter[0] === 'all'
						? ['all', ['has', 'ref_length'], ...filter.slice(1)]
						: ['all', ['has', 'ref_length'], filter];
			}
			return nextLayer;
		})
	} as unknown as StyleSpecification;
}

export async function loadOpenFreeMapStyle(
	fetcher: typeof fetch = fetch
): Promise<string | StyleSpecification> {
	try {
		const response = await fetcher(openFreeMapStyleUrl);
		if (!response.ok) throw new Error(`Map style returned ${response.status}`);
		return sanitizeOpenFreeMapStyle((await response.json()) as RemoteStyle);
	} catch {
		return openFreeMapStyleUrl;
	}
}
