import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { CURRENT_STUDENT_ID, formatSlot, oneRelation } from "../campusbite";

const getMenu = defineTool({
  name: "getMenu",
  description: "Use this when the student asks about available food, prices, dietary options or menu items.",
  schema: z.object({
    category: z.enum(["meal", "snack", "drink", "sweet"]).optional().describe("Optional menu category"),
    veg_only: z.boolean().optional().describe("Only return vegetarian items when true"),
    max_price: z.number().int().positive().optional().describe("Maximum price in whole rupees"),
  }),
  run: async ({ category, veg_only, max_price }) => {
    let query = getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .gt("stock", 0)
      .order("category")
      .order("price");
    if (category) query = query.eq("category", category);
    if (veg_only) query = query.eq("is_veg", true);
    if (max_price !== undefined) query = query.lte("price", max_price);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data.length, items: data };
  },
});

const getWalletBalance = defineTool({
  name: "getWalletBalance",
  description: "Use this when the student asks about their wallet or before deciding what they can afford.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
});

const getPickupSlots = defineTool({
  name: "getPickupSlots",
  description: "Use this when the student needs today's available canteen pickup times.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("pickup_slots")
      .select("id, slot_time, capacity, booked")
      .order("slot_time");
    if (error) throw new Error(error.message);
    const slots = data
      .map((slot) => ({ slot_id: slot.id, time: formatSlot(slot.slot_time), free: slot.capacity - slot.booked }))
      .filter((slot) => slot.free > 0);
    return { slots };
  },
});

const getMyOrders = defineTool({
  name: "getMyOrders",
  description: "Use this when the student asks about their recent orders or wants to cancel an order.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("orders")
      .select("id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, price, menu_items(name))")
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return {
      orders: data.map((order) => {
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
      }),
    };
  },
});

const placeOrder = defineTool({
  name: "placeOrder",
  description: "Use this when the student confirms the items and pickup time for a new order.",
  writes: true,
  schema: z.object({
    items: z.array(
      z.object({
        menu_item_id: z.number().int().positive().describe("Menu item id"),
        quantity: z.number().int().min(1).max(5).describe("Quantity from 1 to 5"),
      })
    ).min(1).max(5).describe("Items to order; maximum five total items"),
    slot_id: z.number().int().positive().describe("Id of an available pickup slot"),
  }),
  run: async ({ items, slot_id }) => {
    if (items.reduce((total, item) => total + item.quantity, 0) > 5) {
      throw new Error("Maximum 5 items per order.");
    }
    const { data, error } = await getSupabase().rpc("place_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_slot_id: slot_id,
      p_items: items,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

const cancelOrder = defineTool({
  name: "cancelOrder",
  description: "Use this when the student wants to cancel one of their orders; find its id with getMyOrders first.",
  writes: true,
  schema: z.object({
    order_id: z.number().int().positive().describe("The student's order id"),
  }),
  run: async ({ order_id }) => {
    const { data, error } = await getSupabase().rpc("cancel_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_order_id: order_id,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const tools: AgentTool[] = [
  getMenu,
  getWalletBalance,
  getPickupSlots,
  getMyOrders,
  placeOrder,
  cancelOrder,
];
