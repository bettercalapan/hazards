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
const floodRoot = path.join(sourceRoot, 'flood');
const stormSurgeRoot = path.join(sourceRoot, 'storm-surge');
const landslideRoot = path.join(sourceRoot, 'landslide');
const outputRoot = path.join(projectRoot, 'static');
const dataRoot = path.join(projectRoot, 'src/lib/data');
const boundaryFile = path.join(dataRoot, 'calapan-city.json');
const mapshaperBin = path.join(projectRoot, 'node_modules/mapshaper/bin/mapshaper');
const minZoom = 10;
const maxZoom = 15;
const cityBounds = [121.10036758600006, 13.296270203000063, 121.28920787700008, 13.467073836000054];
const generatedAt = new Date().toISOString();

const hazardSets = [
	{
		key: 'flood',
		tilePrefix: 'calapan-flood-hazard',
		summaryFile: 'calapan-flood-summaries.json',
		tileSuffix: (period) => `${period.key}yr`,
		classField: 'Var',
		periods: [
			{
				key: '5',
				label: '5-year',
				file: path.join(floodRoot, '5yr/Mindoro_FH_5yr.shp')
			},
			{
				key: '25',
				label: '25-year',
				file: path.join(floodRoot, '25yr/OrientalMindoro_FH_25yr.shp')
			},
			{
				key: '100',
				label: '100-year',
				file: path.join(floodRoot, '100yr/OrientalMindoro_Flood_100year.shp')
			}
		]
	},
	{
		key: 'storm-surge',
		tilePrefix: 'calapan-storm-surge',
		summaryFile: 'calapan-storm-surge-summaries.json',
		tileSuffix: (period) => `advisory-${period.key}`,
		classField: 'HAZ',
		periods: [1, 2, 3, 4].map((advisory) => ({
			key: String(advisory),
			label: `Storm Surge Advisory ${advisory}`,
			file: path.join(
				stormSurgeRoot,
				`ss-advisory-${advisory}/OrientalMindoro_StormSurge_SSA${advisory}.shp`
			)
		}))
	},
	{
		key: 'landslide',
		tilePrefix: 'calapan-landslide',
		summaryFile: 'calapan-landslide-summaries.json',
		tileSuffix: () => 'hazard',
		classField: 'LH',
		periods: [
			{
				key: 'main',
				label: 'Landslide hazard',
				file: path.join(landslideRoot, 'hazards/OrientalMindoro_LandslideHazards.shp')
			}
		]
	},
	{
		key: 'ground-shaking',
		tilePrefix: 'calapan',
		summaryFile: 'calapan-ground-shaking-summaries.json',
		tileSuffix: () => 'ground-shaking',
		classFields: ['peiscode'],
		classMap: { '06': 1, '07': 2, '08': 3 },
		classLabels: [
			'VI, very strong ground shaking',
			'VII, destructive ground shaking',
			'VIII, very destructive to devastating ground shaking'
		],
		periods: [
			{
				key: 'ground-shaking',
				label: 'Ground shaking',
				file: path.join(dataRoot, 'phivolcs-ground-shaking.json')
			}
		]
	},
	{
		key: 'liquefaction',
		tilePrefix: 'calapan',
		summaryFile: 'calapan-liquefaction-summaries.json',
		tileSuffix: () => 'liquefaction',
		classFields: ['lccode'],
		classMap: { '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6, '07': 7 },
		classLabels: [
			'Generally Susceptible',
			'Low Potential',
			'Moderate Potential',
			'High Potential',
			'Least Susceptible',
			'Moderately Susceptible',
			'Highly Susceptible'
		],
		periods: [
			{
				key: 'liquefaction',
				label: 'Liquefaction',
				file: path.join(dataRoot, 'phivolcs-liquefaction.json')
			}
		]
	},
	{
		key: 'tsunami',
		tilePrefix: 'calapan',
		summaryFile: 'calapan-tsunami-summaries.json',
		tileSuffix: () => 'tsunami',
		classFields: ['inundescode', 'inundtcode'],
		classMap: {
			'01,08': 1,
			'02,01': 2,
			'02,02': 3,
			'02,03': 4,
			'02,04': 5,
			'02,05': 6,
			'02,06': 7,
			'02,07': 8
		},
		classLabels: [
			'General inundation, Inundated',
			'Inundation depth, < 1 meter',
			'Inundation depth, 1 to < 2 meters',
			'Inundation depth, 2 to < 3 meters',
			'Inundation depth, 3 to < 4 meters',
			'Inundation depth, 4 to < 5 meters',
			'Inundation depth, 5 to 6 meters',
			'Inundation depth, > 6 meters'
		],
		periods: [
			{
				key: 'tsunami',
				label: 'Tsunami',
				file: path.join(dataRoot, 'phivolcs-tsunami.json')
			}
		]
	}
];

const barangays = JSON.parse(await readFile(path.join(dataRoot, 'calapan-barangays.json'), 'utf8'));

function asMultiPolygon(geometry) {
	if (geometry.type === 'Polygon') return [geometry.coordinates];
	if (geometry.type === 'MultiPolygon') return geometry.coordinates;
	throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

function getHazardClass(properties, hazardSet) {
	if (!hazardSet.classFields) {
		const value = Number(
			Object.entries(properties ?? {}).find(
				([key]) => key.toLowerCase() === hazardSet.classField.toLowerCase()
			)?.[1]
		);
		if (![1, 2, 3].includes(value)) {
			throw new Error(`Unsupported hazard class: ${value || 'missing'}`);
		}
		return value;
	}
	if (Number.isInteger(Number(properties?.Var))) return Number(properties.Var);

	const fields = hazardSet.classFields ?? [hazardSet.classField];
	const values = fields.map(
		(field) =>
			Object.entries(properties ?? {}).find(
				([key]) => key.toLowerCase() === field.toLowerCase()
			)?.[1]
	);
	const rawValue = values.join(',');
	const value = hazardSet.classMap?.[rawValue] ?? Number(values[0]);
	const classCount = hazardSet.classLabels?.length ?? 3;

	if (!Number.isInteger(value) || value < 1 || value > classCount) {
		throw new Error(`Unsupported hazard class: ${rawValue || 'missing'}`);
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

function className(hazardSet, value) {
	return hazardSet.classLabels?.[value - 1] ?? ['Low', 'Medium', 'High'][value - 1];
}

async function loadPeriod(hazardSet, period, tempRoot) {
	const fileKey = `${hazardSet.key}-${period.key}`;
	const clippedFile = path.join(tempRoot, `${fileKey}-cells.json`);
	const summaryFile = path.join(tempRoot, `${fileKey}-summary.json`);
	const sourceFile = hazardSet.classFields
		? path.join(tempRoot, `${fileKey}-source.json`)
		: period.file;
	if (hazardSet.classFields) {
		const source = JSON.parse(await readFile(period.file, 'utf8'));
		source.features = source.features.map((feature) => ({
			...feature,
			properties: { ...feature.properties, Var: getHazardClass(feature.properties, hazardSet) }
		}));
		await writeFile(sourceFile, `${JSON.stringify(source)}\n`);
	}
	const sourceArgs = [mapshaperBin, sourceFile, '-clip', boundaryFile];

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
		hazardSet.classFields ? 'Var' : hazardSet.classField,
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
		if (!feature.geometry) continue;
		cellFeatures.push({
			type: 'Feature',
			properties: { Var: getHazardClass(feature.properties, hazardSet) },
			geometry: feature.geometry
		});
	}

	const summaryFeatures = summarySource.features
		.filter((feature) => feature.geometry)
		.map((feature) => ({
			...feature,
			properties: { Var: getHazardClass(feature.properties, hazardSet) },
			bbox: bbox(feature.geometry.coordinates)
		}));

	console.log(
		`${hazardSet.key} ${period.label}: ${cellFeatures.length} cell features, ${summaryFeatures.length} summary features`
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

async function writeVectorTiles(hazardSet, period, collection) {
	const suffix = hazardSet.tileSuffix(period);
	const outputDirectory = path.join(outputRoot, `${hazardSet.tilePrefix}-${suffix}-tiles`);
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
				const tile = tileIndex.getTile(zoom, x, y) ?? { features: [] };

				const tilePath = path.join(outputDirectory, String(zoom), String(x), `${y}.pbf`);
				await mkdir(path.dirname(tilePath), { recursive: true });
				await writeFile(tilePath, vtpbf.fromGeojsonVt({ [hazardSet.key]: tile }));
			}
		}
	}
}

const tempRoot = path.join(projectRoot, '.svelte-kit/hazard-data');
await mkdir(tempRoot, { recursive: true });
const loadedHazards = await Promise.all(
	hazardSets.map(async (hazardSet) => ({
		hazardSet,
		periods: await Promise.all(
			hazardSet.periods.map((period) => loadPeriod(hazardSet, period, tempRoot))
		)
	}))
);

for (const { hazardSet, periods } of loadedHazards) {
	const summaries = {};

	for (const barangay of barangays.features) {
		const barangayCoordinates = asMultiPolygon(barangay.geometry);
		const barangayBbox = bbox(barangayCoordinates);
		summaries[barangay.properties.id] = {};

		for (const { period, summaryFeatures } of periods) {
			const classes = new Set();

			for (const feature of summaryFeatures) {
				if (!bboxesOverlap(barangayBbox, feature.bbox)) continue;

				const overlap = intersection(feature.geometry.coordinates, barangayCoordinates);
				if (overlap.length > 0 && multiPolygonArea(overlap) > 1e-12) {
					classes.add(className(hazardSet, feature.properties.Var));
				}
			}

			const classOrder = hazardSet.classLabels ?? ['Low', 'Medium', 'High'];
			const sortedClasses = classOrder.filter((value) => classes.has(value));
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

	for (const { period, cellCollection } of periods) {
		await writeVectorTiles(hazardSet, period, cellCollection);
	}

	await writeFile(
		path.join(dataRoot, hazardSet.summaryFile),
		`${JSON.stringify(summaries, null, 2)}\n`
	);
}

await writeFile(
	path.join(dataRoot, 'hazard-data-manifest.json'),
	`${JSON.stringify(
		{
			generatedAt,
			coverage: 'Calapan City',
			hazardSets: hazardSets.map(({ key, summaryFile }) => ({ key, summaryFile }))
		},
		null,
		'\t'
	)}\n`
);

console.log(
	`Wrote ${loadedHazards.reduce((total, { periods }) => total + periods.length, 0)} localized hazard tile sets and summaries`
);
