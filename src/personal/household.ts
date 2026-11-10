/**
 * Family sharing, the network side: start or join a household, see who's in it, and move
 * shared things up and down. What gets shared, and how it merges, lives in share.ts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { currentSession, request } from "./cloud";
import type { Household } from "./model";
import type { Member, OutRow, RemoteRow, ShareState } from "./share";

const STATE = "hats.household.sync";

async function token() {
  const s = await currentSession();
  if (!s) throw new Error("Sign in first (Settings → Sync), then set up family sharing.");
  return s;
}
const friendly = (e: unknown) => {
  const text = e instanceof Error ? e.message : String(e);
  if (text.includes("ALREADY_IN_HOUSEHOLD")) return new Error("You’re already sharing with a family. Leave it first to join another.");
  if (text.includes("NO_SUCH_CODE")) return new Error("That code didn’t match a family. Check the 8 letters and numbers and try again.");
  if (text.includes("NOT_IN_HOUSEHOLD")) return new Error("You’re not sharing with a family right now.");
  return e instanceof Error ? e : new Error(text);
};
const rpc = async <T,>(name: string, body: object): Promise<T> => {
  const s = await token();
  try {
    return (await request(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(body) }, s.access_token)) as T;
  } catch (e) {
    throw friendly(e);
  }
};

/** Invite codes are 8 letters and numbers; people type them however. */
export const tidyCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const showCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** The household you're in, with everyone in it (null if none). */
export async function fetchHousehold(): Promise<Household | null> {
  const s = await token();
  const homes = (await request("/rest/v1/households?select=id,name,invite_code", {}, s.access_token)) as {
    id: string;
    name: string;
    invite_code: string;
  }[];
  const home = homes?.[0];
  if (!home) return null;
  const people = (await request(
    "/rest/v1/household_members?select=user_id,display_name&order=joined_at.asc",
    {},
    s.access_token,
  )) as { user_id: string; display_name: string }[];
  return {
    id: home.id,
    name: home.name,
    code: home.invite_code,
    me: s.user.id,
    members: (people ?? []).map((p) => ({ id: p.user_id, name: p.display_name })),
  };
}

export async function startHousehold(name: string, me: string) {
  await rpc("create_household", { p_name: name, p_display: me });
  const home = await fetchHousehold();
  if (!home) throw new Error("The family was made but couldn’t be read back. Try again in a moment.");
  return home;
}
export async function joinHousehold(code: string, me: string) {
  const clean = tidyCode(code);
  if (clean.length !== 8) throw new Error("Invite codes are 8 letters and numbers, like ABCD-2345.");
  await rpc("join_household", { p_code: clean, p_display: me });
  const home = await fetchHousehold();
  if (!home) throw new Error("Joined, but couldn’t read the family back. Try again in a moment.");
  return home;
}
export async function leaveHousehold() {
  await rpc("leave_household", {});
  await AsyncStorage.removeItem(STATE);
}
export async function newInviteCode(): Promise<string> {
  return rpc<string>("rotate_invite_code", {});
}

/** Changes since `since` (a server time), oldest first. */
export async function pullItems(householdId: string, since: string): Promise<RemoteRow[]> {
  const s = await token();
  const out: RemoteRow[] = [];
  let after = since;
  // Pages of 500 until caught up (a first sync can be big).
  for (let page = 0; page < 20; page++) {
    const rows = (await request(
      `/rest/v1/household_items?select=id,kind,payload,deleted,updated_at,updated_by&household_id=eq.${encodeURIComponent(householdId)}&updated_at=gt.${encodeURIComponent(after)}&order=updated_at.asc&limit=500`,
      {},
      s.access_token,
    )) as RemoteRow[];
    out.push(...(rows ?? []));
    if (!rows || rows.length < 500) break;
    after = rows[rows.length - 1].updated_at;
  }
  return out;
}

export async function pushItems(householdId: string, rows: OutRow[]) {
  if (!rows.length) return;
  const s = await token();
  for (let i = 0; i < rows.length; i += 200)
    await request(
      "/rest/v1/household_items?on_conflict=household_id,id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(
          rows.slice(i, i + 200).map((r) => ({
            household_id: householdId,
            id: r.id,
            kind: r.kind,
            payload: r.payload,
            deleted: r.deleted,
          })),
        ),
      },
      s.access_token,
    );
}

export async function loadShareState(householdId: string): Promise<ShareState> {
  try {
    const raw = await AsyncStorage.getItem(STATE);
    const state = raw ? (JSON.parse(raw) as ShareState) : null;
    if (state && state.householdId === householdId && state.synced && typeof state.lastPull === "string")
      return state;
  } catch {
    // A damaged sync memory just means a fresh first sync.
  }
  return { householdId, lastPull: "1970-01-01T00:00:00Z", synced: {} };
}
export const saveShareState = (state: ShareState) => AsyncStorage.setItem(STATE, JSON.stringify(state));
export const forgetShareState = () => AsyncStorage.removeItem(STATE);

export type { Member };
