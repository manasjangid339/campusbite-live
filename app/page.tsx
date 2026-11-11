"use client";

import { useState } from "react";
import Link from "next/link";
import AgentChat from "@/components/AgentChat";
import MenuPanel from "@/components/MenuPanel";
import WalletOrders from "@/components/WalletOrders";

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold sm:text-xl">CampusBite · SRM canteen ordering agent</h1>
          <p className="text-sm text-slate-500">Your canteen orders, made simple.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/kitchen" className="py-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900">
            Open kitchen screen
          </Link>
          <button onClick={logout} className="py-1.5 text-sm text-slate-500 hover:text-slate-900">
            Log out
          </button>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-5">
        <section className="md:col-span-3">
          <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
        </section>
        <section className="space-y-4 md:col-span-2">
          <WalletOrders refreshKey={refreshKey} />
          <MenuPanel refreshKey={refreshKey} />
        </section>
      </div>
    </main>
  );
}
