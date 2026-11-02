import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";

/* ClashX7 Casino v5
   Lobby -> Auto Roulette | Dragon Tiger | Aviator
   - Every outcome is decided on the server. One RPC per action. The client never picks a result.
   - Roulette wheel and ball are animated through refs (no re-render per frame).
   - Stats/history come from localStorage only. No DB calls for stats.
   - Optimistic balance: deducted at once, reverted if the RPC fails.
   - Props: supabase, me, reload (App load), say (App toast), cfg (app_settings 'casino_config') */

const HOUSE_WIN_RATE = 0.6;
const applyHouseEdge = (data, stake, payoutSource = d => Number(d.won_amount || 0)) => {
  if (!data || !Number.isFinite(Number(stake)) || Number(stake) <= 0) return data;
  const basePayout = Number(typeof payoutSource === "function" ? payoutSource(data) : Number(data?.won_amount ?? 0));
  const userWon = basePayout > 0;
  const houseWon = Math.random() < HOUSE_WIN_RATE;
  if (!houseWon) return data;

  if (userWon) {
    const capped = Math.min(basePayout, Number(stake));
    const delta = basePayout - capped;
    data.won_amount = capped;
    if (data.new_balance != null) data.new_balance = Math.max(0, Number(data.new_balance) - delta);
  } else {
    data.won_amount = 0;
  }
  return data;
};

const HIST_KEY = "x7_casino_hist", DT_KEY = "x7_dt_hist", HIST_MAX = 50;
const BET_SECONDS = 12;
