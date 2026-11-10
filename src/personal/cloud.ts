import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { validData, type PersonalData, type PersonalEvent } from "./model";
import { secretGet, secretSet } from "./storage";
import { addDays, todayISO, timeOf } from "../engine/dates";
import type { WhoopSummary } from "./whoop";

WebBrowser.maybeCompleteAuthSession();
export interface CloudConfig {
  url: string;
  key: string;
}
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
  provider_token?: string;
}
export interface Remote {
  revision: number;
  payload: PersonalData;
}
/**
 * Hats' own sync server. Public by design: the publishable key only lets people sign in, and
 * row-level security keeps every account's data to itself. A private server set up in
 * Settings, or EXPO_PUBLIC_ values at build time, take its place.
 */
export const HOSTED: CloudConfig = {
  url: "https://iyneflhujuemucfgsgwb.supabase.co",
  key: "sb_publishable_M8om7imNFNqdo-xM4lkWGQ_9Ia8HvoX",
};
export async function getConfig(): Promise<CloudConfig | null> {
  const raw = await secretGet("hats.cloud.config");
  if (raw) return JSON.parse(raw);
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : HOSTED;
}
export async function setConfig(config: CloudConfig) {
  const url = new URL(config.url);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co"))
    throw new Error("Use your HTTPS Supabase project URL.");
  if (!config.key.trim())
    throw new Error("Add the project’s public publishable or anon key.");
  if (config.key.startsWith("sb_secret_"))
    throw new Error("Use the public publishable key, never a secret key.");
  if (config.key.split(".").length === 3) {
    try {
      const payload = JSON.parse(
        atob(config.key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role === "service_role") throw new Error("SECRET_KEY");
    } catch (e) {
      if (e instanceof Error && e.message === "SECRET_KEY")
        throw new Error("Use the public anon key, never a service-role key.");
    }
  }
  await secretSet(
    "hats.cloud.config",
    JSON.stringify({
      url: config.url.replace(/\/$/, ""),
      key: config.key.trim(),
    }),
  );
}
export async function request(
  path: string,
  options: RequestInit = {},
  token?: string,
) {
  const config = await getConfig();
  if (!config) throw new Error("Set up your private cloud connection first.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${config.url}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        response.status === 401
          ? "Your sign-in expired. Please sign in again."
          : body?.msg ||
              body?.message ||
              body?.error_description ||
              `Connection failed (${response.status}).`,
      );
    return body;
  } finally {
    clearTimeout(timer);
  }
}
async function storeSession(session: Session) {
  session.expires_at =
    session.expires_at || Math.floor(Date.now() / 1000) + 3600;
  await secretSet("hats.cloud.session", JSON.stringify(session));
}
export async function currentSession(): Promise<Session | null> {
  const raw = await secretGet("hats.cloud.session");
  if (!raw) return null;
  let session = JSON.parse(raw) as Session;
  if (session.expires_at * 1000 < Date.now() + 60000) {
    const next = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    session = { ...next, provider_token: session.provider_token };
    await storeSession(session);
  }
  return session;
}
async function pkcePair() {
  const verifier = Array.from(Crypto.getRandomBytes(32))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const challenge = (
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verifier, challenge };
}
const EMAIL_PKCE = "hats.cloud.email-pkce";
/**
 * Emails a one-tap sign-in link (and a code, if the project's template includes one).
 * The link returns to hats://auth-callback with a one-time code that only this phone can
 * redeem, because the matching PKCE verifier never leaves the device.
 */
