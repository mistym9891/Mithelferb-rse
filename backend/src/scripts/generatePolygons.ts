import fs from 'fs';
import path from 'path';
const convexHull = require('convex-hull');

const LOCATIONS_PATH = path.join(__dirname, '../../data/locations.json');
const OUTPUT_PATH = path.join(__dirname, '../../data/ring-boundaries.geojson');

interface Location {
  plz: string;
  city: string;
  district: string;
  ringName: string;
  isMember: boolean;
  lat?: number;
  lng?: number;
}

/**
 * `convex-hull` returns the hull as a list of EDGES ([[i,j],[j,k],...]), not as
 * an ordered list of vertex indices. Walk the edges to produce a closed ring.
 */
function orderedHull(points: [number, number][]): [number, number][] {
  const edges: [number, number][] = convexHull(points);
  if (edges.length < 3) return [];

  const next = new Map<number, number>();
  for (const [a, b] of edges) next.set(a, b);

  const start = edges[0][0];
  const order: number[] = [start];
  let cur = next.get(start);
  while (cur !== undefined && cur !== start && order.length <= edges.length) {
    order.push(cur);
    cur = next.get(cur);
  }
  if (order.length < 3) return [];
  return order.map(i => points[i]);
}

/** Grow a hull slightly so neighbouring ring borders stay visually distinct. */
function expand(ring: [number, number][], factor = 1.04): [number, number][] {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor] as [number, number]);
}

function main() {
  if (!fs.existsSync(LOCATIONS_PATH)) {
    console.error(`${LOCATIONS_PATH} not found – run "npm run geocode" first.`);
    process.exit(1);
  }
  const locations: Location[] = JSON.parse(fs.readFileSync(LOCATIONS_PATH, 'utf-8'));

  const groups: Record<string, Location[]> = {};
  for (const loc of locations) {
    if (loc.lat === undefined || loc.lng === undefined || loc.lat === null || loc.lng === null) continue;
    (groups[loc.ringName] ||= []).push(loc);
  }

  const features: any[] = [];
  for (const [ringName, locs] of Object.entries(groups)) {
    // De-duplicate coordinates – repeated points break the hull.
    const seen = new Set<string>();
    const points: [number, number][] = [];
    for (const l of locs) {
      const key = `${l.lng!.toFixed(5)},${l.lat!.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      points.push([l.lng!, l.lat!]);
    }
    if (points.length < 3) {
      console.warn(`  ! ${ringName}: only ${points.length} distinct points – skipped`);
      continue;
    }
    const hull = orderedHull(points);
    if (hull.length < 3) {
      console.warn(`  ! ${ringName}: degenerate hull – skipped`);
      continue;
    }
    const ring = expand(hull);
    ring.push(ring[0]); // close the polygon
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { name: ringName, townCount: locs.length },
    });
    console.log(`  ${ringName}: ${locs.length} Orte -> Hülle mit ${hull.length} Ecken`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ type: 'FeatureCollection', features }, null, 2));
  console.log(`\nSaved ${features.length} polygons to ${OUTPUT_PATH}`);
}

main();
