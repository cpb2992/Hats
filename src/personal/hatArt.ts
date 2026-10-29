/**
 * The Hats sticker set: playful hats, drawn on a 64×64 grid.
 * Pure data so the same art renders in the app (react-native-svg), in home-screen
 * widgets (SVG string), and in tests. Shape tells hats apart, never colour alone.
 */
export type HatArtId =
  | "cap"
  | "tophat"
  | "hardhat"
  | "fedora"
  | "propeller"
  | "catbeanie"
  | "party"
  | "pompom"
  | "chef"
  | "wizard"
  | "safari"
  | "crown"
  | "sunhat"
  | "nightcap"
  | "mortarboard"
  | "cowboy"
  | "beret"
  | "bucket"
  | "viking"
  | "bike"
  | "pirate"
  | "witch"
  | "santa"
  | "captain"
  | "bowler"
  | "flowers"
  | "jester"
  | "firefighter"
  | "football"
  | "visor"
  | "detective"
  | "newsboy"
  | "bunny"
  | "tiara"
  | "earmuffs"
  | "headphones"
  | "astronaut"
  | "goggles"
  | "straw"
  | "bandana"
  | "paperhat"
  | "rainhat"
  | "stack";

export type Shape =
  | {
      t: "path";
      d: string;
      fill?: string;
      stroke?: string;
      w?: number;
      o?: number;
    }
  | {
      t: "circle";
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      w?: number;
      o?: number;
    }
  | {
      t: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill?: string;
      stroke?: string;
      w?: number;
      o?: number;
    }
  | {
      t: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
      fill?: string;
      stroke?: string;
      w?: number;
      o?: number;
    }
  | { t: "g"; transform: string; children: Shape[] };

export const INK = "#1D2D45";
export const C = {
  ink: INK,
  cream: "#FFF8EC",
  white: "#FFFDF8",
  sun: "#F7C948",
  gold: "#E9A93A",
  orange: "#F08A4B",
  coral: "#E8735A",
  rose: "#F5A9B8",
  sky: "#8DB8EA",
  blue: "#3D65A2",
  navy: "#2C3E63",
  lilac: "#C8A6E6",
  teal: "#5DBFAE",
  khaki: "#DDBB82",
  tan: "#BF9256",
};

const S = 2.6; // outline weight

function star(cx: number, cy: number, r: number, fill: string): Shape {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(
      `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`,
    );
  }
  return { t: "path", d: `M${pts.join(" L")} Z`, fill, stroke: INK, w: 1.4 };
}
const heart = (x: number, y: number, s: number, fill: string): Shape => ({
  t: "path",
  d: `M${x} ${y + 3 * s} c${-4 * s} ${-2.6 * s} ${-4 * s} ${-6.5 * s} ${-1.6 * s} ${-6.5 * s} c${1 * s} 0 ${1.6 * s} ${0.8 * s} ${1.6 * s} ${1.4 * s} c0 ${-0.6 * s} ${0.6 * s} ${-1.4 * s} ${1.6 * s} ${-1.4 * s} c${2.4 * s} 0 ${2.4 * s} ${3.9 * s} ${-1.6 * s} ${6.5 * s} z`,
  fill,
  stroke: INK,
  w: 1.3,
});

// The Teacher hat: a graduation cap with a gold tassel.
const MORTARBOARD: Shape[] = [
  {
    t: "path",
    d: "M17 27 L17 42 Q32 50 47 42 L47 27 Z",
    fill: "#3B5079",
    stroke: INK,
    w: S,
  },
  {
    t: "path",
    d: "M32 9 L60 21 L32 33 L4 21 Z",
    fill: C.navy,
    stroke: INK,
    w: S,
  },
  { t: "path", d: "M14 21 L32 13.5", stroke: "#fff", w: 1.6, o: 0.3 },
  { t: "path", d: "M32 21 Q43 22 51 25 L51 37", stroke: INK, w: 1.8 },
  {
    t: "path",
    d: "M48 36 L54 36 L55.5 46 Q51 49.5 46.5 46 Z",
    fill: C.sun,
    stroke: INK,
    w: 1.6,
  },
  { t: "path", d: "M49.5 40 L49 46 M52.5 40 L53 46", stroke: INK, w: 1, o: 0.5 },
  { t: "circle", cx: 32, cy: 21, r: 2.8, fill: C.sun, stroke: INK, w: 1.6 },
];

// ── More hats for the library (for hats you add yourself) ──────────────────
const p = (d: string, fill?: string, w = S): Shape => ({ t: "path", d, fill, stroke: INK, w });
const ln = (d: string, stroke: string = INK, w = 1.4, o?: number): Shape =>
  o === undefined ? { t: "path", d, stroke, w } : { t: "path", d, stroke, w, o };
const ci = (cx: number, cy: number, r: number, fill: string, w = 1.6): Shape => ({ t: "circle", cx, cy, r, fill, stroke: INK, w });
const dot = (cx: number, cy: number, r: number, fill: string, o?: number): Shape =>
  o === undefined ? { t: "circle", cx, cy, r, fill } : { t: "circle", cx, cy, r, fill, o };
