/**
 * The hat library: every hat you can pick for a hat you add yourself, with a
 * name, a shelf to browse by, colors for its cards, and words that help the
 * picker suggest hats that fit what you named it. Pure, so it can be tested.
 */
import type { HatArtId } from "./hatArt";

export type Shelf = "Work & school" | "Home & family" | "Play & sports" | "Outdoors" | "Holidays & dress-up";
export const SHELVES: Shelf[] = ["Work & school", "Home & family", "Play & sports", "Outdoors", "Holidays & dress-up"];

export interface LibraryHat {
  art: Exclude<HatArtId, "stack">;
  name: string;
  shelf: Shelf;
  /** Light card background. */
  tint: string;
  /** Text and accent color on that background. */
  color: string;
  /** Words this hat fits, lowercase. */
  words: string[];
}

const hat = (
  art: LibraryHat["art"],
  name: string,
  shelf: Shelf,
  tint: string,
  color: string,
  words: string,
): LibraryHat => ({ art, name, shelf, tint, color, words: words.split(" ") });

export const LIBRARY: LibraryHat[] = [
  hat("mortarboard", "Graduation cap", "Work & school", "#E3E8F6", "#2C3E63", "teach teacher teaching school class classes college grad graduate study studying homework lesson students"),
  hat("goggles", "Lab goggles", "Work & school", "#D6F1EC", "#2F6F66", "science lab experiment stem chemistry biology physics research"),
  hat("hardhat", "Hard hat", "Work & school", "#FFF0C2", "#8A6416", "work job build building project projects fix repair construction diy renovation tools"),
  hat("captain", "Captain’s cap", "Work & school", "#E3E8F6", "#2C3E63", "lead leader leadership boss team head department union rep steward coach captain boat sail"),
  hat("detective", "Detective cap", "Work & school", "#F6E9D3", "#7A5A2E", "research mystery solve investigate puzzle puzzles case cases admin paperwork"),
  hat("newsboy", "Flat cap", "Work & school", "#E6EAF1", "#4E5D77", "write writing writer news author book books journal blog newsletter read reading"),
  hat("tophat", "Top hat", "Work & school", "#E3E8F6", "#2C3E63", "money finance finances budget bills taxes invest business fancy"),
  hat("bowler", "Bowler", "Work & school", "#E6EAF1", "#4B5A73", "business meeting meetings office side hustle llc company client clients formal"),
  hat("firefighter", "Fire helmet", "Work & school", "#FCE1DE", "#A33F39", "emergency emergencies safety fire rescue urgent alarm"),
  hat("cap", "Ball cap", "Home & family", "#DCE9FA", "#56739B", "home house chores everyday errands laundry"),
  hat("propeller", "Propeller beanie", "Home & family", "#FFF0C2", "#3D65A2", "dad kids kid son daughter children family play"),
  hat("catbeanie", "Cat beanie", "Home & family", "#FFE3CC", "#95713C", "pets pet cat cats dog dogs puppy kitten animals vet"),
  hat("chef", "Chef hat", "Home & family", "#F3EFE7", "#6E5F48", "cook cooking meals meal kitchen bake baking food recipes dinner lunch grocery groceries"),
  hat("nightcap", "Nightcap", "Home & family", "#DCE9FA", "#3D65A2", "sleep rest bedtime night routine nap calm"),
  hat("fedora", "Fedora", "Home & family", "#FCE1D8", "#B45C43", "husband wife partner spouse date dates love romance marriage anniversary"),
  hat("bunny", "Bunny ears", "Home & family", "#F3E8FA", "#7B5A99", "kids daughter son baby toddler cute easter bunny"),
  hat("tiara", "Tiara", "Home & family", "#FCE4EA", "#A0506A", "daughter daughters princess girls birthday celebrate queen"),
  hat("pompom", "Pompom beanie", "Home & family", "#D3F0E8", "#496A8B", "myself me self health wellness winter cozy personal"),
  hat("football", "Football helmet", "Play & sports", "#DCE6F6", "#2F5089", "football sports sport coach coaching team game games practice league"),
  hat("bike", "Bike helmet", "Play & sports", "#FFE6D3", "#A4562A", "bike biking cycling ride riding exercise commute"),
  hat("visor", "Sun visor", "Play & sports", "#FCE1DE", "#A9503E", "tennis golf run running jog pickleball sports summer"),
  hat("bandana", "Bandana", "Play & sports", "#FCE1DE", "#A9503E", "workout gym fitness lift yard cleaning clean chores sweat"),
  hat("headphones", "Headphones", "Play & sports", "#FCE4DC", "#4E5D77", "music band guitar piano drums song songs podcast listen focus dj"),
  hat("viking", "Viking helmet", "Play & sports", "#E6EAF1", "#5B4A1E", "strength strong lift lifting gym gaming games battle challenge"),
  hat("jester", "Jester hat", "Play & sports", "#FFF0C2", "#8C668C", "fun funny comedy jokes games play party improv"),
  hat("wizard", "Wizard hat", "Play & sports", "#DCE6F6", "#3D4F86", "magic ideas idea dream dreams plan plans learn learning fantasy dnd"),
  hat("party", "Party hat", "Play & sports", "#EEE1FA", "#8C668C", "friends friend party parties birthday birthdays celebrate social"),
  hat("safari", "Explorer hat", "Outdoors", "#F6E9D3", "#7A5A2E", "travel trip trips adventure explore outing outings hike hiking vacation"),
  hat("straw", "Straw hat", "Outdoors", "#F3ECD8", "#5E7F45", "garden gardening yard plants plant farm bees flowers lawn"),
  hat("sunhat", "Sun hat", "Outdoors", "#FFF3CC", "#8A6416", "summer beach sun vacation pool lake garden gardening"),
  hat("bucket", "Bucket hat", "Outdoors", "#D6F1EC", "#2F6F66", "fishing fish beach camp camping festival outdoors canoe"),
  hat("cowboy", "Cowboy hat", "Outdoors", "#F6E9D3", "#7A5A2E", "ranch horse horses western country rodeo farm barn"),
  hat("rainhat", "Rain hat", "Outdoors", "#FFF3CC", "#8A6416", "rain weather walk walks dog outdoors puddles"),
  hat("astronaut", "Space helmet", "Outdoors", "#E6EAF1", "#2C3E63", "space stem science explore rocket stars astronomy planets"),
  hat("santa", "Santa hat", "Holidays & dress-up", "#FCE1DE", "#A33F39", "christmas holiday holidays gifts gift december winter"),
  hat("witch", "Witch hat", "Holidays & dress-up", "#EEE6F8", "#5A4590", "halloween spooky october costume costumes"),
  hat("pirate", "Pirate hat", "Holidays & dress-up", "#E6EAF1", "#2B3550", "pirate treasure adventure costume kids pretend"),
  hat("flowers", "Flower crown", "Holidays & dress-up", "#FCE4EA", "#A0506A", "spring wedding anniversary love selfcare self-care bloom flowers"),
  hat("crown", "Crown", "Holidays & dress-up", "#FFF0C2", "#8A6416", "wins win goals goal milestones proud king best"),
  hat("earmuffs", "Earmuffs", "Holidays & dress-up", "#FCE4EA", "#7B5A99", "winter cold snow skiing quiet calm"),
  hat("beret", "Beret", "Holidays & dress-up", "#FCE1DE", "#A9503E", "art arts paint painting draw drawing design creative french craft crafts"),
  hat("paperhat", "Paper hat", "Holidays & dress-up", "#F3EFE7", "#6E5F48", "craft crafts diy kids create make homework newspaper"),
];

