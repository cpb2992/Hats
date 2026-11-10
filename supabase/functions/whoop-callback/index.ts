// WHOOP redirects here after you approve Hats. It has no Hats sign-in of its own, so it
// trusts only a one-time 8-character state created by the signed-in `whoop` function in
// the last 15 minutes. It exchanges the code with the server-held secret, stores tokens
// server-side, and sends the browser back into the app.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const WHOOP = "https://api.prod.whoop.com";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const back = (params: Record<string, string>) =>
  new Response(null, {
    status: 302,
    headers: {
      Location: `hats://auth-callback?${new URLSearchParams({ whoop: "1", ...params })}`,
      "Cache-Control": "no-store",
    },
  });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (url.searchParams.get("error"))
    return back({ error_description: "WHOOP access was not allowed." });
  if (!/^[A-Za-z0-9]{8}$/.test(state) || !code)
    return back({ error_description: "That WHOOP sign-in link is incomplete." });

  // One-time use: delete the state as we read it.
  const { data: row } = await admin
    .from("whoop_oauth_states")
    .delete()
    .eq("state", state)
    .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
    .select("user_id")
    .maybeSingle();
  if (!row)
    return back({ error_description: "That WHOOP sign-in expired. Start again from Hats." });

  const id = Deno.env.get("WHOOP_CLIENT_ID");
  const secret = Deno.env.get("WHOOP_CLIENT_SECRET");
  if (!id || !secret)
    return back({ error_description: "WHOOP isn't set up on your server yet." });

  const res = await fetch(`${WHOOP}/oauth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/whoop-callback`,
    }),
  });
  if (!res.ok)
    return back({ error_description: "WHOOP didn't accept the sign-in. Try connecting again." });
  const t = await res.json();
  const { error } = await admin.from("whoop_tokens").upsert({
    user_id: row.user_id,
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? null,
    expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
    scope: t.scope ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return back({ error_description: "Could not save the WHOOP connection." });
  return back({ status: "connected" });
});
