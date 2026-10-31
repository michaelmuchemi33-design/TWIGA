// Pure function: dashboard figures computed from real call rows. No estimates, no fake data.
export function computeStats(calls, now = new Date(), days = 14) {
  const done = calls.filter((c) => c.status === "completed");
  const secs = done.reduce((s, c) => s + (c.duration_seconds || 0), 0);
  const byDay = {};
  for (let i = days - 1; i >= 0; i--) byDay[new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10)] = { inbound: 0, outbound: 0 };
  for (const c of calls) { const d = String(c.started_at || "").slice(0, 10); if (byDay[d]) byDay[d][c.direction === "outbound" ? "outbound" : "inbound"]++; }
  return {
    total: calls.length,
    inbound: calls.filter((c) => c.direction === "inbound").length,
    outbound: calls.filter((c) => c.direction === "outbound").length,
    answered: done.length,
    missed: calls.filter((c) => c.status === "missed").length,
    failed: calls.filter((c) => c.status === "failed").length,
    live: calls.filter((c) => c.status === "in_progress").length,
    avg_duration_seconds: done.length ? Math.round(secs / done.length) : 0,
    total_minutes: Math.round(secs / 60),
    by_day: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
  };
}