export async function sendCode(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  const { verifier, challenge } = await pkcePair();
  await secretSet(EMAIL_PKCE, verifier);
  const redirect = Linking.createURL("auth-callback");
  await request(`/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {
    method: "POST",
    body: JSON.stringify({
      email,
      create_user: true,
      code_challenge: challenge,
      code_challenge_method: "s256",
    }),
  });
}
/** True while an emailed sign-in link from this phone is waiting to be tapped. */
export async function emailLinkPending() {
  return Boolean(await secretGet(EMAIL_PKCE));
}
/** Finishes sign-in from the emailed link. Returns the signed-in email address. */
export async function finishEmailLink(code: string) {
  const verifier = await secretGet(EMAIL_PKCE);
  if (!verifier)
    throw new Error(
      "This sign-in link was requested on another device or already used. Send a new one from Settings.",
    );
  const existing = await currentSession().catch(() => null);
  const next = (await request("/auth/v1/token?grant_type=pkce", {
    method: "POST",
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  })) as Session;
  await secretSet(EMAIL_PKCE, null);
  if (existing && existing.user.id !== next.user.id)
    throw new Error(
      "That link belongs to a different account. Sign out before switching accounts. Your local data is unchanged.",
    );
  await storeSession(next);
  return next.user.email as string;
}
export async function verifyCode(email: string, token: string) {
  const session = await request("/auth/v1/verify", {
    method: "POST",
    body: JSON.stringify({ email, token, type: "email" }),
  });
  await storeSession(session);
  await secretSet(EMAIL_PKCE, null);
  return session.user.email as string;
}
export async function signOut() {
  const raw = await secretGet("hats.cloud.session");
  if (raw) {
    const s = JSON.parse(raw);
    await request("/auth/v1/logout", { method: "POST" }, s.access_token).catch(
      () => {},
    );
  }
  await secretSet("hats.cloud.session", null);
  await secretSet("hats.whoop.summary", null);
}
export async function readRemote(): Promise<Remote | null> {
  const s = await currentSession();
  if (!s) throw new Error("Sign in to sync or recover your plan.");
  const rows = await request(
    "/rest/v1/personal_state?select=revision,payload",
    {},
    s.access_token,
  );
  const row = rows[0];
  if (!row) return null;
  if (!validData(row.payload))
    throw new Error(
      "Cloud data is from an unsupported version. Your local plan is unchanged.",
    );
  return row;
}
export async function writeRemote(
  payload: PersonalData,
  expected: number,
): Promise<number> {
  const s = await currentSession();
  if (!s) throw new Error("Sign in first.");
  const row = await request(
    "/rest/v1/rpc/save_personal_state",
    {
      method: "POST",
      body: JSON.stringify({ p_expected: expected, p_payload: payload }),
    },
    s.access_token,
  );
  if (typeof row !== "number")
    throw new Error("Cloud save did not return a revision.");
  return row;
}
export async function googleSignIn() {
  const config = await getConfig();
  if (!config)
    throw new Error("Configure your private cloud connection first.");
  // A Google return must never be redeemed against a pending email link.
  await secretSet(EMAIL_PKCE, null);
  const { verifier, challenge } = await pkcePair();
  const redirect = Linking.createURL("auth-callback");
  const url = `${config.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}&scopes=${encodeURIComponent("https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.calendarlist.readonly")}&code_challenge=${challenge}&code_challenge_method=s256`;
  const response = await WebBrowser.openAuthSessionAsync(url, redirect);
  if (response.type !== "success")
    throw new Error("Google connection was cancelled.");
  const callback = new URL(response.url);
  const code = callback.searchParams.get("code");
  if (!code)
    throw new Error(
      callback.searchParams.get("error_description") ||
        "Google did not return an authorization code.",
    );
  const existing = await currentSession();
  const next = (await request("/auth/v1/token?grant_type=pkce", {
    method: "POST",
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  })) as Session;
  if (existing && existing.user.id !== next.user.id)
    throw new Error(
      "Google belongs to a different account. Sign out before switching accounts. Your local data is unchanged.",
    );
  await storeSession(next);
}
async function googleGet(path: string) {
  const s = await currentSession();
  if (!s?.provider_token) throw new Error("Connect Google Calendar first.");
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/${path}`,
    {
      headers: { Authorization: `Bearer ${s.provider_token}` },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Google access expired. Reconnect Google to refresh it."
        : "Could not read Google Calendar.",
    );
  return response.json();
}
export async function googleCalendars(): Promise<
  { id: string; summary: string }[]
> {
  const result = await googleGet("users/me/calendarList?maxResults=250");
  return result.items ?? [];
}
export async function readGoogleEvents(
  ids: string[],
): Promise<PersonalEvent[]> {
  if (!ids.length) return [];
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 30);
  const collected: PersonalEvent[] = [];
  for (const calendar of ids) {
    let page: string | undefined;
    do {
      const result = await googleGet(
        `calendars/${encodeURIComponent(calendar)}/events?singleEvents=true&maxResults=250&timeMin=${encodeURIComponent(from.toISOString())}&timeMax=${encodeURIComponent(to.toISOString())}${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`,
      );
      for (const e of result.items ?? []) {
        if (e.status === "cancelled") continue;
        const allDay = !!e.start?.date;
        if (!e.start?.date && !e.start?.dateTime) continue;
        const start = allDay ? null : new Date(e.start.dateTime);
        const end = allDay
          ? null
          : new Date(e.end?.dateTime ?? e.start.dateTime);
        const first = allDay ? e.start.date : todayISO(start!);
        const last = allDay
          ? addDays(e.end?.date ?? addDays(first, 1), -1)
          : todayISO(end!);
        for (let date = first; date <= last; date = addDays(date, 1)) {
          collected.push({
            id: `google:${calendar}:${e.id}:${date}`,
            externalId: e.id,
            title: e.summary || "Busy",
            date,
            start: allDay
              ? "00:00"
              : date === first
                ? timeOf(start!.getHours() * 60 + start!.getMinutes())
                : "00:00",
            end: allDay
              ? "23:59"
              : date === last
                ? timeOf(end!.getHours() * 60 + end!.getMinutes())
                : "23:59",
            allDay,
            source: "google",
            location: e.location ?? "",
          });
        }
      }
      page = result.nextPageToken;
    } while (page);
  }
  return collected;
}

