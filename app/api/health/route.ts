import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/health
 * Shows which settings are missing (never their values), which Supabase project
 * the app is connected to, and whether the CampusBite tables can be read.
 */
export async function GET() {
  // GEMINI_MODEL is optional (it has a default), so it is not checked here.
  const names = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "APP_PASSCODE"];
  const settings = Object.fromEntries(names.map((n) => [n, Boolean(process.env[n]?.trim())]));

  // The project id is the first part of the Supabase URL. It is not a secret.
  let supabaseProject: string | null = null;
  try {
    supabaseProject = new URL(process.env.SUPABASE_URL ?? "").hostname.split(".")[0] || null;
  } catch {
    supabaseProject = "SUPABASE_URL is not a valid URL";
  }

  let databaseCheck = "skipped (Supabase settings missing)";
  if (settings.SUPABASE_URL && settings.SUPABASE_SECRET_KEY) {
    const tables = ["menu_items", "wallets", "pickup_slots", "orders", "order_items"] as const;
    const checks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await getSupabase().from(table).select("*").limit(0);
        return { table, error };
      })
    );
    const failures = checks.filter((check) => check.error);
    if (failures.length > 0) {
      failures.forEach(({ table, error }) => console.error(`[GET /api/health] ${table}`, error?.message));
      databaseCheck = `failed: ${failures.map(({ table, error }) => `${table} (${error?.message})`).join(", ")}`;
    } else {
      const supabase = getSupabase();
      const [menu, wallet, slot] = await Promise.all([
        supabase.from("menu_items").select("id").limit(1).maybeSingle(),
        supabase.from("wallets").select("student_id").eq("student_id", CURRENT_STUDENT_ID).maybeSingle(),
        supabase.from("pickup_slots").select("id").limit(1).maybeSingle(),
      ]);
      const queryErrors = [
        { table: "menu_items", error: menu.error },
        { table: "wallets", error: wallet.error },
        { table: "pickup_slots", error: slot.error },
      ].flatMap(({ table, error }) => (error ? [{ table, error }] : []));
      if (queryErrors.length > 0) {
        queryErrors.forEach(({ table, error }) => console.error(`[GET /api/health] ${table}`, error.message));
        databaseCheck = `failed: ${queryErrors.map(({ table, error }) => `${table} (${error.message})`).join(", ")}`;
      } else {
        const missingData = [
          !menu.data && "menu_items",
          !wallet.data && `wallets/${CURRENT_STUDENT_ID}`,
          !slot.data && "pickup_slots",
        ].filter(Boolean);
        databaseCheck =
          missingData.length > 0
            ? `failed: seed data missing (${missingData.join(", ")})`
            : "ok (CampusBite tables and seed data found)";
      }
    }
  }

  return NextResponse.json({
    ok: Object.values(settings).every(Boolean) && databaseCheck.startsWith("ok"),
    settings,
    supabaseProject,
    databaseCheck,
  });
}
