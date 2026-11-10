/**
 * The colors of Hats, light and dark. Kept apart from the components so anything (the hat
 * stickers included) can ask which theme is showing.
 */
/** Hats in daylight: warm paper, navy ink, one sunny yellow. */
const LIGHT = {
  bg: "#FFF4E3",
  paper: "#FFFDF8",
  ink: "#1D2D45",
  muted: "#56647A",
  line: "#E6D8C3",
  soft: "#EAF1FB",
  blue: "#3D65A2",
  orange: "#B4512F",
  warm: "#FFE6D2",
  /** Hero cards (the Now card, the date planner): dark in both themes. */
  dark: "#1D2D45",
  sun: "#F7C948",
  sky: "#CFE3F7",
  peach: "#FFD9C2",
  lilac: "#EDE0FA",
  mint: "#D3F0E8",
  /** Sticker outlines. */
  edge: "#1D2D45",
  /** Text and icons on yellow, in both themes. */
  onSun: "#1D2D45",
  /** Text on hero cards, in both themes. */
  onDark: "#FFFDF8",
  /** A finished thing: yellow by day, deep gold at night (text sits on it). */
  done: "#F7C948",
};
/** Hats at night: the same stickers on a deep navy table, softer outlines, warm text. */
const DARK: typeof LIGHT = {
  bg: "#10151E",
  paper: "#19212E",
  ink: "#F3EDE2",
  muted: "#A9B3C3",
  line: "#2C3747",
  soft: "#212C3E",
  blue: "#93B5EC",
  orange: "#F29C75",
  warm: "#3A2B22",
  dark: "#24314A",
  sun: "#F7C948",
  sky: "#1E3247",
  peach: "#3A2A22",
  lilac: "#2D2640",
  mint: "#1B342E",
  edge: "#55647C",
  onSun: "#1D2D45",
  onDark: "#FFFDF8",
  done: "#6E5719",
};
/** The palette in use. Read it while rendering; the app remounts when the theme changes. */
export const P = { ...LIGHT };
let night = false;
export const isDark = () => night;
export function applyScheme(scheme: "light" | "dark") {
  night = scheme === "dark";
  Object.assign(P, night ? DARK : LIGHT);
}
/**
 * A pastel (a hat's tint, a highlight) in the current theme. At night the same hue, deep and
 * quiet, so cards keep their hat's color without glowing.
 */
export function tone(hex: string): string {
  if (!night) return hex;
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0;
  const d = max - min;
  if (d) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l0 = (max + min) / 2;
  const s0 = d ? d / (1 - Math.abs(2 * l0 - 1)) : 0;
  // Pastels sit high and pale; at night they sit low, with a little of their color.
  const l = 0.2,
    s = Math.min(0.42, Math.max(0.16, s0 * 0.45));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const k = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const out = [r1, g1, b1].map((v) => Math.round((v + k) * 255).toString(16).padStart(2, "0")).join("");
  return `#${out}${m[2] ?? ""}`;
}
