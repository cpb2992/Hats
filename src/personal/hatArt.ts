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

const ART: Record<Exclude<HatArtId, "stack">, Shape[]> = {
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
