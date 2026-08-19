import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceConfig = JSON.parse(
	await readFile(path.join(projectRoot, 'src/lib/data/critical-facility-sources.json'), 'utf8')
);
const cityBoundary = JSON.parse(
	await readFile(path.join(projectRoot, 'src/lib/data/calapan-city.json'), 'utf8')
);
const outputFile = path.join(projectRoot, 'static/critical-facilities.json');
const generatedAt = new Date().toISOString();

function pointInRing(point, ring) {
	let inside = false;
	for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
		const [longitude, latitude] = ring[index];
		const [previousLongitude, previousLatitude] = ring[previous];
		const intersects =
			latitude > point[1] !== previousLatitude > point[1] &&
			point[0] <
				((previousLongitude - longitude) * (point[1] - latitude)) / (previousLatitude - latitude) +
					longitude;
		if (intersects) inside = !inside;
	}
	return inside;
}

function pointInCalapan(point) {
	return cityBoundary.geometry.coordinates.some((polygon) => {
		if (!pointInRing(point, polygon[0])) return false;
		return polygon.slice(1).every((hole) => !pointInRing(point, hole));
	});
}

function readFacilityName(properties) {
	const value = properties?.name ?? properties?.Name;
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeRemoteFeatures(source, value) {
	if (!value || typeof value !== 'object' || !Array.isArray(value.features)) {
		throw new Error(`${source.category} source is not a FeatureCollection`);
	}

	return value.features.flatMap((feature) => {
		if (!feature || typeof feature !== 'object') return [];
		const geometry = feature.geometry;
		if (
			geometry?.type !== 'Point' ||
			!Array.isArray(geometry.coordinates) ||
			geometry.coordinates.length < 2
		) {
			return [];
		}

		const longitude = Number(geometry.coordinates[0]);
		const latitude = Number(geometry.coordinates[1]);
		if (
			!Number.isFinite(longitude) ||
			!Number.isFinite(latitude) ||
			!pointInCalapan([longitude, latitude])
		) {
			return [];
		}

		const name = readFacilityName(feature.properties);
		if (!name) return [];

		return [
			{
				type: 'Feature',
				properties: {
					...(feature.properties ?? {}),
					category: source.category,
					categoryLabel: source.label,
					name,
					verificationStatus: 'source-listed',
					sourceLabel: source.sourceLabel,
					sourceUrl: source.url
				},
				geometry: { type: 'Point', coordinates: [longitude, latitude] }
			}
		];
	});
}

const remoteFeatures = [];
for (const source of sourceConfig.remoteSources) {
	const response = await fetch(source.url, {
		headers: { accept: 'application/geo+json, application/json' }
	});
	if (!response.ok) throw new Error(`${source.category} returned ${response.status}`);
	const features = normalizeRemoteFeatures(source, await response.json());
	remoteFeatures.push(...features);
	console.log(`${source.label}: ${features.length} Calapan features`);
}

const curatedFeatures = sourceConfig.curatedFeatures.filter((feature) =>
	pointInCalapan(feature.geometry.coordinates)
);
const snapshot = {
	type: 'FeatureCollection',
	features: [...curatedFeatures, ...remoteFeatures],
	metadata: {
		generatedAt,
		coverage: 'Calapan City',
		curatedFeatures: curatedFeatures.length,
		remoteSources: sourceConfig.remoteSources.map(({ category, label, sourceLabel, url }) => ({
			category,
			label,
			sourceLabel,
			url
		}))
	}
};

await writeFile(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${snapshot.features.length} critical facilities to ${outputFile}`);
