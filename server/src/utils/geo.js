/**
 * Shared geospatial / ward-name matching helpers.
 *
 * Kept in one place because the heatmap aggregation, the submission pipeline
 * and the admin recompute path all need identical matching semantics.
 */

/**
 * Normalizes a ward / region label for comparison:
 * lowercases, strips punctuation, and collapses whitespace.
 */
export function normalizeWardName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[()/,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips a trailing "(lat, lng)" geotag from a ward label.
 *
 * GPS-pinned submissions are stored as "Nagpur (21.1458, 79.0640)", which never
 * string-matches a registered ward such as "Zone 2 - Dharampeth / Civil Lines
 * (Nagpur)". Without this, every real-GPS complaint was excluded from the
 * heatmap's per-ward aggregation.
 */
export function stripGeotag(name) {
  return normalizeWardName(name)
    .replace(/\s+[-+]?\d{1,3}\.?\d*\s+[-+]?\d{1,3}\.?\d*\s*$/, '')
    .trim();
}

/**
 * True when two ward labels refer to the same ward.
 *
 * Guards against the empty-string trap where `wardName.includes('')` is always
 * true, which previously caused every ward to absorb submissions that had no
 * region name at all.
 */
export function wardNameMatches(a, b) {
  const left = normalizeWardName(a);
  const right = normalizeWardName(b);
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;

  const leftBare = stripGeotag(a);
  const rightBare = stripGeotag(b);
  if (!leftBare || !rightBare) return false;
  return leftBare.includes(rightBare) || rightBare.includes(leftBare);
}

/**
 * Great-circle distance in kilometres between two lat/lng pairs.
 * Used to snap raw device GPS to the nearest registered municipal ward.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Returns the registered ward nearest to a coordinate pair, or null when no
 * coordinates were supplied or the ward list is empty.
 */
export function nearestWard(regions = [], latitude, longitude) {
  if (!Array.isArray(regions) || regions.length === 0) return null;

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  let nearest = null;
  let best = Infinity;

  for (const region of regions) {
    const rLat = Number(region.latitude);
    const rLng = Number(region.longitude);
    if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) continue;
    const dist = haversineKm(lat, lng, rLat, rLng);
    if (dist < best) {
      best = dist;
      nearest = region;
    }
  }

  return nearest;
}

/**
 * Validates a raw coordinate pair from a request body.
 */
export function isValidCoordinatePair(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}
