import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import geojsonvt from 'geojson-vt';
import polygonClipping from 'polygon-clipping';
import vtpbf from 'vt-pbf';

const { intersection } = polygonClipping;
const run = promisify(execFile);
const projectRoot = process.cwd();
const sourceRoot = process.env.NOAH_DATA_DIR ?? path.join(homedir(), 'downloads/noah');
const outputRoot = path.join(projectRoot, 'static');
const dataRoot = path.join(projectRoot, 'src/lib/data');
const boundaryFile = path.join(dataRoot, 'calapan-city.json');
const mapshaperBin = path.join(projectRoot, 'node_modules/mapshaper/bin/mapshaper');
const minZoom = 10;
const maxZoom = 15;
const cityBounds = [121.10036758600006, 13.296270203000063, 121.28920787700008, 13.467073836000054];

const periods = [
	{
		key: '5',
		label: '5-year',
		file: path.join(sourceRoot, '5yr/Mindoro_FH_5yr.shp')
	},
	{
		key: '25',
		label: '25-year',
		file: path.join(sourceRoot, '25yr/OrientalMindoro_FH_25yr.shp')
	},
	{
		key: '100',
		label: '100-year',
		file: path.join(sourceRoot, '100yr/OrientalMindoro_Flood_100year.shp')
	}
];

const barangays = JSON.parse(await readFile(path.join(dataRoot, 'calapan-barangays.json'), 'utf8'));

function asMultiPolygon(geometry) {
	if (geometry.type === 'Polygon') return [geometry.coordinates];
	if (geometry.type === 'MultiPolygon') return geometry.coordinates;
	throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

function getHazardClass(properties) {
	const entry = Object.entries(properties ?? {}).find(([key]) => key.toLowerCase() === 'var');
	const value = Number(entry?.[1]);

	if (![1, 2, 3].includes(value)) {
		throw new Error(`Unsupported flood class: ${entry?.[1] ?? 'missing'}`);
	}

	return value;
}

function bbox(coordinates) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	function visit(value) {
		if (typeof value[0] === 'number') {
			minX = Math.min(minX, value[0]);
			minY = Math.min(minY, value[1]);
			maxX = Math.max(maxX, value[0]);
			maxY = Math.max(maxY, value[1]);
			return;
		}

		for (const child of value) visit(child);
	}

	visit(coordinates);
	return [minX, minY, maxX, maxY];
}

function bboxesOverlap(left, right) {
	return left[0] <= right[2] && left[2] >= right[0] && left[1] <= right[3] && left[3] >= right[1];
}

function ringArea(ring) {
	let area = 0;
	for (let index = 0; index < ring.length - 1; index += 1) {
		area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
	}
	return Math.abs(area) / 2;
}

function multiPolygonArea(multiPolygon) {
	return multiPolygon.reduce(
		(total, polygon) =>
			total +
			ringArea(polygon[0]) -
			polygon.slice(1).reduce((sum, hole) => sum + ringArea(hole), 0),
		0
	);
}

function className(value) {
	return ['Low', 'Medium', 'High'][value - 1];
}

async function loadPeriod(period, tempRoot) {
	const clippedFile = path.join(tempRoot, `${period.key}-cells.json`);
	const summaryFile = path.join(tempRoot, `${period.key}-summary.json`);
	const sourceArgs = [mapshaperBin, period.file, '-clip', boundaryFile];

	await run(process.execPath, [
		...sourceArgs,
		'-o',
		clippedFile,
		'format=geojson',
		'precision=0.000001'
	]);
	await run(process.execPath, [
		...sourceArgs,
		'-clean',
		'-dissolve',
		'Var',
		'-simplify',
		'10%',
		'-o',
		summaryFile,
		'format=geojson',
		'precision=0.000001'
	]);

	const cellSource = JSON.parse(await readFile(clippedFile, 'utf8'));
	const summarySource = JSON.parse(await readFile(summaryFile, 'utf8'));
	const cellFeatures = [];

	for (const feature of cellSource.features) {
		cellFeatures.push({
			type: 'Feature',
			properties: { Var: getHazardClass(feature.properties) },
			geometry: feature.geometry
		});
	}

	const summaryFeatures = summarySource.features.map((feature) => ({
		...feature,
		properties: { Var: getHazardClass(feature.properties) },
		bbox: bbox(feature.geometry.coordinates)
	}));

	console.log(
		`${period.label}: ${cellFeatures.length} cell features, ${summaryFeatures.length} summary features`
	);

	return {
		period,
		cellCollection: {
			type: 'FeatureCollection',
			features: cellFeatures
		},
		summaryFeatures
	};
}

