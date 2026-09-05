// ============================================================================
//  LAMECVS — live hotel price function
//  ----------------------------------------------------------------------------
//  What it does, in plain terms:
//   1. Your website asks: "what does <hotel> cost for <dates>, <guests>?"
//   2. This function asks LiteAPI for a LIVE rate.
//   3. If LiteAPI has one  -> returns the live price,   tagged "live".
//   4. If LiteAPI does NOT -> returns YOUR seasonal estimate from the database,
//                             tagged "estimate".  (So a price ALWAYS comes back.)
//
//  Your secret LiteAPI key lives ONLY here, on the server. It is never sent to
//  the browser, so it can't be stolen.
//
//  You do not need to understand the code to use it. The deploy guide walks you
//  through the few clicks. The only line you touch is your key, set as an
//  environment variable named LITEAPI_KEY (the guide shows you where).
// ============================================================================

const estimates = require('../data/estimates.json');

// ---- helper: which season is a given month in? (matches your spreadsheet) ----
function seasonForMonth(month) {          // month = 1..12
  const m = estimates.seasonMonths;
  for (const season of ['Low', 'Shoulder', 'High', 'Peak']) {
    if (m[season].includes(month)) return season;
  }
  return 'Shoulder';
}

// ---- helper: your database estimate for a hotel on a date ----
// floor x region-season multiplier — exactly the logic in your Seasonal Grid.
function databaseEstimate(hotelName, checkIn) {
  const hotel = estimates.hotels.find(
    h => h.name.toLowerCase() === String(hotelName).toLowerCase()
  );
  if (!hotel || typeof hotel.floor !== 'number') return null;

  const month = new Date(checkIn).getMonth() + 1;         // 1..12
  const season = seasonForMonth(month);
  const curve = estimates.seasonModel[hotel.region] || estimates.seasonModel['Other'];
  const idx = { Low: 0, Shoulder: 1, High: 2, Peak: 3 }[season];
  const multiplier = curve ? curve[idx] : 1;

  const nightly = Math.round((hotel.floor * multiplier) / 5) * 5;   // round to $5
  return {
    price: nightly,
    currency: 'USD',
    season,
    source: 'estimate',
    note: hotel.status === 'VERIFIED'
      ? 'Estimated from a verified floor rate; confirm exact dates.'
      : 'Indicative estimate; confirmed on request.'
  };
}

// ---- helper: try to get a LIVE rate from LiteAPI ----
// Returns a number (nightly, USD) or null if none found.
async function liteApiRate(hotelName, checkIn, checkOut, guests) {
  const KEY = process.env.LITEAPI_KEY;
  if (!KEY) return null;                       // no key set yet -> skip, use estimate
  const BASE = 'https://api.liteapi.travel/v3.0';

  try {
    // 1) find the hotel's LiteAPI id by name (best-effort text match).
    //    LiteAPI needs its own id; it does not know your hotel names.
    const searchRes = await fetch(
      `${BASE}/data/hotels?countryCode=PT&limit=200`,
      { headers: { 'X-API-Key': KEY, accept: 'application/json' } }
    );
    if (!searchRes.ok) return null;
    const searchJson = await searchRes.json();
    const list = (searchJson && searchJson.data) || [];
    const want = String(hotelName).toLowerCase();
    const match = list.find(h =>
      (h.name || '').toLowerCase().includes(want.split(' ')[0]) &&
      want.split(' ').slice(0, 2).every(w => (h.name || '').toLowerCase().includes(w))
    );
    if (!match) return null;                    // not in LiteAPI's inventory

    // 2) ask for live rates for that hotel + dates.
    const rateRes = await fetch(`${BASE}/hotels/rates`, {
      method: 'POST',
      headers: { 'X-API-Key': KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        hotelIds: [match.id],
        checkin: checkIn,
        checkout: checkOut,
        occupancies: [{ adults: Number(guests) || 2 }],
        currency: 'USD',
        guestNationality: 'US'
      })
    });
    if (!rateRes.ok) return null;
    const rateJson = await rateRes.json();

    // 3) dig out the nightly price from the response.
    const offer = rateJson?.data?.[0]?.roomTypes?.[0]?.rates?.[0];
    const total = offer?.retailRate?.total?.[0]?.amount;
    if (!total) return null;
    const nights = Math.max(
      1,
      Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
    );
    return Math.round(total / nights);
  } catch (e) {
    return null;                                // any hiccup -> fall back to estimate
  }
}

// ============================================================================
//  The function the browser calls.
//  Request:  /api/price?hotel=Six%20Senses%20Douro%20Valley&checkIn=2026-09-12&checkOut=2026-09-15&guests=2
//  Reply  :  { hotel, price, currency, source:"live"|"estimate", ... }
// ============================================================================
module.exports = async (req, res) => {
  // allow your website to call this from the browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { hotel, checkIn, checkOut, guests } = req.query;
  if (!hotel || !checkIn || !checkOut) {
    res.status(400).json({ error: 'Please provide hotel, checkIn and checkOut.' });
    return;
  }

  // 1) try live
  const live = await liteApiRate(hotel, checkIn, checkOut, guests);
  if (live) {
    res.status(200).json({
      hotel, price: live, currency: 'USD', source: 'live',
      note: 'Live rate from our booking network.'
    });
    return;
  }

  // 2) fall back to YOUR database estimate
  const est = databaseEstimate(hotel, checkIn);
  if (est) {
    res.status(200).json({ hotel, ...est });
    return;
  }

  // 3) truly unknown hotel
  res.status(200).json({
    hotel, price: null, currency: 'USD', source: 'unknown',
    note: 'On request — we confirm this one by hand.'
  });
};
