import type { FeatureCollection, Polygon } from 'geojson';

export type HazardLayerStatus = 'prototype' | 'verified';

export type HazardLayer = {
	id: string;
	name: string;
	status: HazardLayerStatus;
	description: string;
	sourceName: string;
	sourceUrl: string | null;
	updatedAt: string | null;
	legendLabel: string;
	data: FeatureCollection<Polygon>;
};

export const prototypeFloodLayer: HazardLayer = {
	id: 'prototype-flood-zone',
	name: 'Flooding prototype',
	status: 'prototype',
	description:
		'The highlighted shape is placeholder geometry for testing the map. It is not an official flood-risk classification.',
	sourceName: 'Prototype geometry',
	sourceUrl: null,
	updatedAt: null,
	legendLabel: 'Demo polygon',
	data: {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: { name: 'Prototype flood-risk zone' },
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[121.165, 13.402],
							[121.185, 13.402],
							[121.19, 13.415],
							[121.172, 13.422],
							[121.16, 13.414],
							[121.165, 13.402]
						]
					]
				}
			}
		]
	}
};
