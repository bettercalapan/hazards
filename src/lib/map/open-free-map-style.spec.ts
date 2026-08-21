import type { RemoteStyle, RemoteStyleLayer } from './open-free-map-style';

import { describe, expect, it } from 'vitest';
import {
	loadOpenFreeMapStyle,
	openFreeMapStyleUrl,
	sanitizeOpenFreeMapStyle,
	transformOpenFreeMapRequest
} from './open-free-map-style';

describe('OpenFreeMap style utilities', () => {
	it('replaces broken fonts and guards ref_length filters without mutating the input', () => {
		const style: RemoteStyle = {
			version: 8,
			layers: [
				{
					id: 'roads',
					type: 'line',
					layout: { 'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'] },
					filter: ['all', ['<=', ['get', 'ref_length'], 100]]
				},
				{ id: 'land', type: 'fill', layout: { visibility: 'visible' } }
			]
		};

		const sanitized = sanitizeOpenFreeMapStyle(style);
		const roads = sanitized.layers?.[0] as unknown as RemoteStyleLayer | undefined;

		expect(roads?.layout?.['text-font']).toEqual(['Noto Sans Regular']);
		expect(roads?.filter).toEqual([
			'all',
			['has', 'ref_length'],
			['<=', ['coalesce', ['get', 'ref_length'], 0], 100]
		]);
		expect(style.layers?.[0].layout?.['text-font']).toEqual([
			'Open Sans Regular',
			'Arial Unicode MS Regular'
		]);
	});

	it('rewrites the broken OpenFreeMap glyph font path', () => {
		const request = transformOpenFreeMapRequest(
			'https://tiles.openfreemap.org/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/0-255.pbf',
			'Glyphs'
		);

		expect(request.url).toBe('https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf');
	});

	it('leaves unrelated and malformed requests unchanged', () => {
		const url = 'https://tiles.openfreemap.org/fonts/Open%20Sans%ZZ/0-255.pbf';

		expect(transformOpenFreeMapRequest(url, 'Glyphs')).toEqual({ url });
		expect(transformOpenFreeMapRequest(url, 'Tile')).toEqual({ url });
	});

	it('returns the sanitized style on success and the URL on failure', async () => {
		const style: RemoteStyle = { version: 8, layers: [] };
		const success = await loadOpenFreeMapStyle(
			async () => new Response(JSON.stringify(style), { status: 200 })
		);
		const failure = await loadOpenFreeMapStyle(async () => new Response('', { status: 503 }));

		expect(success).toMatchObject({ version: 8, layers: [] });
		expect(failure).toBe(openFreeMapStyleUrl);
	});
});