function longitudeToTileX(longitude, zoom) {
	return Math.floor(((longitude + 180) / 360) * 2 ** zoom);
}

function latitudeToTileY(latitude, zoom) {
	const radians = (latitude * Math.PI) / 180;
	return Math.floor(
		((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** zoom
	);
}

async function writeVectorTiles(period, collection) {
	const outputDirectory = path.join(outputRoot, `calapan-flood-hazard-${period.key}yr-tiles`);
	await rm(outputDirectory, { recursive: true, force: true });

	const tileIndex = geojsonvt(collection, {
		buffer: 0,
		extent: 4096,
		indexMaxPoints: 0,
		indexMaxZoom: maxZoom,
		maxZoom,
		tolerance: 0
	});

	for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
		const tileCount = 2 ** zoom;
		const minX = Math.max(0, longitudeToTileX(cityBounds[0], zoom) - 1);
		const maxX = Math.min(tileCount - 1, longitudeToTileX(cityBounds[2], zoom) + 1);
		const minY = Math.max(0, latitudeToTileY(cityBounds[3], zoom) - 1);
		const maxY = Math.min(tileCount - 1, latitudeToTileY(cityBounds[1], zoom) + 1);

		for (let x = minX; x <= maxX; x += 1) {
			for (let y = minY; y <= maxY; y += 1) {
				const tile = tileIndex.getTile(zoom, x, y);
				if (!tile || tile.features.length === 0) continue;

				const tilePath = path.join(outputDirectory, String(zoom), String(x), `${y}.pbf`);
				await mkdir(path.dirname(tilePath), { recursive: true });
				await writeFile(tilePath, vtpbf.fromGeojsonVt({ flood: tile }));
			}
		}
	}
}

const tempRoot = path.join(projectRoot, '.svelte-kit/flood-data');
await mkdir(tempRoot, { recursive: true });
const loadedPeriods = await Promise.all(periods.map((period) => loadPeriod(period, tempRoot)));
const summaries = {};

for (const barangay of barangays.features) {
	const barangayCoordinates = asMultiPolygon(barangay.geometry);
	const barangayBbox = bbox(barangayCoordinates);
	summaries[barangay.properties.id] = {};

	for (const { period, summaryFeatures } of loadedPeriods) {
		const classes = new Set();

		for (const feature of summaryFeatures) {
			if (!bboxesOverlap(barangayBbox, feature.bbox)) continue;

			const overlap = intersection(feature.geometry.coordinates, barangayCoordinates);
			if (overlap.length > 0 && multiPolygonArea(overlap) > 1e-12) {
				classes.add(className(feature.properties.Var));
			}
		}

		const sortedClasses = ['Low', 'Medium', 'High'].filter((value) => classes.has(value));
		summaries[barangay.properties.id][period.key] = {
			classes: sortedClasses,
			summary:
				sortedClasses.length === 0
					? 'NoData'
					: sortedClasses.length === 1
						? sortedClasses[0]
						: 'Mixed'
		};
	}
}

for (const { period, cellCollection } of loadedPeriods) {
	await writeVectorTiles(period, cellCollection);
}

await writeFile(
	path.join(dataRoot, 'calapan-flood-summaries.json'),
	`${JSON.stringify(summaries, null, '\t')}\n`
);

console.log(
	`Wrote ${loadedPeriods.length} localized flood tile sets and ${Object.keys(summaries).length} barangay summaries`
);
