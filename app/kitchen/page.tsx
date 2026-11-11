"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type KitchenOrder = {
  id: number;
  total: number;
  status: "placed" | "preparing" | "ready";
  student_name: string;
  pickup_time: string;
  items: { name: string; quantity: number }[];
};

type MenuStockItem = {
  id: number;
  name: string;
  category: string;
  stock: number;
};

const columns: { status: KitchenOrder["status"]; title: string; action?: string }[] = [
  { status: "placed", title: "New orders", action: "Start preparing" },
  { status: "preparing", title: "Preparing", action: "Mark ready" },
  { status: "ready", title: "Ready for pickup", action: "Collected" },
];

const nextStatus: Record<KitchenOrder["status"], "preparing" | "ready" | "collected"> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [menuItems, setMenuItems] = useState<MenuStockItem[]>([]);
  const [error, setError] = useState("");
  const [busyOrder, setBusyOrder] = useState<number | null>(null);
  const [busyStockId, setBusyStockId] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const [ordersRes, menuRes] = await Promise.all([
        fetch("/api/kitchen", { cache: "no-store" }),
        fetch("/api/menu", { cache: "no-store" }),
      ]);
      const [ordersData, menuData] = await Promise.all([ordersRes.json(), menuRes.json()]);
      if (!ordersRes.ok) throw new Error(ordersData.error ?? "Could not load kitchen orders");
      if (!menuRes.ok) throw new Error(menuData.error ?? "Could not load menu stock");
      setOrders(ordersData.orders);
      setMenuItems(menuData.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load kitchen orders");
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 3000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  async function advanceOrder(order: KitchenOrder) {
    setBusyOrder(order.id);
    setError("");
    try {
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status: nextStatus[order.status] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update order");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setBusyOrder(null);
    }
  }

  async function markSoldOut(menuItemId: number) {
    setBusyStockId(menuItemId);
    setError("");
    try {
      const response = await fetch("/api/kitchen/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_item_id: menuItemId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update stock");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update stock");
    } finally {
      setBusyStockId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-400">CampusBite · SRM</p>
          <h1 className="mt-1 text-3xl font-bold">Kitchen board</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 rounded-full bg-emerald-950 px-3 py-1 text-sm text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live
          </span>
          <Link href="/" className="py-1.5 text-sm text-slate-300 hover:text-white">Student screen</Link>
        </div>
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status);
          return (
            <section key={column.status} className="rounded-xl bg-slate-900 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">{column.title}</h2>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {columnOrders.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnOrders.map((order) => (
                  <article key={order.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">Order #{order.id}</h3>
                        <p className="mt-1 truncate text-sm text-slate-400">{order.student_name}</p>
                      </div>
                      <span className="shrink-0 rounded bg-slate-800 px-2 py-1 text-sm">{order.pickup_time}</span>
                    </div>
                    <ul className="my-4 space-y-1 text-sm text-slate-300">
                      {order.items.map((item, index) => (
                        <li key={`${item.name}-${index}`}>{item.quantity} × {item.name}</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                      <span className="text-sm font-medium">Rs {order.total}</span>
                      {column.action && (
                        <button
                          onClick={() => void advanceOrder(order)}
                          disabled={busyOrder === order.id}
                          className="min-h-[40px] rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                        >
                          {busyOrder === order.id ? "Updating..." : column.action}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {columnOrders.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No orders</p>}
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-8 rounded-xl bg-slate-900 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Menu stock</h2>
          <span className="text-xs text-slate-400">{menuItems.length} items</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className={`text-xs ${item.stock === 0 ? "text-rose-400" : "text-slate-400"}`}>
                  {item.stock === 0 ? "Sold out" : `${item.stock} in stock`}
                </p>
              </div>
              <button
                onClick={() => void markSoldOut(item.id)}
                disabled={item.stock === 0 || busyStockId === item.id}
                className="min-h-[38px] shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40"
              >
                {item.stock === 0 ? "Sold out" : busyStockId === item.id ? "Updating..." : "Mark sold out"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
