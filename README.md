# CampusBite Live

An SRM campus canteen ordering agent. Students can browse live menu and wallet data, place or cancel orders in chat, and follow order progress on the kitchen screen.

- Prompts, step by step: `live-demo/LIVE_BUILD_PROMPTS.md`
- Demo script: `live-demo/DEMO_SCRIPT.md`
- Database: run `seed/campusbite.sql` in Supabase
- AI rules: `.github/copilot-instructions.md` (Copilot) and `CLAUDE.md` (Claude Code)

---

**Stack:** Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase PostgreSQL · Google Gemini API (function calling) · Zod · Vercel

## Features

- Passcode-protected student and kitchen screens
- Gemini ordering assistant with menu, wallet, pickup-slot, order, cancellation and order-placement tools
- Database functions enforce stock, wallet, pickup capacity and cancellation rules
- Live menu, wallet and order status updates
- Kitchen board for moving orders through placed, preparing, ready and collected

## Setup

1. **Install.** Run `npm install`. You need Node.js 20 or later.
2. **Create the database.** Create a project on [supabase.com](https://supabase.com) and run `seed/campusbite.sql` in **SQL Editor**. This script resets the CampusBite tables and demo data when run again.
3. **Get the keys.**
   - Supabase **Project Settings**: copy the Project URL and the secret (service_role) key
   - [Google AI Studio](https://aistudio.google.com): click **Get API key**
4. **Configure `.env.local`.** Copy `.env.example` to `.env.local` and set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY` and a private `APP_PASSCODE`.
5. **Run it.** Run `npm run dev`, check `/api/health`, then open http://localhost:3000, enter your passcode and try a sample prompt. The kitchen screen is at `/kitchen`.
6. **Deploy.** On [vercel.com](https://vercel.com), import the repo, add the same environment variables, and deploy.

`/api/health` reports which settings are configured without revealing their values and verifies the CampusBite tables and required seed data.

## Folder guide

```
app/
  page.tsx               Student screen: chat, wallet and menu
  kitchen/page.tsx       Live kitchen order board
  login/page.tsx         Passcode page
  api/agent/route.ts     POST /api/agent: runs the agent
  api/menu/route.ts      GET /api/menu
  api/me/route.ts        GET /api/me: wallet and recent orders
  api/kitchen/route.ts   GET/POST /api/kitchen
  api/health/route.ts    Checks settings and database tables
components/
  AgentChat.tsx          Chat UI that shows tool calls
  MenuPanel.tsx          Live menu and stock
  WalletOrders.tsx       Wallet balance and recent orders
lib/
  agent/tools.ts         CampusBite agent tools
  agent/systemPrompt.ts  Instructions for Gemini
  agent/runAgent.ts      The agent loop (max 8 rounds)
  agent/defineTool.ts    Turns Zod schemas into Gemini tool declarations
  supabase.ts            Server-only Supabase client
  campusbite.ts          Student id and pickup-time helpers
proxy.ts                 Passcode gate for every page and API
seed/campusbite.sql      CampusBite tables, rules and demo data
```

## Rules to remember

- Never commit `.env.local`. It is already in `.gitignore`.
- Never use `SUPABASE_SECRET_KEY` in frontend code. Only files under `lib/` and `app/api/` may use it.
- Placing or cancelling orders must use the `place_order` and `cancel_order` database functions. Do not update wallets or stock directly from TypeScript.
- The demo student is `S001`; do not accept a student id from the browser or agent.
- Before you push, run `npm run build`. If it fails on your laptop, it will fail on Vercel too.

The seed data uses fictional names and can be re-run to reset menu stock, wallets, slots and orders.

## How the agent works

1. Gemini receives the student's chat history, system prompt, and the list of declared agent tools.
2. When Gemini requests a tool call, our server validates the arguments with Zod and executes the tool against Supabase.
3. The tool result (or error) is sent back to Gemini in a loop until Gemini returns a final reply, capped at 8 rounds.
