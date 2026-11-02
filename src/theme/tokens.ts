/**
 * "Under the lights": the Floodlight palette and fonts (AGENTS.md section 13,
 * D-015), used the way docs/tech/design/mobile-design-direction.md describes.
 * Light is the daytime look; dark follows the phone.
 */
export const palette = {
  pitch: "#0B3D2E",
  pitchDeep: "#082E23",
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
  /** Page. */
  background: string;
  /** Cards, fields, sheets. */
  card: string;
  /** Quiet fills: skeletons, chips at rest, notices. */
  muted: string;
  /** Hairlines and outlines. */
  border: string;
  /** A stronger line, for focused fields and chosen outlines. */
  borderStrong: string;
  text: string;
  textMuted: string;
  /** Primary actions. */
  primary: string;
  onPrimary: string;
  /** Volt: only on dark surfaces. */
  accent: string;
  onAccent: string;
  link: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warningSoft: string;
  warningText: string;
  /** The pitch band and its markings. */
  band: string;
  bandStripe: string;
  bandLine: string;
  onBand: string;
  onBandMuted: string;
  /** A chosen time or day. */
  chosen: string;
  onChosen: string;
  /** The tab bar's active pill. */
  tabPill: string;
};

export const light: Colors = {
  background: palette.chalk,
  card: palette.white,
  muted: "#ECF1EC",
  border: "#DCE4DF",
  borderStrong: palette.pitch,
  text: "#12261F",
  textMuted: "#4F6A60",
  primary: palette.pitch,
  onPrimary: palette.white,
  accent: palette.volt,
  onAccent: palette.night,
  link: palette.turfInk,
  danger: "#B42318",
  dangerSoft: "#FDECEA",
  success: palette.turfInk,
  successSoft: "#E3F2E8",
  warningSoft: "#FDF0E9",
  warningText: "#8A3A12",
  band: palette.pitch,
  bandStripe: "#0E4535",
  bandLine: "rgba(247,248,244,0.22)",
  onBand: palette.white,
  onBandMuted: "rgba(255,255,255,0.78)",
  chosen: palette.pitch,
  onChosen: palette.volt,
  tabPill: "#DDEBE2",
};

export const dark: Colors = {
  background: palette.night,
  card: "#11211B",
  muted: "#18302A",
  border: "#24403A",
  borderStrong: palette.volt,
  text: "#EEF4EF",
  textMuted: "#A9BDB4",
  primary: palette.volt,
  onPrimary: palette.night,
  accent: palette.volt,
  onAccent: palette.night,
  link: palette.volt,
  danger: "#F87171",
  dangerSoft: "#3A1414",
  success: "#4ADE80",
  successSoft: "#14301F",
  warningSoft: "#3A2410",
  warningText: "#F6B48F",
  band: "#0F4A37",
  bandStripe: "#12533F",
  bandLine: "rgba(247,248,244,0.2)",
  onBand: palette.white,
  onBandMuted: "rgba(255,255,255,0.78)",
  chosen: palette.volt,
  onChosen: palette.night,
  tabPill: "#1F3A31",
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

/** Type scale: one display family for titles and names, Geist for the rest. */
export const type = {
  title: { size: 34, line: 38, tracking: -0.9 },
  h2: { size: 24, line: 28, tracking: -0.4 },
  h3: { size: 19, line: 23, tracking: -0.2 },
  lead: { size: 17, line: 24 },
  body: { size: 16, line: 23 },
  meta: { size: 14, line: 20 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 12, lg: 18, xl: 24, pill: 999 } as const;
/** Minimum touch target (AGENTS.md section 12). */
export const TAP = 48;

/** Fast and calm: presses answer at once, state changes settle quickly. */
export const motion = {
  press: 90,
  quick: 150,
  settle: 220,
  celebrate: 900,
} as const;
