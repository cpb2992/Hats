/**
 * Food stickers for recipe cards, drawn like the hats: a 64×64 grid, chunky ink outlines,
 * flat fills, a little shine. Pure data, rendered by <Food> in Hat.tsx.
 */
import { C, INK, type Shape } from "./hatArt";

export type FoodArtId =
  | "taco"
  | "noodles"
  | "bowl"
  | "pasta"
  | "pizza"
  | "soup"
  | "salad"
  | "burger"
  | "wrap"
  | "pancakes"
  | "chicken"
  | "fish"
  | "sheetpan"
  | "skillet"
  | "plate";

const S = 2.6;
const p = (d: string, fill?: string, w = S): Shape => ({ t: "path", d, fill, stroke: INK, w });
const ln = (d: string, stroke: string = INK, w = 1.4, o?: number): Shape =>
  o === undefined ? { t: "path", d, stroke, w } : { t: "path", d, stroke, w, o };
const ci = (cx: number, cy: number, r: number, fill: string, w = 1.6): Shape => ({ t: "circle", cx, cy, r, fill, stroke: INK, w });
const dot = (cx: number, cy: number, r: number, fill: string, o?: number): Shape =>
  o === undefined ? { t: "circle", cx, cy, r, fill } : { t: "circle", cx, cy, r, fill, o };
const rc = (x: number, y: number, width: number, height: number, rx: number, fill: string, w = S): Shape => ({ t: "rect", x, y, width, height, rx, fill, stroke: INK, w });
const el = (cx: number, cy: number, rx: number, ry: number, fill: string, w = S): Shape => ({ t: "ellipse", cx, cy, rx, ry, fill, stroke: INK, w });
const shine = (d: string): Shape => ({ t: "path", d, stroke: "#fff", w: 1.8, o: 0.5 });
const band = (d: string, fill: string, w = 3): Shape[] => [ln(d, INK, w + 3), ln(d, fill, w)];

const RED = "#E25C55";
const GREEN = "#7BBF84";
const LEAF = "#5E9C6A";
const BREAD = "#E8A85C";
const STEEL = "#AEB9CC";
const BOWL = (fill: string): Shape => p("M8 33 L56 33 Q56 52 32 54 Q8 52 8 33 Z", fill);

