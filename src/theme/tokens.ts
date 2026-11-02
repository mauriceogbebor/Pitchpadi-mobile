/**
 * "Floodlight" design tokens, matching the website (AGENTS.md section 13):
 * a Lagos pitch under lights. Light is the daytime look; dark follows the phone.
 */
export const palette = {
  pitch: "#0B3D2E",
  turf: "#16A34A",
  turfInk: "#12632F",
  volt: "#D4FF3A",
  night: "#0A1612",
  chalk: "#F7F8F4",
  clay: "#E2683C",
  danger: "#DC2626",
  white: "#FFFFFF",
} as const;

export type Colors = {
  background: string;
  card: string;
  muted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  link: string;
  danger: string;
  dangerSoft: string;
  successSoft: string;
  warningSoft: string;
  warningText: string;
};

export const light: Colors = {
  background: palette.chalk,
  card: palette.white,
  muted: "#ECF1EC",
  border: "#D5DED9",
  text: "#12261F",
  textMuted: "#4F6A60",
  primary: palette.pitch,
  onPrimary: palette.white,
  accent: palette.volt,
  link: palette.turfInk,
  danger: "#B42318",
  dangerSoft: "#FDECEA",
  successSoft: "#E6F2EA",
  warningSoft: "#FEF3C7",
  warningText: "#7C4A03",
};

export const dark: Colors = {
  background: palette.night,
  card: "#11211B",
  muted: "#18302A",
  border: "#25423A",
  text: "#EEF4EF",
  textMuted: "#A9BDB4",
  primary: palette.volt,
  onPrimary: palette.night,
  accent: palette.volt,
  link: palette.volt,
  danger: "#F87171",
  dangerSoft: "#3A1414",
  successSoft: "#14301F",
  warningSoft: "#3A2A0A",
  warningText: "#FCD34D",
};

/** Font family names as loaded in the root layout. */
export const fonts = {
  body: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  bold: "Geist_700Bold",
  display: "BricolageGrotesque_700Bold",
  displayHeavy: "BricolageGrotesque_800ExtraBold",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 } as const;
/** Minimum touch target (AGENTS.md section 12). */
export const TAP = 48;
