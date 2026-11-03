import { Linking, Share } from "react-native";
import { type Point, pinDirectionsUrl } from "./geo";

/**
 * The website, which keeps the shared booking and pitch pages (ADR-003). Set
 * EXPO_PUBLIC_WEB_URL to the live address once hosting is decided (L-08).
 */
export const WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000"
).replace(/\/$/, "");

type Place = {
  facilityName: string;
  address: string;
  landmark: string | null;
  areaName: string;
  /** The owner's map pin, when set: directions go straight to it. */
  location?: Point | null;
};

/** "27 Addo Road, Near Ajah market, Ajah" */
export function placeLine(pitch: Place): string {
  return [pitch.address, pitch.landmark, pitch.areaName]
    .filter(Boolean)
    .join(", ");
}

/**
 * Google Maps directions to the venue's pin, or else a search for its name
 * and address (works without an API key or coordinates).
 */
export function directionsUrl(pitch: Place): string {
  if (pitch.location) return pinDirectionsUrl(pitch.location);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${pitch.facilityName}, ${placeLine(pitch)}, Lagos`,
  )}`;
}

export function openDirections(pitch: Place) {
  void Linking.openURL(directionsUrl(pitch));
}

/** A venue's shareable page: all its pitches, opens in the app when installed. */
export function venueLink(facilityId: string): string {
  return `${WEB_URL}/venues/${facilityId}`;
}

export function venueShareText(venue: {
  name: string;
  areaName: string;
  id: string;
}): string {
  return `Book a pitch at ${venue.name} (${venue.areaName}) on PitchPadi: ${venueLink(venue.id)}`;
}

/** The team link that opens the booking for teammates without the app. */
export function teamLink(reference: string): string {
  return `${WEB_URL}/b/${reference}`;
}

export function gameOnText(booking: {
  reference: string;
  pitch: { facilityName: string; areaName: string };
  dayLabel: string;
  localStart: string;
  localEnd: string;
}): string {
  return `Game on! ${booking.pitch.facilityName} (${booking.pitch.areaName}), ${booking.dayLabel}, ${booking.localStart} to ${booking.localEnd}. ${teamLink(booking.reference)}`;
}

/** Opens WhatsApp with the message ready; falls back to the phone's share sheet. */
export async function shareOnWhatsApp(text: string) {
  const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
  try {
    if (await Linking.canOpenURL(url)) return await Linking.openURL(url);
  } catch {
    // Fall through to the share sheet.
  }
  await Share.share({ message: text });
}