const ART: Record<FoodArtId, Shape[]> = {
  taco: [
    p("M8 32 Q11 23 15 28 Q18 20 22 26 Q26 19 30 25 Q34 18 38 25 Q42 19 46 26 Q50 20 53 27 Q57 23 57 32 Z", GREEN, 2),
    p("M10 32 Q20 25 32 27.5 Q44 25 54 32 Z", "#9B5B3A", 1.8),
    ci(20, 25.5, 2.6, RED, 1.3),
    ci(37, 23, 2.6, RED, 1.3),
    ci(47, 25.5, 2.4, RED, 1.3),
    p("M5 31 C5 47 17 55 32 55 C47 55 59 47 59 31 Q32 37 5 31 Z", "#F2C35B"),
    dot(18, 44, 1.3, "#C98E2E"),
    dot(30, 48, 1.3, "#C98E2E"),
    dot(43, 45, 1.3, "#C98E2E"),
    dot(25, 40, 1.1, "#C98E2E"),
    dot(38, 41, 1.1, "#C98E2E"),
    shine("M11 38 Q14 45 20 49"),
  ],
  noodles: [
    ...band("M47 29 L60 8", "#DDBB82", 2.6),
    ...band("M51 31 L62 14", "#DDBB82", 2.6),
    ...band("M13 33 Q17 24 21 30 Q25 22 29 29 Q33 21 37 29 Q41 23 45 30 Q49 25 51 33", C.sun, 3),
    ci(24, 28, 2.4, GREEN, 1.2),
    ci(40, 27.5, 2.4, "#F08A4B", 1.2),
    BOWL(C.coral),
    ln("M11 39 Q32 44 53 39", "#fff", 2, 0.6),
    shine("M13 44 Q17 49 24 51"),
  ],
  bowl: [
    p("M10 34 Q11 21 32 20 Q53 21 54 34 Z", C.white, 2.2),
    ci(20, 27, 3.4, LEAF, 1.3),
    ci(24.5, 24, 3, GREEN, 1.3),
    rc(31, 22, 9, 6, 3, "#D9894B", 1.4),
    rc(40, 25, 9, 6, 3, "#D9894B", 1.4),
    dot(29, 30, 0.9, INK, 0.6),
    dot(35, 31, 0.9, INK, 0.6),
    dot(44, 32, 0.9, INK, 0.6),
    BOWL(C.teal),
    ln("M11 39 Q32 44 53 39", "#fff", 2, 0.6),
    shine("M13 44 Q17 49 24 51"),
  ],
  pasta: [
    el(32, 45, 28, 10, C.white),
    p("M12 43 Q13 26 32 24 Q51 26 52 43 Q32 49 12 43 Z", "#F4D58D", 2.2),
    ln("M18 38 Q24 30 32 34 Q40 38 46 32 M16 42 Q26 36 34 40 Q42 44 48 39", "#D9A441", 1.4),
    p("M19 32 Q23 24 32 25 Q42 24 45 32 Q38 36 32 34 Q24 37 19 32 Z", RED, 1.8),
    ci(26, 30.5, 4, "#8A4B2E", 1.5),
    ci(37.5, 29.5, 4, "#8A4B2E", 1.5),
    p("M31 24 q3 -5 7 -3 q-3 5 -7 3 Z", LEAF, 1.1),
  ],
  pizza: [
    p("M9 17 Q32 7 55 17 L32 58 Z", C.sun),
    ci(24, 27, 4, RED, 1.4),
    ci(39, 28, 4, RED, 1.4),
    ci(31, 40, 3.6, RED, 1.4),
    ln("M44 31 q1 5 -1 8", "#E9A93A", 2, 0.9),
    p("M7 16 Q32 5 57 16 L54.5 22 Q32 12.5 9.5 22 Z", C.tan),
    shine("M14 18.5 Q22 14.5 30 13.5"),
  ],
  soup: [
    ln("M22 23 q-3 -4 0 -8 q3 -4 0 -8", INK, 2, 0.45),
    ln("M32 21 q-3 -4 0 -8 q3 -4 0 -8", INK, 2, 0.45),
    ln("M42 23 q-3 -4 0 -8 q3 -4 0 -8", INK, 2, 0.45),
    BOWL(C.orange),
    el(32, 33, 24, 5.5, "#F7B867", 2.4),
    dot(24, 33, 1.8, GREEN),
    dot(33, 32, 1.6, RED),
    dot(40, 34, 1.8, C.sun),
    ln("M11 41 Q32 46 53 41", "#fff", 2, 0.5),
    shine("M13 44 Q17 49 24 51"),
  ],
  salad: [
    p("M9 33 Q10 22 18 24 Q20 16 28 20 Q32 13 38 19 Q46 15 48 23 Q56 23 55 33 Z", GREEN, 2),
    ln("M18 27 Q22 25 25 29 M33 22 Q35 25 34 29 M43 25 Q46 27 46 31", LEAF, 1.4),
    ci(23, 29, 3, RED, 1.3),
    ci(41, 28, 3, RED, 1.3),
    ci(32, 30, 2.4, C.white, 1.2),
    BOWL(C.white),
    ln("M11 39 Q32 44 53 39", C.sky, 2.4),
    shine("M13 44 Q17 49 24 51"),
  ],
  burger: [
    rc(10, 42, 44, 9, 4.5, BREAD),
    rc(8, 34, 48, 9, 4.5, "#7A4A33"),
    p("M9 35 L55 35 L50 40 L44 36 L38 41 L32 36 L26 41 L20 36 L14 40 Z", C.sun, 1.5),
    p("M7 32 Q11 36 15 32 Q19 36 23 32 Q27 36 31 32 Q35 36 39 32 Q43 36 47 32 Q51 36 57 32 L56 29 L8 29 Z", GREEN, 1.6),
    p("M10 30 C10 18 20 12 32 12 C44 12 54 18 54 30 Z", BREAD),
    dot(22, 21, 1.1, C.cream),
    dot(30, 17, 1.1, C.cream),
    dot(39, 20, 1.1, C.cream),
    dot(45, 25, 1.1, C.cream),
    dot(27, 25, 1.1, C.cream),
    shine("M16 24 Q19 18 25 16"),
  ],
  wrap: [
    {
      t: "g",
      transform: "rotate(-22 32 32)",
      children: [
        rc(6, 22, 46, 21, 10.5, "#F3DDB0"),
        ln("M18 23 Q16 32 18 42 M30 23 Q28 32 30 42", "#C9A46A", 1.4, 0.8),
        el(51, 32.5, 6.5, 10.5, "#E8C98F", 2.2),
        dot(49.5, 28.5, 2, GREEN),
        dot(53, 32, 2, RED),
        dot(49.5, 36, 2, "#9B5B3A"),
        dot(52.5, 37.5, 1.4, C.sun),
        shine("M12 27 Q22 25.5 34 26"),
      ],
    },
  ],
  pancakes: [
    el(32, 49, 26, 6, C.white),
    rc(12, 38, 40, 8, 4, "#E8B46A"),
    rc(13, 30, 38, 8, 4, "#EDBE76"),
    rc(14, 22, 36, 8, 4, "#E8B46A"),
    p("M20 22 Q32 19 44 22 L44 25 Q41 25 40 30 Q38 33 37 27 Q31 25 26 26 Q25 30 23 28 Q22 24 20 25 Z", "#9C5B2E", 1.4),
    rc(27, 15, 10, 7, 2, C.sun, 1.6),
    shine("M17 41 Q22 40 28 40.5"),
  ],
  chicken: [
    ...band("M36 40 L48 52", C.cream, 4.6),
    ci(47.5, 54.5, 3.6, C.cream, 1.8),
    ci(51.5, 50, 3.6, C.cream, 1.8),
    p("M22 46 C9 46 7 29 17 21 C27 13 44 15 46 28 C47 36 41 40 35 42 Q30 46 22 46 Z", "#C9783F"),
    shine("M15 28 Q19 21 27 19"),
    dot(24, 32, 1.2, "#9C5B2E", 0.7),
    dot(33, 27, 1.2, "#9C5B2E", 0.7),
    dot(30, 37, 1.2, "#9C5B2E", 0.7),
  ],
  fish: [
    el(32, 48, 27, 6.5, C.white),
    p("M8 32 Q22 16 42 24 Q46 26 48 28 L58 20 L56 32 L58 44 L48 36 Q46 38 42 40 Q22 48 8 32 Z", "#F5A27A"),
    ln("M24 24 Q28 32 24 40", INK, 1.6, 0.6),
    ci(17, 29.5, 1.8, INK, 0.8),
    ln("M30 27 Q34 32 30 37 M36 27 Q40 32 36 37", "#fff", 1.4, 0.5),
    p("M44 44 L52 44 Q52 50 48 51 Q44 50 44 44 Z", C.sun, 1.4),
  ],
  sheetpan: [
    rc(4, 30, 56, 22, 4, STEEL),
    rc(9, 33.5, 46, 15, 2.5, "#8C9BB0", 1.8),
    rc(13, 35.5, 10, 7, 3.5, "#D9A35B", 1.3),
    rc(36, 38, 10, 7, 3.5, "#D9A35B", 1.3),
    ci(29, 39, 3.6, LEAF, 1.3),
    ci(49.5, 37.5, 3.2, GREEN, 1.3),
    p("M24 44 Q28 40 33 44", undefined, 1),
    ...band("M23 45.5 Q28 41.5 33 45.5", RED, 2.2),
    ...band("M40 35.5 Q44 33 47 36", C.sun, 2.2),
    ...band("M14 45 Q17 43 21 45", C.sun, 2),
  ],
  skillet: [
    p("M46 33 L62 28.5 L63 34.5 L47.5 40 Z", "#2B3550"),
    ci(29, 36, 19, "#3B475E", S),
    ci(29, 36, 14.5, "#4B5A73", 1.4),
    p("M18 34 Q17 25 26 25 Q31 21 36 26 Q42 27 40 35 Q42 44 33 44 Q26 48 21 42 Q15 41 18 34 Z", C.white, 1.8),
    ci(29, 35, 5, C.sun, 1.6),
    dot(22, 31, 1.6, GREEN),
    dot(36, 40, 1.6, RED),
    dot(35, 29, 1.4, GREEN),
    shine("M15 28 Q19 21 26 19"),
  ],
  plate: [
    ...band("M8 14 L8 50 M5 14 L5 24 Q5 28 8 28 Q11 28 11 24 L11 14", C.white, 1.4),
    ...band("M56 14 Q61 22 57 32 L56 50", C.white, 1.8),
    el(32, 34, 19, 19, C.white),
    el(32, 34, 13, 13, "#EEF2F7", 1.4),
    p("M24 34 Q26 26 33 27 Q40 27 40 34 Q38 41 32 41 Q25 41 24 34 Z", "#E8A85C", 1.6),
    dot(29, 32, 1.4, GREEN),
    dot(35, 35, 1.4, RED),
  ],
};

export const FOOD_ART_IDS = Object.keys(ART) as FoodArtId[];
export const foodShapes = (id: FoodArtId): Shape[] => ART[id] ?? ART.plate;
