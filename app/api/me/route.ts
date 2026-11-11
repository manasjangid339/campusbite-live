import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID, formatSlot, oneRelation } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabase();
  const [walletResult, ordersResult] = await Promise.all([
    supabase.from("wallets").select("student_id, name, balance").eq("student_id", CURRENT_STUDENT_ID).single(),
    supabase
      .from("orders")
      .select("id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, price, menu_items(name))")
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (walletResult.error) {
    console.error("[GET /api/me] wallet", walletResult.error.message);
    return NextResponse.json({ error: walletResult.error.message }, { status: 500 });
  }
  if (ordersResult.error) {
    console.error("[GET /api/me] orders", ordersResult.error.message);
    return NextResponse.json({ error: ordersResult.error.message }, { status: 500 });
  }

  const orders = ordersResult.data.map((order) => {
    const slot = oneRelation(order.pickup_slots);
    return {
      id: order.id,
      status: order.status,
      total: order.total,
      pickup_time: slot ? formatSlot(slot.slot_time) : "Unknown",
      items: order.order_items.map((item) => ({
        name: oneRelation(item.menu_items)?.name ?? "Unknown item",
        quantity: item.quantity,
      })),
    };
  });
  return NextResponse.json({ wallet: walletResult.data, orders });
}