export const libraryHat = (art: HatArtId): LibraryHat =>
  LIBRARY.find((h) => h.art === art) ?? LIBRARY.find((h) => h.art === "cap")!;

const tokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length >= 2 && !["the", "and", "my", "of", "for", "to", "a", "an"].includes(w));

/** Hats that fit a name, best first. "Coach" → captain's cap and football helmet. */
export function suggestHats(name: string, max = 6): LibraryHat[] {
  const words = tokens(name);
  if (!words.length) return [];
  const scored = LIBRARY.map((h, i) => {
    let score = 0;
    const own = tokens(h.name);
    for (const w of words) {
      const stem = w.replace(/(ing|es|s)$/, "");
      if (h.words.includes(w) || own.includes(w)) score += 3;
      else if (
        stem.length >= 3 &&
        h.words.some((x) => x.startsWith(stem) || (x.length >= 4 && stem.startsWith(x)))
      )
        score += 2;
    }
    return { h, score, i };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, max)
    .map((x) => x.h);
}

/** Search the whole library by hat name or the words it fits. */
export function searchHats(query: string): LibraryHat[] {
  const q = query.trim().toLowerCase();
  if (!q) return LIBRARY;
  const hits = suggestHats(q, LIBRARY.length);
  const byName = LIBRARY.filter(
    (h) => h.name.toLowerCase().includes(q) && !hits.includes(h),
  );
  return [...byName, ...hits];
}