const rc = (x: number, y: number, width: number, height: number, rx: number, fill: string, w = S): Shape => ({ t: "rect", x, y, width, height, rx, fill, stroke: INK, w });
const el = (cx: number, cy: number, rx: number, ry: number, fill: string, w = S): Shape => ({ t: "ellipse", cx, cy, rx, ry, fill, stroke: INK, w });
const shine = (d: string): Shape => ({ t: "path", d, stroke: "#fff", w: 1.8, o: 0.45 });
const band = (d: string, fill: string, w = 4): Shape[] => [ln(d, INK, w + 3.4), ln(d, fill, w)];
const drop = (x: number, y: number, s = 1): Shape => ({
  t: "path",
  d: `M${x} ${y} C${x + 2 * s} ${y + 3 * s} ${x + 3.4 * s} ${y + 5 * s} ${x + 3.4 * s} ${y + 6.4 * s} A${3.4 * s} ${3.4 * s} 0 0 1 ${x - 3.4 * s} ${y + 6.4 * s} C${x - 3.4 * s} ${y + 5 * s} ${x - 2 * s} ${y + 3 * s} ${x} ${y} Z`,
  fill: C.sky,
  stroke: INK,
  w: 1.2,
});
function flower(cx: number, cy: number, r: number, petal: string): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < 5; i++) {
    const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
    out.push(ci(+(cx + r * 0.6 * Math.cos(a)).toFixed(2), +(cy + r * 0.6 * Math.sin(a)).toFixed(2), +(r * 0.5).toFixed(2), petal, 1.2));
  }
  out.push(ci(cx, cy, +(r * 0.36).toFixed(2), C.sun, 1.1));
  return out;
}
const leaf = (x: number, y: number, flip = 1): Shape =>
  p(`M${x} ${y} q${3 * flip} -5 ${7 * flip} -3 q${-3 * flip} 5 ${-7 * flip} 3 Z`, "#7BBF84", 1.1);
const RED = "#E25C55";
const STEEL = "#AEB9CC";

const MORE: Record<
  | "cowboy" | "beret" | "bucket" | "viking" | "bike" | "pirate" | "witch" | "santa" | "captain"
  | "bowler" | "flowers" | "jester" | "firefighter" | "football" | "visor" | "detective" | "newsboy"
  | "bunny" | "tiara" | "earmuffs" | "headphones" | "astronaut" | "goggles" | "straw" | "bandana"
  | "paperhat" | "rainhat",
  Shape[]
