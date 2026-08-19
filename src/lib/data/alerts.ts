export const pagasaAlertFeedUrl = 'https://publicalert.pagasa.dost.gov.ph/feeds/';
const alertWindowMs = 24 * 60 * 60 * 1000;
const targetRegion = 'region 4-b';
const localAreaTerms = ['oriental mindoro', 'calapan'];

export type PagasaFeedEntry = {
	id: string;
	title: string;
	updatedAt: string;
	capUrl: string;
};

export type OfficialAlert = {
	id: string;
	title: string;
	url: string;
	updatedAt: string;
	sentAt: string;
	expiresAt: string;
	event: string;
	severity: string;
	certainty: string;
	urgency: string;
	localAreas: string[];
	instruction: string;
};

export type PagasaAlertsResult = {
	alerts: OfficialAlert[];
	sourceUpdatedAt: string | null;
};

function cleanAlertText(value: string): string {
	return value
		.replace(/\*\*/g, '')
		.replace(/`([^`]+)`/g, '$1')
		.trim();
}

function decodeXml(value: string): string {
	return value
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
			const parsed = code.toLowerCase().startsWith('x')
				? Number.parseInt(code.slice(1), 16)
				: Number.parseInt(code, 10);
			return Number.isNaN(parsed) ? _ : String.fromCodePoint(parsed);
		})
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function readRawTag(value: string, tag: string): string {
	const match = value.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
	return match ? match[1] : '';
}

function readTag(value: string, tag: string): string {
	return decodeXml(readRawTag(value, tag));
}

function readAttribute(value: string, tag: string, attribute: string): string {
	const tagMatch = value.match(new RegExp(`<${tag}\\b[^>]*>`, 'i'));
	const attributeMatch = tagMatch?.[0].match(
		new RegExp(`${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'i')
	);
	return attributeMatch ? decodeXml(attributeMatch[2]) : '';
}

export function parsePagasaFeed(xml: string, now = Date.now()): PagasaFeedEntry[] {
	const windowStart = now - alertWindowMs;
	const entries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)]
		.map((match) => {
			const entry = match[1];
			const title = readTag(entry, 'title');
			const updatedAt = readTag(entry, 'updated');
			const capUrl = readAttribute(entry, 'link', 'href');
			return {
				id: readTag(entry, 'id') || capUrl || `${title}-${updatedAt}`,
				title,
				updatedAt,
				capUrl,
				updatedTime: Date.parse(updatedAt)
			};
		})
		.filter(
			(entry) =>
				entry.title.toLowerCase().includes(targetRegion) &&
				entry.capUrl &&
				Number.isFinite(entry.updatedTime) &&
				entry.updatedTime >= windowStart &&
				entry.updatedTime <= now
		)
		.sort((left, right) => right.updatedTime - left.updatedTime);

	return [...new Map(entries.map((entry) => [entry.capUrl, entry])).values()].map((entry) => ({
		id: entry.id,
		title: entry.title,
		updatedAt: entry.updatedAt,
		capUrl: entry.capUrl
	}));
}

export function latestPagasaFeedUpdate(entries: PagasaFeedEntry[]): string | null {
	return entries[0]?.updatedAt || null;
}

export function parsePagasaCap(
	xml: string,
	entry: PagasaFeedEntry,
	now = Date.now()
): OfficialAlert | null {
	const info = readRawTag(xml, 'info');
	const areas = [...xml.matchAll(/<area\b[^>]*>([\s\S]*?)<\/area>/gi)]
		.map((match) => readTag(match[1], 'areaDesc'))
		.filter(Boolean);
	const expiresAt = readTag(info, 'expires');
	const expiresTime = Date.parse(expiresAt);
	const status = readTag(xml, 'status').toLowerCase();
	const messageType = readTag(xml, 'msgType').toLowerCase();
	const hasLocalArea = areas.some((area) =>
		localAreaTerms.some((term) => area.toLowerCase().includes(term))
	);
	const localAreas = areas.filter((area) =>
		localAreaTerms.some((term) => area.toLowerCase().includes(term))
	);

	if (
		!info ||
		!entry.capUrl ||
		status !== 'actual' ||
		messageType === 'cancel' ||
		!hasLocalArea ||
		(Number.isFinite(expiresTime) && expiresTime <= now)
	) {
		return null;
	}

	const event = readTag(info, 'event') || readTag(info, 'headline') || entry.title;
	return {
		id: readTag(xml, 'identifier') || entry.id,
		title: readTag(info, 'headline') || event,
		url: entry.capUrl,
		updatedAt: entry.updatedAt,
		sentAt: readTag(xml, 'sent'),
		expiresAt,
		event,
		severity: readTag(info, 'severity'),
		certainty: readTag(info, 'certainty'),
		urgency: readTag(info, 'urgency'),
		localAreas,
		instruction: cleanAlertText(readTag(info, 'instruction'))
	};
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function fetchPagasaAlerts(
	fetcher: Fetcher,
	now = Date.now()
): Promise<PagasaAlertsResult> {
	const feedResponse = await fetcher(pagasaAlertFeedUrl, {
		headers: { accept: 'application/atom+xml, application/xml' },
		cf: { cacheTtlByStatus: { '200-299': 300, '400-599': 0 } }
	});
	if (!feedResponse.ok) throw new Error(`PAGASA alert feed returned ${feedResponse.status}`);

	const entries = parsePagasaFeed(await feedResponse.text(), now);
	const results = await Promise.all(
		entries.map(async (entry) => {
			try {
				const response = await fetcher(entry.capUrl, {
					headers: { accept: 'application/cap+xml, application/xml' }
				});
				if (!response.ok) return { fetched: false, alert: null };
				return { fetched: true, alert: parsePagasaCap(await response.text(), entry, now) };
			} catch {
				return { fetched: false, alert: null };
			}
		})
	);

	if (entries.length > 0 && results.every((result) => !result.fetched)) {
		throw new Error('PAGASA CAP alerts could not be fetched');
	}

	const uniqueAlerts = new Map(
		results.flatMap((result) => (result.alert ? [[result.alert.id, result.alert] as const] : []))
	);
	const alerts = [...uniqueAlerts.values()].sort(
		(left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
	);

	return { alerts, sourceUpdatedAt: latestPagasaFeedUpdate(entries) };
}

export function formatAlertDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'not provided';

	return new Intl.DateTimeFormat('en-PH', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Manila'
	}).format(new Date(value));
}
