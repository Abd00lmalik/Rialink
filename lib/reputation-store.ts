/**
 * Reputation store for cross-app signals.
 * Stores reputation signals from Rialo dApps in Redis.
 */

import { Redis } from "@upstash/redis";

const SIGNAL_PREFIX = "rep:signals:";
const AGGREGATE_PREFIX = "rep:agg:";
const SIGNAL_TTL_DAYS = 90;

export interface ReputationSignal {
  id: string;
  wallet: string;
  source: string;          // dApp identifier (e.g. "rialo-dex", "rialo-lending")
  signal: string;          // e.g. "trader_active", "lender_reliable", "dao_contributor"
  value: number;           // -1 to 1 (negative = bad rep, positive = good rep)
  metadata?: Record<string, unknown>;
  submittedAt: string;
  expiresAt: string;
}

export interface ReputationAggregate {
  wallet: string;
  score: number;           // -100 to 100
  totalSignals: number;
  activeSources: string[];
  topSignals: Array<{ signal: string; count: number; avgValue: number }>;
  lastUpdated: string;
}

function getRedis() {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

function signalsKey(wallet: string) {
  return `${SIGNAL_PREFIX}${wallet}`;
}

function aggregateKey(wallet: string) {
  return `${AGGREGATE_PREFIX}${wallet}`;
}

/**
 * Submit a reputation signal for a wallet.
 */
export async function submitSignal(
  wallet: string,
  source: string,
  signal: string,
  value: number,
  metadata?: Record<string, unknown>
): Promise<ReputationSignal | null> {
  const redis = getRedis();
  if (!redis) return null;

  // Clamp value to [-1, 1]
  const clampedValue = Math.max(-1, Math.min(1, value));

  const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SIGNAL_TTL_DAYS * 24 * 60 * 60 * 1000);

  const signalData: ReputationSignal = {
    id,
    wallet,
    source: source.slice(0, 64),
    signal: signal.slice(0, 128),
    value: clampedValue,
    ...(metadata ? { metadata } : {}),
    submittedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  try {
    await redis.lpush(signalsKey(wallet), JSON.stringify(signalData));
    // Update aggregate
    await recomputeAggregate(wallet);
    return signalData;
  } catch {
    return null;
  }
}

/**
 * Get all active signals for a wallet.
 */
export async function getSignals(wallet: string): Promise<ReputationSignal[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const raw = await redis.lrange<string>(signalsKey(wallet), 0, -1);
    const now = Date.now();
    return raw
      .map((r) => {
        try { return JSON.parse(r) as ReputationSignal; } catch { return null; }
      })
      .filter((s): s is ReputationSignal => {
        if (!s) return false;
        return new Date(s.expiresAt).getTime() > now;
      });
  } catch {
    return [];
  }
}

/**
 * Get aggregated reputation for a wallet.
 */
export async function getAggregate(wallet: string): Promise<ReputationAggregate> {
  const redis = getRedis();
  if (!redis) return emptyAggregate(wallet);

  try {
    const cached = await redis.get<Record<string, unknown>>(aggregateKey(wallet));
    if (cached) {
      return {
        wallet: String(cached.wallet || wallet),
        score: Number(cached.score || 0),
        totalSignals: Number(cached.totalSignals || 0),
        activeSources: Array.isArray(cached.activeSources) ? cached.activeSources.map(String) : [],
        topSignals: Array.isArray(cached.topSignals) ? cached.topSignals.map((t: any) => ({
          signal: String(t.signal || ""),
          count: Number(t.count || 0),
          avgValue: Number(t.avgValue || 0),
        })) : [],
        lastUpdated: String(cached.lastUpdated || ""),
      };
    }
    // Compute fresh
    return await recomputeAggregate(wallet);
  } catch {
    return emptyAggregate(wallet);
  }
}

/**
 * Recompute aggregate from signals.
 */
async function recomputeAggregate(wallet: string): Promise<ReputationAggregate> {
  const signals = await getSignals(wallet);
  const agg = computeAggregate(wallet, signals);

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(aggregateKey(wallet), JSON.stringify(agg), { ex: 3600 });
    } catch {}
  }

  return agg;
}

/**
 * Pure computation — no Redis dependency.
 */
function computeAggregate(wallet: string, signals: ReputationSignal[]): ReputationAggregate {
  if (signals.length === 0) return emptyAggregate(wallet);

  // Score: weighted average of signal values, scaled to [-100, 100]
  let totalWeight = 0;
  let weightedSum = 0;
  for (const sig of signals) {
    const age = Date.now() - new Date(sig.submittedAt).getTime();
    const ageDays = age / (1000 * 60 * 60 * 24);
    // Weight decays over 90 days
    const weight = Math.max(0, 1 - ageDays / SIGNAL_TTL_DAYS);
    weightedSum += sig.value * weight;
    totalWeight += weight;
  }

  const score = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100)
    : 0;

  // Active sources
  const sources = [...new Set(signals.map((s) => s.source))];

  // Top signals
  const signalCounts = new Map<string, { count: number; totalValue: number }>();
  for (const sig of signals) {
    const existing = signalCounts.get(sig.signal) || { count: 0, totalValue: 0 };
    existing.count++;
    existing.totalValue += sig.value;
    signalCounts.set(sig.signal, existing);
  }

  const topSignals = [...signalCounts.entries()]
    .map(([signal, data]) => ({
      signal,
      count: data.count,
      avgValue: Math.round((data.totalValue / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    wallet,
    score: Math.max(-100, Math.min(100, score)),
    totalSignals: signals.length,
    activeSources: sources,
    topSignals,
    lastUpdated: new Date().toISOString(),
  };
}

function emptyAggregate(wallet: string): ReputationAggregate {
  return {
    wallet,
    score: 0,
    totalSignals: 0,
    activeSources: [],
    topSignals: [],
    lastUpdated: new Date().toISOString(),
  };
}
