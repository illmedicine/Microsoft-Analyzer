import { createLightTheme, type BrandVariants, type Theme } from "@fluentui/react-components";

const cobalt: BrandVariants = {
  10: "#020509", 20: "#0A1630", 30: "#0B2158", 40: "#0A2A7C", 50: "#0B33A0", 60: "#1737C9", 70: "#2551D6", 80: "#4165DB",
  90: "#5E7BE0", 100: "#7A90E5", 110: "#94A4EA", 120: "#AEB9EF", 130: "#C3CBF3", 140: "#D7DCF7", 150: "#E8EBFA", 160: "#F5F6FD",
};
export const theme: Theme = {
  ...createLightTheme(cobalt),
  fontFamilyBase: "'Segoe UI Variable','Segoe UI',system-ui,-apple-system,Roboto,sans-serif",
  borderRadiusMedium: "2px", borderRadiusLarge: "2px", borderRadiusXLarge: "4px",
  colorNeutralBackground2: "#F7F4EC", colorNeutralBackground3: "#F3EFE6",
  colorNeutralForeground1: "#0A0A0A",
};
/** GQ-style solid palette used by the marketing surfaces. */
export const solid = { ink: "#0A0A0A", paper: "#F3EFE6", cobalt: "#1737C9", navy: "#0B1D3A", oxblood: "#6E0F1A", mustard: "#E8B320", forest: "#0F3B2E", crimson: "#B3202A" };