> = {
  cowboy: [
    p("M17 45 C16 31 19 17 25 16 Q29 15.5 32 20 Q35 15.5 39 16 C45 17 48 31 47 45 Z", C.khaki),
    ln("M32 20 Q31 30 32 37", INK, 1.4, 0.35),
    shine("M21 26 Q22 20.5 25 18.5"),
    p("M17.4 37 Q32 40.5 46.6 37 L47 44 Q32 47.5 17 44 Z", "#8A5A3B", 1.8),
    star(24, 41, 2.6, C.sun),
    p("M2 35 Q5 44 18 45.5 L46 45.5 Q59 44 62 35 Q63 48 46 51.5 L18 51.5 Q1 48 2 35 Z", C.tan),
  ],
  beret: [
    p("M17 41.5 Q32 46 47 41.5 L47.5 47 Q32 51.5 16.5 47 Z", "#B9503F", 1.9),
    p("M7 37 C5 26 18 18 33 18 C49 18 60 25 57 34 C55 41 42 43 31 43 C19 43 8 43 7 37 Z", C.coral),
    ln("M33 18 Q33.5 12.5 37.5 11.5", INK, 2.6),
    shine("M15 29 Q21 23.5 31 22.5"),
  ],
  bucket: [
    p("M19 39 L22 19 Q32 15 42 19 L45 39 Z", C.teal),
    ln("M22.5 23 Q32 25 41.5 23", INK, 1.1, 0.4),
    ln("M21 31 Q32 33.5 43 31", INK, 1.1, 0.4),
    shine("M25.5 21.5 L24.5 29"),
    p("M7 46 L18 36 Q32 39 46 36 L57 46 Q32 53 7 46 Z", "#3E9C8C"),
    ln("M13 44.5 Q32 50 51 44.5", INK, 1.1, 0.4),
  ],
  viking: [
    p("M15 33 C6 30 3 20 7 10 C10 19 15 23 21 25 Z", C.cream),
    p("M49 33 C58 30 61 20 57 10 C54 19 49 23 43 25 Z", C.cream),
    p("M13 43 C13 28 21 19 32 19 C43 19 51 28 51 43 Z", STEEL),
    p("M29.5 19.6 Q32 19 34.5 19.6 L34.5 41 L29.5 41 Z", C.gold, 1.8),
    shine("M19 34 Q20 27 25 23"),
    rc(10, 40, 44, 9, 4.5, C.gold),
    dot(17, 44.5, 1.5, INK),
    dot(32, 44.5, 1.5, INK),
    dot(47, 44.5, 1.5, INK),
  ],
  bike: [
    ln("M15 46 Q16 54 25 57", INK, 1.8, 0.6),
    p("M7 42 C7 26 19 16 33 16 C47 16 57 25 57 36 L52 42 Z", C.orange),
    p("M15 32 Q19 23 28 20 L29.5 25.5 Q23 27 19.5 33.5 Z", C.navy, 1.4),
    p("M34 19.5 Q44 20 50 27 L45.5 30.5 Q41 25.5 34 25.5 Z", C.navy, 1.4),
    p("M27 30.5 Q32 28.5 37 30.5 L36 36 Q32 35 28 36 Z", C.navy, 1.4),
    p("M50 35.5 Q57 34 60 37.5 Q58 41.5 52 41.5 Z", C.navy, 2),
    rc(5.5, 41, 49, 6, 3, C.navy),
  ],
  pirate: [
    p("M47 27 Q55 13 62 9 Q61 20 51 29 Z", C.coral, 1.8),
    ln("M50 27 Q55 19 60 12", INK, 1, 0.5),
    p("M3 29 Q17 36 32 23 Q47 36 61 29 Q57 44 48 47 L16 47 Q7 44 3 29 Z", "#2B3550"),
    ln("M6.5 32.5 Q18 39 32 27.5 Q46 39 57.5 32.5", C.sun, 2.2),
    ci(32, 38.5, 4, C.gold),
    ln("M30.4 37 q1.6 -1.5 3.2 0", "#fff", 1.2, 0.8),
  ],
  witch: [
    el(32, 50, 27, 6, "#3B2F5A"),
    p("M18 50 Q23 36 27 23 Q30 12 41 5 Q38 14 40 25 Q43 38 46 50 Z", "#5A4590"),
    shine("M25.5 38 Q27.5 30 30 25"),
    star(34, 31, 2.4, C.sun),
    p("M19.7 44 Q32 47.5 44.3 44 L45.6 49.5 Q32 53 18.4 49.5 Z", C.orange, 1.8),
    { t: "rect", x: 28.5, y: 44.2, width: 7, height: 6.4, rx: 1.4, stroke: C.sun, w: 2 },
  ],
  santa: [
    p("M12 46 C12 30 22 18 36 16 C46 14.5 52 18 54.5 27 C50 23 46 25 46 31 C46 37 50 41 52 46 Z", RED),
    shine("M20 33 Q23 25 30 21"),
    ci(54.5, 28, 5.2, C.white, 2),
    rc(8, 42, 48, 11, 5.5, C.white),
    ln("M14 47.5 q2 -1.6 4 0 M24 47.5 q2 -1.6 4 0 M34 47.5 q2 -1.6 4 0 M44 47.5 q2 -1.6 4 0", INK, 1, 0.3),
  ],
  captain: [
    p("M15 33 L49 33 L48 43 L16 43 Z", C.navy),
    p("M6 30 Q8 17 32 16 Q56 17 58 30 Q52 35 32 35 Q12 35 6 30 Z", C.white),
    ln("M14 25 Q22 20 30 19.5", INK, 1.2, 0.25),
    ci(32, 38.5, 3.2, C.sun, 1.4),
    ln("M25.5 39.5 q2 -3 4 -1.4 M38.5 39.5 q-2 -3 -4 -1.4", C.sun, 1.6),
    p("M15 43 L49 43 Q51 51 32 51 Q13 51 15 43 Z", "#263750"),
    ln("M17 44.6 L47 44.6", C.gold, 2),
  ],
  bowler: [
    p("M16 43 C16 27 22 17 32 17 C42 17 48 27 48 43 Z", "#4B5A73"),
    shine("M21 31 Q22 23 27 20"),
    p("M16.3 36.5 Q32 40 47.7 36.5 L48 42 Q32 45.5 16 42 Z", C.coral, 1.8),
    p("M6 44 Q10 39 17 41.5 Q32 45 47 41.5 Q54 39 58 44 Q58 50.5 32 50.5 Q6 50.5 6 44 Z", "#3B475E"),
  ],
  flowers: [
    ln("M8 32 Q32 22 56 32", "#5E9C6A", 2.4, 0.6),
    ...band("M8 32 Q32 46 56 32", "#7BBF84", 2.6),
    leaf(14.5, 37.5),
    leaf(25, 41.5),
    leaf(39, 41.5, -1),
    leaf(49.5, 37.5, -1),
    ...flower(9, 31, 7.8, C.rose),
    ...flower(20.5, 37, 8.6, C.lilac),
    ...flower(32, 39.5, 9.6, C.coral),
    ...flower(43.5, 37, 8.6, C.white),
    ...flower(55, 31, 7.8, C.rose),
  ],
  jester: [
    p("M14 41 Q12 28 4.5 24.5 Q17 18 25 29 Z", C.lilac),
    p("M50 41 Q52 28 59.5 24.5 Q47 18 39 29 Z", C.teal),
    p("M21 41 Q22 27 25 20 Q28 12 32 8 Q36 12 39 20 Q42 27 43 41 Z", C.coral),
    shine("M26.5 32 Q27 24 30 18"),
    ci(4.5, 24.5, 3.4, C.sun),
    ci(59.5, 24.5, 3.4, C.sun),
    ci(32, 7.5, 3.4, C.sun),
    rc(11, 40, 42, 10, 5, C.sun),
    p("M21 45 L24 42.5 L27 45 L24 47.5 Z", C.coral, 1.2),
    p("M29 45 L32 42.5 L35 45 L32 47.5 Z", C.teal, 1.2),
    p("M37 45 L40 42.5 L43 45 L40 47.5 Z", C.lilac, 1.2),
  ],
  firefighter: [
    p("M3 45 Q3 40 10 40 L54 40 Q62 41.5 62 48 Q50 46 40 47 L10 48.5 Q3 48.5 3 45 Z", "#B8443E"),
    p("M12 42 C12 26 21 16 32 16 C43 16 52 26 52 42 Z", RED),
    p("M29.5 16.6 Q32 14 34.5 16.6 L34.5 41 L29.5 41 Z", "#B8443E", 1.8),
    shine("M17 33 Q18 25 23 21"),
    p("M24 25 L40 25 L40 32 Q32 39 24 32 Z", C.sun, 1.8),
    star(32, 30, 2.8, C.white),
  ],
  football: [
    p("M8 39 C6 23 18 11 34 11 C50 11 59 22 57 35 L51 44 L19 46 Q10 46 8 39 Z", C.blue),
    ...band("M13.5 23 Q32 12.5 50.5 19.5", C.white, 3.2),
    shine("M13.5 31 Q14.5 24 19 20"),
    ci(27, 31, 3.2, C.navy, 1.6),
    ln("M47 29 L61 29 M48 38 L61 38 M61 27 L61 46 Q58 49 52 47", INK, 4.6),
    ln("M47 29 L61 29 M48 38 L61 38 M61 27 L61 46 Q58 49 52 47", "#DCE2EC", 2),
  ],
  visor: [
    ...band("M13 37 Q32 21 51 37", C.rose, 3.8),
    p("M9 41 Q32 31 55 41 Q62 48 55 51.5 Q32 44 9 51.5 Q2 48 9 41 Z", C.coral),
    ln("M12 47 Q32 39.5 52 47", INK, 1.1, 0.35),
    star(32, 41.5, 2.8, C.sun),
  ],
  detective: [
    p("M14 43 C14 27 22 18 32 18 C42 18 50 27 50 43 Z", C.khaki),
    ln("M24 20 L22 42 M32 18.5 L32 42 M40 20 L42 42", "#9C7444", 1.4, 0.7),
    ln("M15 31 Q32 27 49 31 M14.5 37 Q32 33 49.5 37", "#9C7444", 1.4, 0.7),
    p("M27 18.5 Q22 12 28.5 12.5 Q31.5 14 32 18 Q32.5 14 35.5 12.5 Q42 12 37 18.5 Z", C.tan, 1.8),
    p("M14.3 40 Q32 44 49.7 40 L50 45 Q32 49 14 45 Z", C.tan, 2),
    p("M20 41.5 Q10 41 3 47 Q13 49 21 46 Z", C.tan, 2.2),
    p("M44 41.5 Q54 41 61 47 Q51 49 43 46 Z", C.tan, 2.2),
  ],
  newsboy: [
    p("M8 38 C6 26 18 18 34 18 C50 18 59 25 57 35 C55 41 44 43 32 43 C20 43 9 43 8 38 Z", "#9AA7BC"),
    ln("M34 18.5 Q32 30 33 42 M34 18.5 Q21 24 16 41 M34 18.5 Q47 24 51 40", INK, 1.2, 0.35),
    shine("M13.5 31 Q17 25 24 22"),
    ci(34, 18.5, 2.7, "#6F7E96", 1.6),
    p("M13 41 Q32 47 53 39 Q57 45 49 49.5 Q32 52.5 17 48.5 Q11 46 13 41 Z", "#6F7E96"),
  ],
  bunny: [
    p("M21 42 C13 28 13 9 19.5 6.5 C26.5 6 28 26 28.5 42 Z", C.white),
    { t: "path", d: "M21 35 C17 25 17 13 20 10.5 C23.5 11.5 25 24 25.5 35 Z", fill: C.rose },
    p("M35.5 42 C36 26 38 8 45 7 C51.5 8 50 27 43 42 Z", C.white),
    { t: "path", d: "M39 35 C39.5 24 41 13 44.5 11 C47.5 13 46 25 41.5 35 Z", fill: C.rose },
    ...band("M7 52 Q32 32 57 52", C.lilac, 4),
  ],
  tiara: [
    p("M10 46 L14 32 L21 40 L32 18 L43 40 L50 32 L54 46 Q32 39 10 46 Z", "#E3E8F1"),
    ln("M28.5 29 L32 22.5", "#fff", 1.6, 0.9),
    p("M9 45.5 Q32 37.5 55 45.5 L55 50.5 Q32 42.5 9 50.5 Z", C.gold, 2.2),
    ci(32, 33, 3.6, C.rose),
    ci(32, 17.5, 2.4, C.lilac, 1.4),
    ci(14, 31.5, 2.2, C.sky, 1.4),
    ci(50, 31.5, 2.2, C.sky, 1.4),
    dot(20, 45.6, 1.2, "#fff", 0.85),
    dot(32, 43.4, 1.2, "#fff", 0.85),
    dot(44, 45.6, 1.2, "#fff", 0.85),
  ],
  earmuffs: [
    ...band("M14 34 C13 10 51 10 50 34", C.lilac, 4),
    ci(13, 39, 9.5, C.rose, S),
    ci(51, 39, 9.5, C.rose, S),
    ln("M8 37 q2.5 -2.2 5 0 M10.5 42.5 q2.5 -2.2 5 0 M46 37 q2.5 -2.2 5 0 M48.5 42.5 q2.5 -2.2 5 0", "#fff", 1.5, 0.8),
  ],
  headphones: [
    ...band("M13 36 C12 9 52 9 51 36", "#5D7398", 4),
    rc(5, 30, 13, 20, 6, C.coral),
    rc(46, 30, 13, 20, 6, C.coral),
    rc(15.5, 33, 5, 14, 2.5, C.navy, 1.8),
    rc(43.5, 33, 5, 14, 2.5, C.navy, 1.8),
    ln("M29.5 30 L29.5 21 L36.5 19.3 L36.5 28", INK, 1.8),
    ci(27.6, 30.2, 2.2, INK, 1),
    ci(34.6, 28.3, 2.2, INK, 1),
  ],
  astronaut: [
    rc(7, 25, 6, 11, 3, C.sky, 2),
    rc(51, 25, 6, 11, 3, C.sky, 2),
    ci(32, 30, 21, C.white, S),
    p("M16 30 C16 20 23.5 15 32 15 C40.5 15 48 20 48 30 C48 38 40.5 42.5 32 42.5 C23.5 42.5 16 38 16 30 Z", C.navy),
    ln("M21.5 25 Q24.5 19.5 30 18.5", "#fff", 2, 0.75),
    dot(22.5, 30, 1.3, "#fff", 0.6),
    star(44, 23, 1.6, C.sun),
    rc(14, 47, 36, 9, 4.5, STEEL),
    ci(46.5, 13, 2.4, C.coral, 1.4),
  ],
  goggles: [
    ...band("M3 36 Q32 22 61 36", C.teal, 4),
    rc(8, 25, 22, 17, 8.5, C.navy),
    rc(34, 25, 22, 17, 8.5, C.navy),
    rc(11, 28, 16, 11, 5.5, C.sky, 1.6),
    rc(37, 28, 16, 11, 5.5, C.sky, 1.6),
    ln("M30 33.5 L34 33.5", INK, 3),
    ln("M14 32.5 Q15.5 30 19 30 M40 32.5 Q41.5 30 45 30", "#fff", 1.6, 0.85),
    ci(50, 17, 2.6, C.white, 1.2),
    ci(55.5, 10.5, 1.9, C.white, 1.1),
    ci(46, 10, 1.4, C.white, 1),
  ],
  straw: [
    el(32, 40, 28.5, 8, "#E8C98F"),
    ln("M9.5 41 Q32 51.5 54.5 41 M14 37 Q32 44.5 50 37", "#B48A4E", 1.1, 0.7),
    p("M20 37 C20 22 25 14.5 32 14.5 C39 14.5 44 22 44 37 Z", C.khaki),
    ln("M21.5 27 Q32 29 42.5 27 M23.5 21 Q32 23 40.5 21", "#B48A4E", 1.1, 0.7),
    shine("M24.5 30 Q24.5 22 28 18"),
    p("M20.3 31 Q32 34.5 43.7 31 L44 37 Q32 40.5 20 37 Z", "#7BBF84", 1.8),
    { t: "ellipse", cx: 49.5, cy: 9.5, rx: 2.3, ry: 3, fill: C.white, stroke: INK, w: 1, o: 0.95 },
    { t: "ellipse", cx: 54, cy: 9.5, rx: 2.3, ry: 3, fill: C.white, stroke: INK, w: 1, o: 0.95 },
    el(52, 14.5, 4.6, 3.3, C.sun, 1.3),
    ln("M50.6 11.6 L50.6 17.4 M53.6 11.6 L53.6 17.4", INK, 1.3),
  ],
  bandana: [
    p("M49 37 L61 30 L59.5 40 Z", C.coral, 2),
    p("M49 40 L60 47 L53 49.5 Z", C.coral, 2),
    p("M12 43 C12 27 20 18 32 18 C44 18 52 27 52 43 Q32 47 12 43 Z", C.coral),
    dot(22, 27, 1.7, "#fff"),
    dot(32, 23.5, 1.7, "#fff"),
    dot(41.5, 27.5, 1.7, "#fff"),
    dot(18, 36, 1.7, "#fff"),
    dot(27.5, 33, 1.7, "#fff"),
    dot(37, 35.5, 1.7, "#fff"),
    dot(46, 36.5, 1.7, "#fff"),
    ln("M14 40 Q32 44 50 40", INK, 1.1, 0.35),
    ci(51, 39, 3.6, "#D65E48", 1.8),
  ],
  paperhat: [
    p("M9 44 L32 9 L55 44 Z", C.white),
    ln("M24.5 26 L39.5 26 M21 31.5 L43 31.5 M17.5 37 L46.5 37", INK, 1.2, 0.3),
    p("M5 41 L59 41 L57 51 L7 51 Z", "#EFE6D2"),
    ln("M11.5 46 L26 46 M38 46 L52.5 46", INK, 1.2, 0.3),
    star(32, 46, 2.8, C.coral),
  ],
  rainhat: [
    p("M16 41 C16 24 23 15 32 15 C41 15 48 24 48 41 Z", C.sun),
    ln("M32 16 L32 40 M24.5 18.5 Q21 28 21 40 M39.5 18.5 Q43 28 43 40", INK, 1.2, 0.35),
    ci(32, 15, 2.2, C.gold, 1.4),
    p("M5 41 Q32 35 59 41 Q63 50 54 51.5 Q32 46.5 10 51.5 Q1 50 5 41 Z", C.gold),
    drop(54, 7),
    drop(9, 15, 0.8),
    drop(59, 20, 0.7),
  ],
};

