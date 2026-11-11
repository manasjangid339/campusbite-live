"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: "meal" | "snack" | "drink" | "sweet";
  price: number;
  is_veg: boolean;
  stock: number;
  description: string;
};

const categories: { id: MenuItem["category"]; label: string }[] = [
  { id: "meal", label: "Meals" },
  { id: "snack", label: "Snacks" },
  { id: "sweet", label: "Sweets" },
  { id: "drink", label: "Drinks" },
];

export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/menu", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load the menu");
        if (active) {
          setItems(data.items);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load the menu");
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
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Today&apos;s menu</h2>
        <p className="text-xs text-slate-500">Live stock · vegetarian and non-vegetarian options</p>
      </div>
      <div className="space-y-4 p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && items.length === 0 && <p className="text-sm text-slate-500">Loading menu...</p>}
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category.id);
          if (categoryItems.length === 0) return null;
          return (
            <div key={category.id}>
              <h3 className="mb-1 text-sm font-semibold text-slate-700">{category.label}</h3>
              <ul className="divide-y divide-slate-100">
                {categoryItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <span
                          aria-label={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.is_veg ? "bg-emerald-600" : "bg-red-600"}`}
                        />
                        <span className="truncate">{item.name}</span>
                      </p>
                      {item.stock === 0 ? (
                        <p className="ml-[18px] text-xs font-medium text-red-600">Sold out</p>
                      ) : item.stock <= 3 ? (
                        <p className="ml-[18px] text-xs font-medium text-amber-700">Only {item.stock} left</p>
                      ) : (
                        <p className="ml-[18px] truncate text-xs text-slate-500">{item.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">Rs {item.price}</p>
                      {item.stock === 0 && <span className="sr-only">Sold out</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
