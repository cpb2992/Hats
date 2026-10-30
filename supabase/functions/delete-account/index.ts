// Deletes the signed-in person's Hats account and everything stored for it on the server:
// the synced copy of their Hats, WHOOP tokens and their family membership. Required by Google
// Play for apps that let people make an account. Called from Settings → Account and sync.
//
// A family someone started isn't deleted out from under the others: if anyone else is in it,
// it's handed to them first. Shared items stay for the family; only the "changed by" mark on
// this person's edits is cleared (on delete set null).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return json({ error: "Sign in again, then try deleting your account." }, 401);
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") return json({ error: "Missing confirmation." }, 400);

  // Hand any family this person started to someone still in it.
  const { data: started } = await admin.from("households").select("id").eq("created_by", user.id);
  for (const h of started ?? []) {
    const { data: others } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", h.id)
      .neq("user_id", user.id)
      .limit(1);
    if (others?.length) {
      const { error } = await admin.from("households").update({ created_by: others[0].user_id }).eq("id", h.id);
      if (error) return json({ error: "Could not hand your family to another member. Nothing was deleted." }, 500);
    }
  }

  // Everything else keyed to the account (synced Hats, WHOOP tokens, memberships) goes with it
  // (on delete cascade). Families nobody else is in go too.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "Could not delete the account. Try again in a minute." }, 500);
  return json({ deleted: true });
});
