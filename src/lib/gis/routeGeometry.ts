import along from '@turf/along';
import length from '@turf/length';
import bearing from '@turf/bearing';
import lineSliceAlong from '@turf/line-slice-along';
import { lineString, point } from '@turf/helpers';
import type { Feature, LineString, Position } from 'geojson';

export interface PreparedRoute {
  coordinates: Position[];
  totalLengthKm: number;
  lineFeature: Feature<LineString>;
}

/**
 * Extract coordinates from GeoJSON data and prepare route geometry.
 * Supports FeatureCollection with LineString/MultiLineString features.
 */
export function prepareRouteGeometry(
  geojsonData: GeoJSON.FeatureCollection
): PreparedRoute | null {
  const coords: Position[] = [];

  for (const feature of geojsonData.features) {
    if (!feature.geometry) continue;
    if (feature.geometry.type === 'LineString') {
      coords.push(...feature.geometry.coordinates);
    } else if (feature.geometry.type === 'MultiLineString') {
      for (const line of feature.geometry.coordinates) {
        coords.push(...line);
      }
    }
  }

  if (coords.length < 2) return null;

  const lineFeature = lineString(coords);
  const totalLengthKm = length(lineFeature, { units: 'kilometers' });

  return { coordinates: coords, totalLengthKm, lineFeature };
}

/**
 * Get the [lng, lat] position at a given progress (0–1) along the route.
 */
export function getPositionAtProgress(
  route: PreparedRoute,
  progress: number
): [number, number] {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const distanceKm = clampedProgress * route.totalLengthKm;
  const pt = along(route.lineFeature, distanceKm, { units: 'kilometers' });
  return pt.geometry.coordinates as [number, number];
}

/**
 * Get a partial route line from start (0) to the given progress (0–1).
 * Returns a GeoJSON Feature<LineString> suitable for map source updates.
 */
export function getPartialRoute(
  route: PreparedRoute,
  progress: number
): Feature<LineString> {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  if (clampedProgress <= 0) {
    // Return a degenerate line (single point repeated) at the start
    const startCoord = route.coordinates[0];
    return lineString([startCoord, startCoord]);
  }

  if (clampedProgress >= 1) {
    return route.lineFeature;
  }

  const distanceKm = clampedProgress * route.totalLengthKm;
  return lineSliceAlong(route.lineFeature, 0, distanceKm, { units: 'kilometers' });
}

/**
 * Get the bearing (heading direction) at a given progress along the route.
 * Uses a small look-ahead to determine direction.
 */
export function getBearingAtProgress(
  route: PreparedRoute,
  progress: number
): number {
  const epsilon = 0.001; // small look-ahead
  const p1 = getPositionAtProgress(route, progress);
  const p2 = getPositionAtProgress(route, Math.min(1, progress + epsilon));

  // If points are identical (at the very end), look back instead
  if (p1[0] === p2[0] && p1[1] === p2[1]) {
    const p0 = getPositionAtProgress(route, Math.max(0, progress - epsilon));
    return bearing(point(p0), point(p1));
  }

  return bearing(point(p1), point(p2));
}