const ART: Record<Exclude<HatArtId, "stack">, Shape[]> = {
  mortarboard: MORTARBOARD,
  ...MORE,
  cap: [
    {
      t: "path",
      d: "M14 44 C14 26 23 16 34 16 C46 16 53 27 53 44 Z",
      fill: C.sky,
      stroke: INK,
      w: S,
    },
    { t: "path", d: "M33 17 C29 24 28 32 28 38", stroke: INK, w: 1.6, o: 0.35 },
    {
      t: "path",
      d: "M3 47 Q4 40 16 42 L53 43.5 Q58 48 52 51 L9 51 Q3 51 3 47 Z",
      fill: C.blue,
      stroke: INK,
      w: S,
    },
    {
      t: "circle",
      cx: 34,
      cy: 15.5,
      r: 2.8,
      fill: C.blue,
      stroke: INK,
      w: 1.8,
    },
  ],
  tophat: [
    {
      t: "ellipse",
      cx: 32,
      cy: 51,
      rx: 25,
      ry: 5.5,
      fill: C.navy,
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M17 51 L19 12 Q32 9 45 12 L47 51 Z",
      fill: "#3B5079",
      stroke: INK,
      w: S,
    },
    {
      t: "rect",
      x: 17.6,
      y: 39,
      width: 28.8,
      height: 7,
      fill: C.sun,
      stroke: INK,
      w: 1.8,
    },
    {
      t: "circle",
      cx: 40.5,
      cy: 42.5,
      r: 3.8,
      fill: C.gold,
      stroke: INK,
      w: 1.6,
    },
    { t: "path", d: "M39 41 q1.5 -1.4 3 0", stroke: "#fff", w: 1.3, o: 0.8 },
  ],
  hardhat: [
    {
      t: "path",
      d: "M10 45 C10 27 20 16 32 16 C44 16 54 27 54 45 Z",
      fill: C.sun,
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M27 17.5 Q32 13 37 17.5 L36 28 Q32 30 28 28 Z",
      fill: "#FBDB7A",
      stroke: INK,
      w: 1.8,
    },
    {
      t: "rect",
      x: 5,
      y: 43,
      width: 54,
      height: 8,
      rx: 4,
      fill: C.gold,
      stroke: INK,
      w: S,
    },
    star(47, 31, 3.2, C.orange),
  ],
  fedora: [
    {
      t: "path",
      d: "M15 41 C15 27 19 18 32 18 C45 18 49 27 49 41 Z",
      fill: "#D9826B",
      stroke: INK,
      w: S,
    },
    { t: "path", d: "M24 20.5 Q32 26 40 20.5", stroke: INK, w: 1.8 },
    {
      t: "path",
      d: "M3 43 Q32 34 61 43 Q61 51 32 49 Q3 51 3 43 Z",
      fill: "#C46A53",
      stroke: INK,
      w: S,
    },
    { t: "rect", x: 15.2, y: 34, width: 33.6, height: 6, fill: INK },
    heart(41.5, 34.8, 1, C.rose),
  ],
  propeller: [
    { t: "rect", x: 30.6, y: 12, width: 2.8, height: 11, fill: INK },
    {
      t: "path",
      d: "M32 13 C27 9 17 9 16 13 C17 17 27 17 32 13 Z",
      fill: C.sky,
      stroke: INK,
      w: 1.8,
    },
    {
      t: "path",
      d: "M32 13 C37 9 47 9 48 13 C47 17 37 17 32 13 Z",
      fill: C.coral,
      stroke: INK,
      w: 1.8,
    },
    { t: "circle", cx: 32, cy: 13, r: 2.6, fill: C.sun, stroke: INK, w: 1.6 },
    {
      t: "path",
      d: "M11 47 C11 31 20 22 32 22 C44 22 53 31 53 47 Z",
      fill: C.sun,
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M26.5 23 Q23 35 24 46 L40 46 Q41 35 37.5 23 Z",
      fill: C.coral,
      stroke: INK,
      w: 1.6,
    },
    {
      t: "rect",
      x: 9,
      y: 44,
      width: 46,
      height: 7,
      rx: 3.5,
      fill: C.blue,
      stroke: INK,
      w: S,
    },
  ],
  catbeanie: [
    {
      t: "path",
      d: "M14 36 L12 12 L28 23 Z",
      fill: C.orange,
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M50 36 L52 12 L36 23 Z",
      fill: C.orange,
      stroke: INK,
      w: S,
    },
    { t: "path", d: "M16 29 L15.4 18 L23.5 23.5 Z", fill: C.rose },
    { t: "path", d: "M48 29 L48.6 18 L40.5 23.5 Z", fill: C.rose },
    {
      t: "path",
      d: "M11 48 C11 31 20 22 32 22 C44 22 53 31 53 48 Z",
      fill: C.orange,
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M24 24 q2 4 0 8 M32 22.5 q2 4 0 8 M40 24 q2 4 0 8",
      stroke: "#C9632B",
      w: 1.8,
    },
    {
      t: "rect",
      x: 9,
      y: 44,
      width: 46,
      height: 9,
      rx: 4.5,
      fill: "#FFE2C6",
      stroke: INK,
      w: S,
    },
  ],
  party: [
    { t: "path", d: "M32 9 L49 51 L15 51 Z", fill: C.lilac, stroke: INK, w: S },
    {
      t: "path",
      d: "M25.5 25 L38.5 25 M21.5 35 L42.5 35",
      stroke: "#fff",
      w: 2,
      o: 0.5,
    },
    { t: "circle", cx: 25, cy: 46, r: 2, fill: C.sun },
    { t: "circle", cx: 40, cy: 46, r: 2, fill: C.sky },
    { t: "circle", cx: 33, cy: 20, r: 1.8, fill: C.coral },
    {
      t: "ellipse",
      cx: 32,
      cy: 51.5,
      rx: 18,
      ry: 3.6,
      fill: "#A882CC",
      stroke: INK,
      w: 2,
    },
    { t: "circle", cx: 32, cy: 8, r: 4.8, fill: C.sun, stroke: INK, w: 2 },
    {
      t: "path",
      d: "M8 16 l3 3 M7 24 h4 M56 14 l-3 3 M57 22 h-4",
      stroke: C.coral,
      w: 2,
    },
  ],
  pompom: [
    {
      t: "path",
      d: "M11 46 C11 28 20 19 32 19 C44 19 53 28 53 46 Z",
      fill: C.teal,
      stroke: INK,
      w: S,
    },
    {
      t: "rect",
      x: 9,
      y: 42,
      width: 46,
      height: 11,
      rx: 5.5,
      fill: "#3FA190",
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M17 44.5 v6 M24 44.5 v6 M31 44.5 v6 M38 44.5 v6 M45 44.5 v6",
      stroke: INK,
      w: 1.4,
      o: 0.45,
    },
    { t: "circle", cx: 32, cy: 14, r: 6.5, fill: C.cream, stroke: INK, w: S },
    { t: "path", d: "M48 24 v-7 l4 -1 v6", stroke: INK, w: 1.6 },
    { t: "ellipse", cx: 46.8, cy: 24.3, rx: 1.8, ry: 1.4, fill: INK },
    { t: "ellipse", cx: 50.8, cy: 22.3, rx: 1.8, ry: 1.4, fill: INK },
  ],
  chef: [
    {
      t: "path",
      d: "M20 45 V27 C11 26 11 12 21 12 C23 4 41 4 43 12 C53 12 53 26 44 27 V45 Z",
      fill: C.white,
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M26 14 q2 -3 5 -2 M38 15 q3 -1 4 2",
      stroke: INK,
      w: 1.4,
      o: 0.4,
    },
    {
      t: "rect",
      x: 18,
      y: 40,
      width: 28,
      height: 10,
      rx: 3,
      fill: "#E5ECF6",
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M25 41.5 v7 M32 41.5 v7 M39 41.5 v7",
      stroke: INK,
      w: 1.3,
      o: 0.4,
    },
  ],
  wizard: [
    {
      t: "path",
      d: "M12 50 L27 14 Q32 4 44 8 Q36 10 35 18 L49 50 Z",
      fill: C.blue,
      stroke: INK,
      w: S,
    },
    star(37, 24, 3.6, C.sun),
    star(23, 33, 2.4, C.sun),
    {
      t: "path",
      d: "M41 39 a3.4 3.4 0 1 1 -2 -6 a2.6 2.6 0 1 0 2 6 z",
      fill: C.cream,
    },
    {
      t: "ellipse",
      cx: 30.5,
      cy: 50,
      rx: 25,
      ry: 5.5,
      fill: C.navy,
      stroke: INK,
      w: S,
    },
  ],
  safari: [
    {
      t: "path",
      d: "M14 41 C14 25 22 16 32 16 C42 16 50 25 50 41 Z",
      fill: C.khaki,
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M32 17 V34 M22 21 Q25 30 25 35 M42 21 Q39 30 39 35",
      stroke: INK,
      w: 1.4,
      o: 0.3,
    },
    {
      t: "path",
      d: "M4 43 Q32 34 60 43 Q60 51 32 49 Q4 51 4 43 Z",
      fill: C.tan,
      stroke: INK,
      w: S,
    },
    { t: "rect", x: 14.3, y: 35, width: 35.4, height: 5, fill: "#7C5A2E" },
    { t: "circle", cx: 32, cy: 15.5, r: 2.6, fill: C.tan, stroke: INK, w: 1.6 },
  ],
  crown: [
    {
      t: "path",
      d: "M10 46 L8 18 L20 30 L32 12 L44 30 L56 18 L54 46 Z",
      fill: C.sun,
      stroke: INK,
      w: S,
    },
    {
      t: "rect",
      x: 8.5,
      y: 42,
      width: 47,
      height: 9,
      rx: 2.5,
      fill: C.gold,
      stroke: INK,
      w: S,
    },
    { t: "circle", cx: 8, cy: 17, r: 3.2, fill: C.coral, stroke: INK, w: 1.6 },
    { t: "circle", cx: 32, cy: 11, r: 3.6, fill: C.sky, stroke: INK, w: 1.6 },
    { t: "circle", cx: 56, cy: 17, r: 3.2, fill: C.lilac, stroke: INK, w: 1.6 },
    {
      t: "path",
      d: "M19 46.5 h2 M31 46.5 h2 M43 46.5 h2",
      stroke: INK,
      w: 2.4,
    },
  ],
  sunhat: [
    {
      t: "ellipse",
      cx: 32,
      cy: 44,
      rx: 29,
      ry: 9,
      fill: "#F9DD84",
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M17 44 C17 29 24 22 32 22 C40 22 47 29 47 44 Z",
      fill: C.sun,
      stroke: INK,
      w: S,
    },
    {
      t: "path",
      d: "M17.3 38 Q32 41 46.7 38 L47 43 Q32 46 17 43 Z",
      fill: C.coral,
      stroke: INK,
      w: 1.6,
    },
    {
      t: "circle",
      cx: 46,
      cy: 36.5,
      r: 2.4,
      fill: C.white,
      stroke: INK,
      w: 1.2,
    },
    {
      t: "circle",
      cx: 49.5,
      cy: 39.5,
      r: 2.4,
      fill: C.white,
      stroke: INK,
      w: 1.2,
    },
    {
      t: "circle",
      cx: 46.6,
      cy: 41.5,
      r: 2.4,
      fill: C.white,
      stroke: INK,
      w: 1.2,
    },
    { t: "circle", cx: 47.4, cy: 39.2, r: 1.6, fill: C.orange },
  ],
  nightcap: [
    {
      t: "path",
      d: "M12 47 C12 31 22 21 34 19 C45 17 52 11 57 22 C51 19 47 25 48 33 C49 39 52 43 52 47 Z",
      fill: C.sky,
      stroke: INK,
      w: S,
    },
    star(27, 27, 2.4, C.sun),
    star(41, 22, 2, C.sun),
    { t: "circle", cx: 57, cy: 23, r: 4.6, fill: C.cream, stroke: INK, w: 2 },
    {
      t: "rect",
      x: 10,
      y: 43,
      width: 44,
      height: 10,
      rx: 5,
      fill: C.cream,
      stroke: INK,
      w: S,
    },
    { t: "path", d: "M50 8 h5 l-5 6 h5", stroke: INK, w: 1.6 },
  ],
};


