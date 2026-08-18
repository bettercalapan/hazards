import { describe, expect, it } from 'vitest';
import { buildTyphoonMapData, parsePanahonCycloneTracks } from './typhoon';

const now = Date.parse('2026-08-18T12:00:00Z');

const payload = [
	{
		cyclone_name: 'MAYMAY{KUJIRA}',
		info: {
			'2026-08-18 00:00': {
				cyclone_type: 'TD',
				latitude: '13.35',
				longitude: '121.12',
				radius: '0'
			},
			'2026-08-18 12:00': {
				cyclone_type: 'TS',
				latitude: '13.4',
				longitude: '121.18',
				radius: '0'
			},
			'2026-08-19 00:00': {
				cyclone_type: 'TY',
				latitude: '13.45',
				longitude: '121.24',
				radius: '150'
			}
		}
	}
];

describe('PANaHON typhoon tracks', () => {
	it('parses the timestamped info response', () => {
		expect(parsePanahonCycloneTracks(payload, now)).toEqual([
			{
				id: '0',
				name: 'MAYMAY (KUJIRA)',
				points: [
					{ latitude: 13.35, longitude: 121.12, time: '2026-08-18 00:00', type: 'TD', radius: 0 },
					{ latitude: 13.4, longitude: 121.18, time: '2026-08-18 12:00', type: 'TS', radius: 0 },
					{ latitude: 13.45, longitude: 121.24, time: '2026-08-19 00:00', type: 'TY', radius: 150 }
				]
			}
		]);
	});

	it('ignores tracks whose latest point is stale', () => {
		const stalePayload = [
			{
				info: {
					'2026-08-16T00:00:00Z': { lat: 13.35, lon: 121.12 },
					'2026-08-16T12:00:00Z': { lat: 13.4, lon: 121.18 }
				}
			}
		];

		expect(parsePanahonCycloneTracks(stalePayload, now)).toEqual([]);
	});

	it('creates colored grid cells from track type and distance', () => {
		const track = parsePanahonCycloneTracks(payload, now)[0];
		expect(track).toBeDefined();
		const mapData = buildTyphoonMapData([track!]);

		expect(mapData.names).toEqual(['MAYMAY (KUJIRA)']);
		expect(mapData.tracks.features).toHaveLength(2);
		expect(mapData.points.features).toHaveLength(3);
		expect(mapData.grid.features.length).toBeGreaterThan(0);
		expect(mapData.tracks.features[1].properties.forecast).toBe(true);
		expect(new Set(mapData.grid.features.map((feature) => feature.properties.type))).toEqual(
			new Set(['TS', 'TY'])
		);
		expect(new Set(mapData.grid.features.map((feature) => feature.properties.proximity))).toEqual(
			new Set([1, 2, 3, 4])
		);
	});
});
