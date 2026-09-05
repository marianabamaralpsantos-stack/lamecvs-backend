# LAMECVS — Live Price Backend · Step-by-Step Guide

This turns your database into **live hotel prices**. When someone picks dates,
it returns a **live rate** if the network has one, otherwise **your own database
estimate** — so a price always appears, clearly labelled which is which.

You do **not** need to code. This is clicks and copy-paste. It's free.
Do it slowly; each step is small. I'll help you through any step that snags.

---

## What you have in this folder

```
lamecvs-backend/
├── api/price.js          ← the function (the "brain"). You don't edit this.
├── data/estimates.json   ← your hotels + seasonal model (for the fallback).
├── public/index.html     ← a test page to see it working.
├── vercel.json           ← settings. Don't edit.
└── DEPLOY-GUIDE.md        ← this file.
```

---

## PART 1 — Get your free LiteAPI key (5 minutes)

1. Go to **https://www.liteapi.travel**
2. Click **Sign up** (top right). Use your email. It's free, no card needed.
3. Once in the dashboard, look for **API Keys** (or "Sandbox").
4. Copy the **Sandbox key** (a long string of letters/numbers).
   Keep it somewhere safe for a moment — you'll paste it in Part 3.

> The **sandbox** key uses TEST data — perfect for setting up without risk or cost.
> Later you swap it for the live key the same way. Nothing changes but the key.

---

## PART 2 — Put the folder online with Vercel (10 minutes)

Vercel hosts the function for free. Two ways — pick the easier for you.

### Option A — Drag and drop (simplest, no tools)

1. Go to **https://vercel.com** → **Sign up** (choose "Continue with email" or GitHub).
2. On your dashboard, click **Add New… → Project**.
3. Choose **Deploy** / look for an **"Import Third-Party" or "Deploy from template"**
   option. If Vercel only offers GitHub import, use **Option B** below — it's still easy.
4. If a drag-and-drop / CLI upload is offered, upload **this whole
   `lamecvs-backend` folder**.
5. Vercel builds it and gives you a web address like
   `https://lamecvs-backend-xxxx.vercel.app`. Copy it.

### Option B — Through GitHub (most reliable, ~5 extra minutes)

1. Go to **https://github.com** → sign up (free).
2. Click **New repository** → name it `lamecvs-backend` → **Create**.
3. On the new repo page, click **"uploading an existing file"**.
4. Drag in **everything inside this folder** (the `api`, `data`, `public`
   folders and the files). Click **Commit changes**.
5. Go to **https://vercel.com** → **Add New… → Project** →
   **Import** your `lamecvs-backend` GitHub repo → **Deploy**.
6. Vercel gives you a web address. Copy it.

---

## PART 3 — Add your key (2 minutes)

Your key must be stored as a **secret setting**, never in the code.

1. In Vercel, open your project → **Settings** → **Environment Variables**.
2. Add a new one:
   - **Name:** `LITEAPI_KEY`
   - **Value:** *(paste your sandbox key from Part 1)*
3. Click **Save**.
4. Go to the **Deployments** tab → click the "…" on the latest → **Redeploy**
   (so it picks up the key).

---

## PART 4 — See it work (1 minute)

1. Open your Vercel web address in a browser (e.g. the `.vercel.app` link).
   You'll see the **price test page**.
2. Type a hotel (start typing — it suggests from your database), pick dates,
   click **Get price**.
3. You'll see either:
   - **$X / night · live** (green) — a real rate from the network, or
   - **$X / night · estimate** (amber) — your database's seasonal estimate.

Try **Six Senses Douro Valley** on `2026-09-12` (September) then `2026-01-12`
(January) — you'll see the estimate change with the season, exactly like your
spreadsheet. That proves the fallback is using your real numbers.

---

## What "live" vs "estimate" means for you

- **Live (green):** a real, current rate. Mostly the mainstream 5-stars
  (Four Seasons, Yeatman, Conrad, etc.).
- **Estimate (amber):** your own seasonal calculation, for the independents the
  network doesn't carry (Vila Joya, São Lourenço, the quintas). Still a good,
  honest number — and clearly labelled so you confirm it by hand before quoting.

This is the hybrid we planned: **live where possible, your estimate everywhere
else, never a blank.**

---

## PART 5 — Later: connect it to your planner

Once the test page works, wiring it into your real itinerary is one small change:
where the planner currently shows a modelled price, it instead calls
`https://YOUR-VERCEL-ADDRESS/api/price?hotel=...&checkIn=...&checkOut=...&guests=...`
and shows what comes back. I'll do that with you when you're ready — it's a
15-minute job once this part is live.

---

## Costs (honest)

- LiteAPI: **free** to query rates. (They earn on bookings, not on your lookups.)
- Vercel: **free tier** covers your volume easily.
- So: **~$0/month** to run this for showing prices.

---

## If something doesn't work

- **Test page loads but every price says "estimate":** that's fine and expected
  until your key is added and the hotel is in LiteAPI's inventory. The fallback
  is doing its job.
- **"Could not reach the function":** the deploy didn't finish, or the address is
  wrong. Re-check Part 2.
- **Prices all "On request":** the hotel name doesn't match your database exactly.
  Use the suggestions in the test page.
- **Anything else:** tell me what you see on screen and I'll walk you through it.

You've got this. Small steps.