// ---- WHOOP (read-only, through the private `whoop` server function) ----
const WHOOP_CACHE = "hats.whoop.summary";
async function whoopCall(
  action: string,
): Promise<WhoopSummary & { url?: string; configured?: boolean }> {
  const config = await getConfig();
  const s = await currentSession();
  if (!config || !s) throw new Error("Sign in to Hats sync first.");
  const response = await fetch(`${config.url}/functions/v1/whoop`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${s.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
    signal: AbortSignal.timeout(25000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      body?.error || `WHOOP connection failed (${response.status}).`,
    );
  return body;
}
/** Opens WHOOP's own sign-in; the server keeps the tokens. */
export async function connectWhoop() {
  const { url } = await whoopCall("start");
  if (!url) throw new Error("WHOOP sign-in could not start.");
  const back = Linking.createURL("auth-callback");
  const result = await WebBrowser.openAuthSessionAsync(url, back);
  if (result.type !== "success")
    throw new Error("WHOOP connection was cancelled.");
  const params = new URL(result.url).searchParams;
  if (params.get("status") !== "connected")
    throw new Error(params.get("error_description") || "WHOOP didn't connect.");
  return refreshWhoop();
}
/** Fetches the latest summary and keeps it only on this phone. */
export async function refreshWhoop(): Promise<WhoopSummary> {
  const summary = await whoopCall("summary");
  await secretSet(
    WHOOP_CACHE,
    summary.connected ? JSON.stringify(summary) : null,
  );
  return summary;
}
export async function cachedWhoop(): Promise<WhoopSummary | null> {
  const raw = await secretGet(WHOOP_CACHE).catch(() => null);
  try {
    return raw ? (JSON.parse(raw) as WhoopSummary) : null;
  } catch {
    return null;
  }
}
export async function disconnectWhoop() {
  await whoopCall("disconnect");
  await secretSet(WHOOP_CACHE, null);
}
export async function forgetWhoopOnThisPhone() {
  await secretSet(WHOOP_CACHE, null);
}
