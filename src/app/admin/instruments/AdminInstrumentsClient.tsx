"use client";

import { useMemo, useState } from "react";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function labelName(label: string | null | undefined) {
  return label && label.trim() ? label : "Personal";
}

export default function AdminInstrumentsClient({ instruments }: any) {
  const [openCode, setOpenCode] = useState<string | null>(null);

  const tracked = useMemo(() => instruments.filter((i: any) => i.trackersCount > 0), [instruments]);
  const untracked = useMemo(() => instruments.filter((i: any) => i.trackersCount === 0), [instruments]);

  const mostTracked = useMemo(
    () => (tracked.length ? tracked.reduce((a: any, b: any) => (b.trackersCount > a.trackersCount ? b : a)) : null),
    [tracked]
  );
  const leastTracked = useMemo(
    () => (tracked.length ? tracked.reduce((a: any, b: any) => (b.trackersCount < a.trackersCount ? b : a)) : null),
    [tracked]
  );
  const topAccrued = useMemo(
    () => (tracked.length ? tracked.reduce((a: any, b: any) => (b.totalAccrued > a.totalAccrued ? b : a)) : null),
    [tracked]
  );
  const topInvested = useMemo(
    () => (tracked.length ? tracked.reduce((a: any, b: any) => (b.totalInvested > a.totalInvested ? b : a)) : null),
    [tracked]
  );

  const grandTotalDailyRate = useMemo(() => instruments.reduce((s: number, i: any) => s + i.totalDailyRate, 0), [instruments]);
  const grandTotalAccrued = useMemo(() => instruments.reduce((s: number, i: any) => s + i.totalAccrued, 0), [instruments]);
  const grandTotalInvested = useMemo(() => instruments.reduce((s: number, i: any) => s + i.totalInvested, 0), [instruments]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center font-bold text-white">A</div>
            <span className="font-semibold">Instrument breakdown</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/admin" className="text-brand-600 font-semibold">Back to admin</a>
            <a href="/dashboard" className="text-muted hover:text-ink">Dashboard</a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* overall totals */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total daily accrual rate</div>
            <div className="text-2xl font-semibold mt-1">{fmt(grandTotalDailyRate)}/day</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total accrued (all users)</div>
            <div className="text-2xl font-semibold mt-1">{fmt(grandTotalAccrued)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total invested (all users)</div>
            <div className="text-2xl font-semibold mt-1">{fmt(grandTotalInvested)}</div>
          </div>
        </div>

        {/* insight cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InsightCard label="Most tracked" instrument={mostTracked} metric={mostTracked ? `${mostTracked.trackersCount} user${mostTracked.trackersCount === 1 ? "" : "s"}` : "—"} />
          <InsightCard label="Least tracked" instrument={leastTracked} metric={leastTracked ? `${leastTracked.trackersCount} user${leastTracked.trackersCount === 1 ? "" : "s"}` : "—"} />
          <InsightCard label="Top accrued" instrument={topAccrued} metric={topAccrued ? fmt(topAccrued.totalAccrued) : "—"} />
          <InsightCard label="Top invested" instrument={topInvested} metric={topInvested ? fmt(topInvested.totalInvested) : "—"} />
        </div>

        {untracked.length > 0 && (
          <div className="text-xs text-muted">
            {untracked.length} instrument{untracked.length === 1 ? "" : "s"} in the registry {untracked.length === 1 ? "isn't" : "aren't"} tracked by anyone yet: {untracked.map((i: any) => i.displayName).join(", ")}.
          </div>
        )}

        {/* per-instrument table */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4">Every instrument — who's tracking it, and how much</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3">Instrument</th>
                <th className="py-2 pr-3 text-right">Trackers</th>
                <th className="py-2 pr-3 text-right">₹/day (total)</th>
                <th className="py-2 pr-3 text-right">Accrued</th>
                <th className="py-2 pr-3 text-right">Invested</th>
                <th className="py-2 pr-3">Last price</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((i: any) => (
                <InstrumentRow key={i.code} i={i} open={openCode === i.code} onToggle={() => setOpenCode(openCode === i.code ? null : i.code)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ label, instrument, metric }: any) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold mt-1">{instrument?.displayName ?? "—"}</div>
      <div className="text-xs text-muted mt-0.5">{metric}</div>
    </div>
  );
}

function InstrumentRow({ i, open, onToggle }: any) {
  return (
    <>
      <tr className="border-b border-border last:border-0 cursor-pointer hover:bg-paper" onClick={onToggle}>
        <td className="py-3">
          {i.displayName}
          {i.trackersCount === 0 && <span className="ml-2 text-xs text-muted">(untracked)</span>}
        </td>
        <td className="py-3 text-right">{i.trackersCount}</td>
        <td className="py-3 text-right">{fmt(i.totalDailyRate)}</td>
        <td className="py-3 text-right font-medium">{fmt(i.totalAccrued)}</td>
        <td className="py-3 text-right">{fmt(i.totalInvested)}</td>
        <td className="py-3">
          {i.lastPrice ? (
            <span className="text-xs" title={i.lastPrice.date}>
              ₹{i.lastPrice.price}{" "}
              {i.lastPrice.direction === "DOWN" ? (
                <span className="text-up">▼ {i.lastPrice.change_pct}%</span>
              ) : i.lastPrice.direction === "UP" ? (
                <span className="text-down">▲ {i.lastPrice.change_pct}%</span>
              ) : null}
            </span>
          ) : (
            <span className="text-xs text-muted">no data</span>
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={6} className="pb-4">
            <div className="p-3 rounded-xl bg-paper border border-border">
              {i.perUser.length === 0 ? (
                <div className="text-xs text-muted">Nobody is tracking this instrument.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th className="py-1 pr-3">User</th>
                      <th className="py-1 pr-3">Label</th>
                      <th className="py-1 pr-3 text-right">Rate</th>
                      <th className="py-1 pr-3">Since</th>
                      <th className="py-1 pr-3 text-right">Accrued</th>
                      <th className="py-1 pr-3 text-right">Invested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {i.perUser.map((u: any, idx: number) => (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="py-1 pr-3">{u.displayName}</td>
                        <td className="py-1 pr-3 text-muted">{labelName(u.label)}</td>
                        <td className="py-1 pr-3 text-right">{fmt(u.dailyAmount)}/day</td>
                        <td className="py-1 pr-3 text-muted">{u.startDate}</td>
                        <td className="py-1 pr-3 text-right font-medium">{fmt(u.accrued)}</td>
                        <td className="py-1 pr-3 text-right">{fmt(u.invested)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