function artFor(id: HatArtId): Shape[] {
  if (id !== "stack") return ART[id];
  return [
    { t: "g", transform: "translate(-1 12) scale(0.56)", children: ART.tophat },
    { t: "g", transform: "translate(29 10) scale(0.56)", children: ART.party },
    { t: "g", transform: "translate(12 25) scale(0.62)", children: ART.cap },
  ];
}
export const hatShapes = artFor;
export const HAT_ART_IDS = [
  ...(Object.keys(ART) as HatArtId[]),
  "stack" as const,
];

const esc = (n: number | string) => String(n);
function shapeSvg(s: Shape): string {
  if (s.t === "g")
    return `<g transform="${s.transform}">${s.children.map(shapeSvg).join("")}</g>`;
  const paint = `fill="${s.fill ?? "none"}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.w ?? S}" stroke-linecap="round" stroke-linejoin="round"` : ""}${s.o !== undefined ? ` opacity="${s.o}"` : ""}`;
  switch (s.t) {
    case "path":
      return `<path d="${s.d}" ${paint}/>`;
    case "circle":
      return `<circle cx="${esc(s.cx)}" cy="${esc(s.cy)}" r="${esc(s.r)}" ${paint}/>`;
    case "ellipse":
      return `<ellipse cx="${esc(s.cx)}" cy="${esc(s.cy)}" rx="${esc(s.rx)}" ry="${esc(s.ry)}" ${paint}/>`;
    case "rect":
      return `<rect x="${esc(s.x)}" y="${esc(s.y)}" width="${esc(s.width)}" height="${esc(s.height)}"${s.rx ? ` rx="${s.rx}"` : ""} ${paint}/>`;
  }
}
/** Standalone SVG markup, used by home-screen widgets and previews. */
export function hatSvg(id: HatArtId, size = 64): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${artFor(id).map(shapeSvg).join("")}</svg>`;
}
