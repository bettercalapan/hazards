import { describe, expect, it } from 'vitest';
import {
	fetchPagasaAlerts,
	formatAlertDate,
	latestPagasaFeedUpdate,
	pagasaAlertFeedUrl,
	parsePagasaCap,
	parsePagasaFeed
} from './alerts';

const now = Date.parse('2026-08-17T12:00:00Z');
const feed = `
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>urn:uuid:mimaropa-1</id>
    <title>GFA #2 - Region 4-B (MIMAROPA)</title>
    <updated>2026-08-17T10:00:00+08:00</updated>
    <link type="application/cap+xml" href="https://publicalert.pagasa.dost.gov.ph/output/gfa/mimaropa-1.cap" />
  </entry>
  <entry>
    <id>urn:uuid:ncr-1</id>
    <title>GFA #2 - NCR</title>
    <updated>2026-08-17T11:00:00+08:00</updated>
    <link type="application/cap+xml" href="https://publicalert.pagasa.dost.gov.ph/output/gfa/ncr-1.cap" />
  </entry>
  <entry>
    <id>urn:uuid:mimaropa-old</id>
    <title>GFA #1 - Region 4-B (MIMAROPA)</title>
    <updated>2026-08-15T10:00:00+08:00</updated>
    <link type="application/cap+xml" href="https://publicalert.pagasa.dost.gov.ph/output/gfa/mimaropa-old.cap" />
  </entry>
</feed>`;

const entry = {
	id: 'urn:uuid:mimaropa-1',
	title: 'GFA #2 - Region 4-B (MIMAROPA)',
	updatedAt: '2026-08-17T10:00:00+08:00',
	capUrl: 'https://publicalert.pagasa.dost.gov.ph/output/gfa/mimaropa-1.cap'
};

const cap = `
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>mimaropa-1</identifier>
  <sender>PAGASA-DOST</sender>
  <sent>2026-08-17T10:00:00+08:00</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <info>
    <event>General Flood Advisory (Moderate)</event>
    <headline>General Flood Advisory</headline>
    <severity>Moderate</severity>
    <certainty>Possible</certainty>
    <urgency>Future</urgency>
    <expires>2026-08-18T10:00:00+08:00</expires>
    <description>Rivers in Oriental Mindoro may be affected.</description>
    <instruction>Take necessary precautionary measures.</instruction>
    <area><areaDesc>Oriental Mindoro</areaDesc></area>
    <area><areaDesc>Romblon</areaDesc></area>
  </info>
</alert>`;

describe('PAGASA alerts', () => {
	it('keeps recent MIMAROPA CAP entries', () => {
		expect(parsePagasaFeed(feed, now)).toEqual([entry]);
	});

	it('returns the source feed update timestamp', async () => {
		const result = await fetchPagasaAlerts(async (input) => {
			if (String(input) === pagasaAlertFeedUrl) return new Response(feed);
			return new Response(cap);
		}, now);

		expect(result.sourceUpdatedAt).toBe(entry.updatedAt);
		expect(result.alerts).toHaveLength(1);
		expect(latestPagasaFeedUpdate(parsePagasaFeed(feed, now))).toBe(entry.updatedAt);
		expect(latestPagasaFeedUpdate([])).toBeNull();
	});

	it('keeps active alerts covering Oriental Mindoro', () => {
		expect(parsePagasaCap(cap, entry, now)).toMatchObject({
			id: 'mimaropa-1',
			title: 'General Flood Advisory',
			event: 'General Flood Advisory (Moderate)',
			severity: 'Moderate',
			areas: ['Oriental Mindoro', 'Romblon'],
			localAreas: ['Oriental Mindoro'],
			instruction: 'Take necessary precautionary measures.'
		});
	});

	it('supports non-flood alerts and cleans instruction markup', () => {
		const cycloneCap = cap
			.replace('General Flood Advisory (Moderate)', 'Tropical Cyclone Bulletin')
			.replace('General Flood Advisory', 'Tropical Cyclone Bulletin')
			.replace('Moderate', 'Severe')
			.replace('Take necessary precautionary measures.', '**Follow official instructions.**');

		expect(parsePagasaCap(cycloneCap, entry, now)).toMatchObject({
			event: 'Tropical Cyclone Bulletin',
			severity: 'Severe',
			instruction: 'Follow official instructions.'
		});
	});

	it('handles a missing expiry timestamp', () => {
		const noExpiryCap = cap.replace('<expires>2026-08-18T10:00:00+08:00</expires>', '');
		expect(parsePagasaCap(noExpiryCap, entry, now)).toMatchObject({ expiresAt: '' });
		expect(formatAlertDate('')).toBe('not provided');
	});

	it('ignores expired alerts', () => {
		const expiredCap = cap.replace('2026-08-18T10:00:00+08:00', '2026-08-17T11:00:00+08:00');
		expect(parsePagasaCap(expiredCap, entry, now)).toBeNull();
	});

	it('formats alert timestamps in Philippine time', () => {
		expect(formatAlertDate('2026-08-17T10:00:00Z')).toContain('Aug 17, 2026');
		expect(formatAlertDate('2026-08-17T10:00:00Z')).toContain('6:00 PM');
	});
});
