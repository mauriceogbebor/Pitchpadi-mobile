/*
 * Map points for the marketplace (MK-01). Pure functions, unit tested.
 * The API decides what counts as inside Lagos; the app only reads what the
 * owner typed or pasted and rounds what the phone reports.
 */

export type Point = { latitude: number; longitude: number };

/**
 * The player's position, rounded to about 1 km before it leaves the phone:
 * enough to sort pitches by distance, not enough to pinpoint a home.
 */
export function roughPoint(point: Point): Point {
  return {
    latitude: Math.round(point.latitude * 100) / 100,
    longitude: Math.round(point.longitude * 100) / 100,
  };
}

/** The `near` search value: "6.45,3.47". */
export function nearParam(point: Point): string {
  const rough = roughPoint(point);
  return `${rough.latitude},${rough.longitude}`;
}

/** decodeURIComponent, or null when the text has a malformed % escape. */
function safeDecode(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

const PAIR = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/;

/**
 * Reads a venue pin from what an owner pastes: "6.4474, 3.4723", or a Google
 * Maps link that carries the point ("…/@6.4474,3.4723,17z", "?q=6.44,3.47",
 * "!3d6.4474!4d3.4723"). Short "maps.app.goo.gl" links carry no point, so
 * they return null and the screen asks for the numbers instead.
 */
export function parsePoint(text: string): Point | null {
  const value = safeDecode(text.trim());
  // A link with a broken escape ("%zz", a cut-off "%E2%8") cannot be read
  // reliably: return null so the screen shows its usual "paste coordinates"
  // message instead of crashing (review of 3 November).
  if (value === null) return null;
  const pin = value.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const at = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const pair = pin ?? at ?? value.match(PAIR);
  if (!pair) return null;
  const latitude = Number(pair[1]);
  const longitude = Number(pair[2]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  return { latitude, longitude };
}

/** "800 m away", "2.4 km away", "12 km away". */
export function formatDistance(km: number): string {
  if (km < 1)
    return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/** Google Maps directions: to the exact pin when there is one. */
export function pinDirectionsUrl(point: Point): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
}
