/*
 * Player support (R7 review). Who answers players, and on which number, is
 * Maurice's decision (OPEN_QUESTIONS); until EXPO_PUBLIC_SUPPORT_WHATSAPP is
 * set, the app shows no support button rather than a made-up contact.
 * Messages carry only the booking reference, never the player's details.
 */

/** "+234 803 000 0000" or "2348030000000" → "2348030000000"; null if unusable. */
export function supportWhatsApp(value: string | undefined): string | null {
  const digits = (value ?? "").replace(/[\s+()-]/g, "");
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function supportMessage(reference: string): string {
  return `Hello PitchPadi, I need help with booking ${reference}.`;
}

export function supportUrl(number: string, reference: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(supportMessage(reference))}`;
}
