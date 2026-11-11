"use client";

import { useEffect, useState } from "react";

type Order = {
  id: number;
  status: string;
  total: number;
  pickup_time: string;
  items: { name: string; quantity: number }[];
};

type WalletOrdersResponse = {
  wallet: { name: string; balance: number };
  orders: Order[];
};

const statusStyles: Record<string, string> = {
  placed: "bg-sky-100 text-sky-800",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  collected: "bg-slate-100 text-slate-600",
  cancelled: "bg-rose-100 text-rose-700",
};

export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<WalletOrdersResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load wallet and orders");
        if (active) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load wallet and orders");
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bg-slate-900 p-4 text-white">
        <p className="text-sm text-slate-300">Student wallet</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="font-semibold">{data?.wallet.name ?? "Loading wallet..."}</h2>
          {data && <p className="text-xl font-semibold">Rs {data.wallet.balance}</p>}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold">My orders today</h3>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {!error && data?.orders.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No orders yet.</p>
        )}
        <ul className="mt-2 divide-y divide-slate-100">
          {data?.orders.map((order) => (
            <li key={order.id} className="py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Order #{order.id} · {order.pickup_time}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[order.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {order.status}
                </span>
              </div>
              <p className="mt-1 text-slate-600">
                {order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Total: Rs {order.total}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
