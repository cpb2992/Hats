// Hats ↔ WHOOP, called by the signed-in app. The WHOOP client secret and tokens never
// leave this function; the app only receives a compact read-only summary.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const WHOOP = "https://api.prod.whoop.com";
const SCOPES = "read:recovery read:sleep read:cycles offline";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function callbackUrl() {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/whoop-callback`;
}
function clientConfig() {
  const id = Deno.env.get("WHOOP_CLIENT_ID");
  const secret = Deno.env.get("WHOOP_CLIENT_SECRET");
  return id && secret ? { id, secret } : null;
}
function state8() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

type Tokens = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
};

/** Returns a usable access token, refreshing once if needed. Null = reconnect required. */
async function accessToken(userId: string): Promise<string | null> {
  const cfg = clientConfig();
  const { data } = await admin
    .from("whoop_tokens")
    .select("user_id,access_token,refresh_token,expires_at")
    .eq("user_id", userId)
    .maybeSingle<Tokens>();
  if (!data || !cfg) return null;
  if (new Date(data.expires_at).getTime() - Date.now() > 120_000)
    return data.access_token;
  if (!data.refresh_token) return null;
  const res = await fetch(`${WHOOP}/oauth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: data.refresh_token,
      client_id: cfg.id,
      client_secret: cfg.secret,
      scope: "offline",
    }),
  });
  if (!res.ok) {
    // Another request may have refreshed first (WHOOP invalidates the old token).
    const { data: again } = await admin
      .from("whoop_tokens")
      .select("access_token,refresh_token,expires_at")
      .eq("user_id", userId)
      .maybeSingle<Tokens>();
    if (again && again.refresh_token !== data.refresh_token)
      return again.access_token;
    if (res.status === 400 || res.status === 401)
      await admin.from("whoop_tokens").delete().eq("user_id", userId);
    return null;
  }
  const t = await res.json();
  await admin
    .from("whoop_tokens")
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? data.refresh_token,
      expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
      scope: t.scope ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("refresh_token", data.refresh_token);
  return t.access_token as string;
}

async function whoopGet(token: string, path: string) {
  const res = await fetch(`${WHOOP}/developer${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`WHOOP ${res.status}`);
  return res.json();
}
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;

async function summary(token: string) {
  const [recovery, sleep, cycle] = await Promise.allSettled([
    whoopGet(token, "/v2/recovery?limit=7"),
    whoopGet(token, "/v2/activity/sleep?limit=7"),
    whoopGet(token, "/v2/cycle?limit=7"),
  ]);
  const records = (r: PromiseSettledResult<{ records?: unknown[] }>) =>
    r.status === "fulfilled" && Array.isArray(r.value?.records)
      ? (r.value.records as Record<string, any>[])
      : [];
  return {
    recovery: records(recovery)
      .filter((r) => r.score_state === "SCORED")
      .map((r) => ({
        at: r.created_at ?? r.updated_at ?? null,
        score: num(r.score?.recovery_score),
        hrv: num(r.score?.hrv_rmssd_milli),
        restingHr: num(r.score?.resting_heart_rate),
      })),
    sleep: records(sleep)
      .filter((s) => s.score_state === "SCORED" && !s.nap)
      .map((s) => {
        const st = s.score?.stage_summary ?? {};
        const asleep =
          (st.total_light_sleep_time_milli ?? 0) +
          (st.total_slow_wave_sleep_time_milli ?? 0) +
          (st.total_rem_sleep_time_milli ?? 0);
        return {
          start: s.start ?? null,
          end: s.end ?? null,
          performance: num(s.score?.sleep_performance_percentage),
          hoursAsleep: asleep ? num(asleep / 3_600_000) : null,
        };
      }),
    strain: records(cycle)
      .filter((c) => c.score_state === "SCORED")
      .map((c) => ({ start: c.start ?? null, strain: num(c.score?.strain) })),
    unavailable: [recovery, sleep, cycle]
      .map((r, i) => (r.status === "rejected" ? ["recovery", "sleep", "strain"][i] : null))
      .filter(Boolean),
    fetchedAt: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return json({ error: "Sign in to Hats first." }, 401);
  const { action } = await req.json().catch(() => ({ action: "" }));

  if (action === "start") {
    const cfg = clientConfig();
    if (!cfg)
      return json({ error: "WHOOP isn't set up on your server yet." }, 409);
    await admin
      .from("whoop_oauth_states")
      .delete()
      .lt("created_at", new Date(Date.now() - 15 * 60_000).toISOString());
    const state = state8();
    const { error } = await admin
      .from("whoop_oauth_states")
      .insert({ state, user_id: user.id });
    if (error) return json({ error: "Could not start WHOOP sign-in." }, 500);
    const url = `${WHOOP}/oauth/oauth2/auth?${new URLSearchParams({
      response_type: "code",
      client_id: cfg.id,
      redirect_uri: callbackUrl(),
      scope: SCOPES,
      state,
    })}`;
    return json({ url });
  }
  if (action === "status") {
    const { data } = await admin
      .from("whoop_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    return json({ connected: !!data, configured: !!clientConfig() });
  }
  if (action === "summary") {
    const token = await accessToken(user.id);
    if (!token) return json({ connected: false });
    try {
      return json({ connected: true, ...(await summary(token)) });
    } catch {
      return json({ error: "WHOOP didn't answer. Try again soon." }, 502);
    }
  }
  if (action === "disconnect") {
    const token = await accessToken(user.id).catch(() => null);
    if (token)
      await fetch(`${WHOOP}/developer/v2/user/access`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    await admin.from("whoop_tokens").delete().eq("user_id", user.id);
    return json({ connected: false });
  }
  return json({ error: "Unknown action" }, 400);
});
