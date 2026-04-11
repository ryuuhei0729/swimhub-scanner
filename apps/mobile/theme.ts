export const colors = {
  // Backgrounds
  background: "#EFF6FF",
  surface: "#FFFFFF",
  surfaceRaised: "#F3F4F6",
  surfaceSecondary: "#F9FAFB",

  // Borders
  border: "#E5E7EB",
  borderLight: "#D1D5DB",

  // Primary (blue)
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryDeep: "#1E40AF",
  primaryDarkest: "#1E3A8A",
  primaryLight: "#DBEAFE",
  primaryBorder: "#BFDBFE",
  primaryMuted: "rgba(37,99,235,0.1)",
  primaryMutedBorder: "rgba(37,99,235,0.2)",

  // Text
  text: "#111827",
  textSecondary: "#374151",
  muted: "#6B7280",
  mutedLight: "#9CA3AF",

  // Destructive (red)
  destructive: "#DC2626",
  destructiveLight: "#FCA5A5",

  // Error
  errorBackground: "#FEF2F2",
  errorBorder: "#FECACA",

  // Warning / Amber
  warningBackground: "#FEF3C7",
  warningBorder: "#FDE68A",
  warningLight: "#FFFBEB",
  warningMuted: "#FEF9C3",
  warningIcon: "#F59E0B",
  warningText: "#D97706",
  amber: "#92400E",

  // Neutral
  white: "#ffffff",
  black: "#000000",
  blackPressed: "#333333",
  shadow: "#000",

  // Accent
  violet: "#7C3AED",
  green: "#059669",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xxs: 9,
  xs: 10,
  sm: 12,
  md: 14,
  base: 15,
  lg: 16,
  xl: 17,
  xxl: 18,
  "3xl": 24,
  "4xl": 28,
} as const;
