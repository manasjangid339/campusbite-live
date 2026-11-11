import { NextResponse } from "next/server";
import { z } from "zod";
import { formatSlot, oneRelation } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["preparing", "ready", "collected"]),
});

const previousStatus: Record<z.infer<typeof updateStatusSchema>["status"], string> = {
  preparing: "placed",
  ready: "preparing",
  collected: "ready",
};

export async function GET() {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("id, total, status, created_at, wallets(name), pickup_slots(slot_time), order_items(quantity, price, menu_items(name))")
    .in("status", ["placed", "preparing", "ready"])
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[GET /api/kitchen]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = data.map((order) => {
    const slot = oneRelation(order.pickup_slots);
    return {
      id: order.id,
      total: order.total,
      status: order.status,
      student_name: oneRelation(order.wallets)?.name ?? "Unknown student",
      pickup_time: slot ? formatSlot(slot.slot_time) : "Unknown",
      items: order.order_items.map((item) => ({
        name: oneRelation(item.menu_items)?.name ?? "Unknown item",
        quantity: item.quantity,
      })),
    };
  });
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order status update", details: parsed.error.issues }, { status: 400 });
  }

  const { order_id, status } = parsed.data;
  const expectedStatus = previousStatus[status];
  const supabase = getSupabase();
  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", order_id)
    .maybeSingle();
  if (readError) {
    console.error("[POST /api/kitchen] read order", readError.message);
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (current.status !== expectedStatus) {
    return NextResponse.json(
      { error: `Order must be ${expectedStatus} before it can move to ${status}.` },
      { status: 409 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", order_id)
    .eq("status", expectedStatus)
    .select("id, status")
    .maybeSingle();
  if (updateError) {
    console.error("[POST /api/kitchen] update order", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) return NextResponse.json({ error: "The order status changed; refresh and try again." }, { status: 409 });
  return NextResponse.json({ order: updated });
}
