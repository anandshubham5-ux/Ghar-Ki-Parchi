// Ghar Ki Parchi: get an email ready for code login.
// Creates the account already confirmed (or confirms an existing one), so
// Supabase then sends the 6-digit code email instead of a "Confirm signup"
// link. It reveals nothing about whether an account existed.
// Deployed with verify_jwt = false (the website calls it before login).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  let email = "";
  try { email = String((await req.json())?.email ?? "").trim().toLowerCase(); } catch { return json({ error: "Bad request" }, 400); }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // New email: create it already confirmed.
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (!error) return json({ ok: true });

  // Existing email (or anything unexpected): make sure it is confirmed.
  const exists = (error as { code?: string }).code === "email_exists" || /already|registered|exists/i.test(error.message);
  if (!exists) console.warn("createUser:", error.message);
  const { error: e2 } = await admin.rpc("confirm_email", { p_email: email });
  if (e2) { console.error("confirm_email:", e2.message); return json({ error: "Could not prepare login" }, 500); }
  return json({ ok: true });
});
