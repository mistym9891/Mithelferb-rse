import fs from 'fs';
import path from 'path';
import convexHull from 'convex-hull';
import { featureCollection, polygon } from '@turf/helpers'; // or manual

const LOCATIONS_PATH = path.join(__dirname, '../../data/locations.json');
const OUTPUT_PATH = path.join(__dirname, '../../data/ring-boundaries.geojson');

interface Location {
  plz: string;
  city: string;
  district: string;
  ringName: string;
  lat?: number;
  lng?: number;
}

function computeHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points; // not enough for polygon
  const hullIndices = convexHull(points); // returns array of indices forming hull
  return hullIndices.map(idx => points[idx]);
}

function main() {
  const raw = fs.readFileSync(LOCATIONS_PATH, 'utf-8');
  const locations: Location[] = JSON.parse(raw);

  // Group by ringName
  const groups: Record<string, Location[]> = {};
  for (const loc of locations) {
    if (loc.lat === undefined || loc.lng === undefined) continue;
    if (!groups[loc.ringName]) groups[loc.ringName] = [];
    groups[loc.ringName].push(loc);
  }

  const features: any[] = [];
  for (const [ringName, locs] of Object.entries(groups)) {
    const points: [number, number][] = locs.map(l => [l.lng!, l.lat!]);
    if (points.length < 3) continue;
    const hull = computeHull(points);
    if (hull.length < 3) continue;
    // Close polygon
    const ring = [...hull, hull[0]];
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        name: ringName,
      },
    });
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson, null, 2));
  console.log(`Saved polygons to ${OUTPUT_PATH}`);
}

main();