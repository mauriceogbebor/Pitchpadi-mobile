import { Platform } from "react-native";

/**
 * The "this one is chosen" state for choice buttons (chips, days, times).
 * Phones announce it as "selected" (VoiceOver and TalkBack); on the web a
 * button cannot be "selected", so it is a pressed toggle button instead,
 * which screen readers there announce as "pressed" (PL-01, axe
 * aria-allowed-attr).
 */
export function chosenState(selected: boolean, disabled = false) {
  if (Platform.OS === "web")
    return {
      "aria-pressed": selected,
      ...(disabled ? { "aria-disabled": true } : {}),
      accessibilityState: { disabled },
    } as { accessibilityState: { disabled: boolean } };
  return { accessibilityState: { selected, disabled } };
}
