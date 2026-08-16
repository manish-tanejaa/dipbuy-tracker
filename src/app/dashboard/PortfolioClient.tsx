"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { invest, signOut } from "./actions";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function labelName(label: string | null | undefined) {
  return label && label.trim() ? label : "Personal";
}

function isRecommended(t: any) {
  return t?.lastPrice?.direction === "DOWN";
}

export default function PortfolioClient({ profile, tracked, entityLabels, investments, today }: any) {
  const router = useRouter();
  const [showGuide, setShowGuide] = useState(true);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [openInvestId, setOpenInvestId] = useState<string | null>(null);

  const hasLabels = entityLabels.length > 0;

  const totalAccrued = useMemo(() => tracked.reduce((s: number, t: any) => s + (t.accrued || 0), 0), [tracked]);
  const recommendedCount = useMemo(
    () => tracked.filter((t: any) => t.lastPrice?.direction === "DOWN").length,
    [tracked]
  );
  const totalInvested = useMemo(
    () => investments.reduce((s: number, inv: any) => s + Number(inv.amount || 0), 0),
    [investments]
  );

  const investedByLabel = useMemo(() => {
    const map: Record<string, number> = {};
    investments.forEach((inv: any) => {
      const key = labelName(inv.entity_label);
      map[key] = (map[key] || 0) + Number(inv.amount || 0);
    });
    return map;
  }, [investments]);

  const accruedByLabel = useMemo(() => {
    const map: Record<string, number> = {};
    tracked.forEach((t: any) => {
      const key = labelName(t.entity_label);
      map[key] = (map[key] || 0) + Number(t.accrued || 0);
    });
    return map;
  }, [tracked]);

  const labelBreakdownKeys = useMemo(() => {
    const s = new Set<string>();
    Object.keys(investedByLabel).forEach((k) => s.add(k));
    Object.keys(accruedByLabel).forEach((k) => s.add(k));
    entityLabels.forEach((l: any) => s.add(l.label));
    s.add("Personal");
    return Array.from(s);
  }, [investedByLabel, accruedByLabel, entityLabels]);

  const colCount = hasLabels ? 6 : 5;

  return (
    <div className="min-h-screen bg-paper">
      {/* top bar */}
      <div className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white">D</div>
            <span className="font-semibold">DipBuy</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <a href="/dashboard" className="font-semibold text-ink border-b-2 border-brand-500 pb-1">Portfolio</a>
            <a href="/dashboard/setup" className="text-muted hover:text-ink">Setup</a>
            <span className="text-muted">{profile?.display_name}</span>
            {profile?.role === "admin" && (
              <a href="/admin" className="text-brand-600 font-semibold">Admin</a>
            )}
            <button className="text-muted hover:text-ink" onClick={() => setShowGuide(!showGuide)}>
              {showGuide ? "Hide guide" : "❓ How to use this"}
            </button>
            <form action={async () => { await signOut(); router.push("/login"); router.refresh(); }}>
              <button className="text-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* how to use this — simple guide */}
        {showGuide && (
          <div className="card p-5 mb-6 bg-brand-50 border-brand-100">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="text-sm font-semibold">How to use DipBuy</div>
              <button className="text-xs text-muted hover:text-ink shrink-0" onClick={() => setShowGuide(false)}>
                Hide
              </button>
            </div>
            <p className="text-sm text-muted mb-3">
              DipBuy sets aside a fixed amount every day for the instruments you track, and flags when the market
              closed down — a good day to deploy what's accrued. This page is your portfolio view; head to
              <span className="font-medium"> Setup</span> to start tracking something new, change a daily amount, or
              stop tracking.
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>
                <span className="font-medium">Watch for the dip flag.</span> Each row shows the last trading day's
                price with a ▼ green (closed down — a buying opportunity) or ▲ red (closed up) marker. Hover the
                marker to see the date.
              </li>
              <li>
                <span className="font-medium">Check the range.</span> The small bar under the price shows where
                today's price sits between the lowest and highest price recorded since we started tracking it.
              </li>
              <li>
                <span className="font-medium">Invest when ready.</span> Click Invest on any row to log that you've
                deployed the accrued amount. This resets the accrual clock for that instrument.
              </li>
              <li>
                <span className="font-medium">Check the history.</span> Click the price to expand a row and see
                every trading day since you started tracking that instrument.
              </li>
              <li>
                <span className="font-medium">Totals by label.</span> If you use HUF or Trust labels, the table above
                the instrument list splits invested and accrued totals by label automatically.
              </li>
            </ol>
          </div>
        )}

        {/* summary tiles */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total invested</div>
            <div className="text-2xl font-semibold mt-1">{fmt(totalInvested)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total accrued (pending)</div>
            <div className={"text-2xl font-semibold mt-1 " + (recommendedCount > 0 ? "text-up" : "text-down")}>
              {fmt(totalAccrued)}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Dip-buy flagged today</div>
            <div className={"text-2xl font-semibold mt-1 " + (recommendedCount > 0 ? "text-up" : "")}>{recommendedCount}</div>
          </div>
        </div>

        {/* by-label breakdown */}
        {hasLabels && (
          <div className="card p-5 mb-6">
            <div className="text-sm font-semibold mb-4">Portfolio breakup by label</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-3">Label</th>
                  <th className="py-2 pr-3 text-right">Invested</th>
                  <th className="py-2 pr-3 text-right">Accrued (pending)</th>
                </tr>
              </thead>
              <tbody>
                {labelBreakdownKeys.map((label) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <td className="py-2">{label}</td>
                    <td className="py-2 text-right">{fmt(investedByLabel[label] || 0)}</td>
                    <td className="py-2 text-right">{fmt(accruedByLabel[label] || 0)}</td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{fmt(totalInvested)}</td>
                  <td className="py-2 text-right">{fmt(totalAccrued)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* instrument-wise breakdown */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4">Instruments</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3">Instrument</th>
                {hasLabels && <th className="py-2 pr-3">Label</th>}
                <th className="py-2 pr-3">Last price</th>
                <th className="py-2 pr-3 text-right">Accrued</th>
                <th className="py-2 pr-3 text-right">Invested</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {tracked.map((t: any) => (
                <TrackedRow
                  key={t.id}
                  t={t}
                  today={today}
                  hasLabels={hasLabels}
                  colSpan={colCount}
                  historyOpen={openHistoryId === t.id}
                  onToggleHistory={() => setOpenHistoryId(openHistoryId === t.id ? null : t.id)}
                  investOpen={openInvestId === t.id}
                  onToggleInvest={() => setOpenInvestId(openInvestId === t.id ? null : t.id)}
                  onDone={() => { setOpenInvestId(null); router.refresh(); }}
                />
              ))}
              {tracked.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-6 text-center text-muted">
                    Not tracking anything yet — head to <a href="/dashboard/setup" className="text-brand-600 font-semibold">Setup</a> to add an instrument.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RangeBar({ low, high, value }: { low?: number | null; high?: number | null; value?: number | null }) {
  if (low == null || high == null || value == null) return null;
  const pct = high > low ? Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100)) : 50;
  return (
    <div className="mt-1.5 w-28" title={`Range since tracking began: ₹${Math.round(low)} – ₹${Math.round(high)}`}>
      <div className="relative pt-1.5">
        <div
          className="absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-ink"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
        <div className="h-1 bg-border rounded-full" />
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-0.5">
        <span>₹{Math.round(low)}</span>
        <span>₹{Math.round(high)}</span>
      </div>
    </div>
  );
}

function TrackedRow({ t, today, hasLabels, colSpan, historyOpen, onToggleHistory, investOpen, onToggleInvest, onDone }: any) {
  const [busy, setBusy] = useState(false);
  const recommended = isRecommended(t);

  async function handleInvest(formData: FormData) {
    setBusy(true);
    try {
      const amount = Number(formData.get("amount"));
      await invest(t.instrument_code, amount, today, t.entity_label ?? null);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-3">{t.instrument?.display_name}</td>
        {hasLabels && <td className="py-3 text-muted">{labelName(t.entity_label)}</td>}
        <td className="py-3">
          <button className="text-left" onClick={onToggleHistory} title="Click to see full price history">
            {t.lastPrice ? (
              <>
                <div className="flex items-center gap-1.5 text-sm font-medium" title={t.lastPrice.date}>
                  <span>₹{t.lastPrice.price}</span>
                  {t.lastPrice.direction === "DOWN" ? (
                    <span className="text-up" aria-label="down">▼</span>
                  ) : t.lastPrice.direction === "UP" ? (
                    <span className="text-down" aria-label="up">▲</span>
                  ) : null}
                </div>
                <RangeBar low={t.range?.low} high={t.range?.high} value={t.lastPrice.price} />
              </>
            ) : (
              <span className="text-xs text-muted">no data</span>
            )}
          </button>
        </td>
        <td className={"py-3 text-right font-medium " + (recommended ? "text-up" : "")}>{fmt(t.accrued)}</td>
        <td className="py-3 text-right">{fmt(t.invested)}</td>
        <td className="py-3 text-right">
          <button className="btn-secondary text-xs py-1 px-3" onClick={onToggleInvest}>Invest</button>
        </td>
      </tr>
      {investOpen && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={colSpan} className="pb-3">
            <form action={handleInvest} className="p-3 rounded-xl bg-paper border border-border flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Amount</label>
                <input type="number" name="amount" defaultValue={t.accrued} required />
              </div>
              <button className="btn-primary text-sm py-2 px-3" disabled={busy}>Confirm investment</button>
              <span className="text-xs text-muted">Will be logged under {labelName(t.entity_label)}.</span>
            </form>
          </td>
        </tr>
      )}
      {historyOpen && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={colSpan} className="pb-4">
            <div className="p-3 rounded-xl bg-paper border border-border">
              <div className="text-xs font-medium text-muted mb-2">
                Price history since {t.start_date}
              </div>
              {t.priceHistory.length === 0 ? (
                <div className="text-xs text-muted">No price data recorded yet.</div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted border-b border-border sticky top-0 bg-paper">
                        <th className="py-1 pr-3">Date</th>
                        <th className="py-1 pr-3">Type</th>
                        <th className="py-1 pr-3 text-right">Price</th>
                        <th className="py-1 pr-3 text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.priceHistory.map((row: any) => (
                        <tr key={row.date} className="border-b border-border last:border-0">
                          <td className="py-1 pr-3">{row.date}</td>
                          <td className="py-1 pr-3 text-muted">{row.day_type}</td>
                          <td className="py-1 pr-3 text-right">{row.price != null ? `₹${row.price}` : "—"}</td>
                          <td className={"py-1 pr-3 text-right font-medium " + (row.direction === "DOWN" ? "text-up" : row.direction === "UP" ? "text-down" : "text-muted")}>
                            {row.change_pct != null ? `${row.direction === "DOWN" ? "▼" : "▲"} ${row.change_pct}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { invest, signOut } from "./actions";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function labelName(label: string | null | undefined) {
  return label && label.trim() ? label : "Personal";
}

function isRecommended(t: any) {
  return t?.lastPrice?.direction === "DOWN";
}

export default function PortfolioClient({ profile, tracked, entityLabels, investments, today }: any) {
  const router = useRouter();
  const [showGuide, setShowGuide] = useState(true);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [openInvestId, setOpenInvestId] = useState<string | null>(null);

  const hasLabels = entityLabels.length > 0;

  const totalAccrued = useMemo(() => tracked.reduce((s: number, t: any) => s + (t.accrued || 0), 0), [tracked]);
  const recommendedCount = useMemo(
    () => tracked.filter((t: any) => t.lastPrice?.direction === "DOWN").length,
    [tracked]
  );
  const totalInvested = useMemo(
    () => investments.reduce((s: number, inv: any) => s + Number(inv.amount || 0), 0),
    [investments]
  );

  const investedByLabel = useMemo(() => {
    const map: Record<string, number> = {};
    investments.forEach((inv: any) => {
      const key = labelName(inv.entity_label);
      map[key] = (map[key] || 0) + Number(inv.amount || 0);
    });
    return map;
  }, [investments]);

  const accruedByLabel = useMemo(() => {
    const map: Record<string, number> = {};
    tracked.forEach((t: any) => {
      const key = labelName(t.entity_label);
      map[key] = (map[key] || 0) + Number(t.accrued || 0);
    });
    return map;
  }, [tracked]);

  const labelBreakdownKeys = useMemo(() => {
    const s = new Set<string>();
    Object.keys(investedByLabel).forEach((k) => s.add(k));
    Object.keys(accruedByLabel).forEach((k) => s.add(k));
    entityLabels.forEach((l: any) => s.add(l.label));
    s.add("Personal");
    return Array.from(s);
  }, [investedByLabel, accruedByLabel, entityLabels]);

  const colCount = hasLabels ? 6 : 5;

  return (
    <div className="min-h-screen bg-paper">
      {/* top bar */}
      <div className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white">D</div>
            <span className="font-semibold">DipBuy</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <a href="/dashboard" className="font-semibold text-ink border-b-2 border-brand-500 pb-1">Portfolio</a>
            <a href="/dashboard/setup" className="text-muted hover:text-ink">Setup</a>
            <span className="text-muted">{profile?.display_name}</span>
            {profile?.role === "admin" && (
              <a href="/admin" className="text-brand-600 font-semibold">Admin</a>
            )}
            <button className="text-muted hover:text-ink" onClick={() => setShowGuide(!showGuide)}>
              {showGuide ? "Hide guide" : "❓ How to use this"}
            </button>
            <form action={async () => { await signOut(); router.push("/login"); router.refresh(); }}>
              <button className="text-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* how to use this — simple guide */}
        {showGuide && (
          <div className="card p-5 mb-6 bg-brand-50 border-brand-100">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="text-sm font-semibold">How to use DipBuy</div>
              <button className="text-xs text-muted hover:text-ink shrink-0" onClick={() => setShowGuide(false)}>
                Hide
              </button>
            </div>
            <p className="text-sm text-muted mb-3">
              DipBuy sets aside a fixed amount every day for the instruments you track, and flags when the market
              closed down — a good day to deploy what's accrued. This page is your portfolio view; head to
              <span className="font-medium"> Setup</span> to start tracking something new, change a daily amount, or
              stop tracking.
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>
                <span className="font-medium">Watch for the dip flag.</span> Each row shows the last trading day's
                price with a ▼ green (closed down — a buying opportunity) or ▲ red (closed up) marker. Hover the
                marker to see the date.
              </li>
              <li>
                <span className="font-medium">Check the range.</span> The small bar under the price shows where
                today's price sits between the lowest and highest price recorded since we started tracking it.
              </li>
              <li>
                <span className="font-medium">Invest when ready.</span> Click Invest on any row to log that you've
                deployed the accrued amount. This resets the accrual clock for that instrument.
              </li>
              <li>
                <span className="font-medium">Check the history.</span> Click the price to expand a row and see
                every trading day since you started tracking that instrument.
              </li>
              <li>
                <span className="font-medium">Totals by label.</span> If you use HUF or Trust labels, the table above
                the instrument list splits invested and accrued totals by label automatically.
              </li>
            </ol>
          </div>
        )}

        {/* summary tiles */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total invested</div>
            <div className="text-2xl font-semibold mt-1">{fmt(totalInvested)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total accrued (pending)</div>
            <div className={"text-2xl font-semibold mt-1 " + (recommendedCount > 0 ? "text-up" : "text-down")}>
              {fmt(totalAccrued)}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Dip-buy flagged today</div>
            <div className={"text-2xl font-semibold mt-1 " + (recommendedCount > 0 ? "text-up" : "")}>{recommendedCount}</div>
          </div>
        </div>

        {/* by-label breakdown */}
        {hasLabels && (
          <div className="card p-5 mb-6">
            <div className="text-sm font-semibold mb-4">Portfolio breakup by label</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-3">Label</th>
                  <th className="py-2 pr-3 text-right">Invested</th>
                  <th className="py-2 pr-3 text-right">Accrued (pending)</th>
                </tr>
              </thead>
              <tbody>
                {labelBreakdownKeys.map((label) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <td className="py-2">{label}</td>
                    <td className="py-2 text-right">{fmt(investedByLabel[label] || 0)}</td>
                    <td className="py-2 text-right">{fmt(accruedByLabel[label] || 0)}</td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{fmt(totalInvested)}</td>
                  <td className="py-2 text-right">{fmt(totalAccrued)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* instrument-wise breakdown */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4">Instruments</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3">Instrument</th>
                {hasLabels && <th className="py-2 pr-3">Label</th>}
                <th className="py-2 pr-3">Last price</th>
                <th className="py-2 pr-3 text-right">Accrued</th>
                <th className="py-2 pr-3 text-right">Invested</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {tracked.map((t: any) => (
                <TrackedRow
                  key={t.id}
                  t={t}
                  today={today}
                  hasLabels={hasLabels}
                  colSpan={colCount}
                  historyOpen={openHistoryId === t.id}
                  onToggleHistory={() => setOpenHistoryId(openHistoryId === t.id ? null : t.id)}
                  investOpen={openInvestId === t.id}
                  onToggleInvest={() => setOpenInvestId(openInvestId === t.id ? null : t.id)}
                  onDone={() => { setOpenInvestId(null); router.refresh(); }}
                />
              ))}
              {tracked.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-6 text-center text-muted">
                    Not tracking anything yet — head to <a href="/dashboard/setup" className="text-brand-600 font-semibold">Setup</a> to add an instrument.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RangeBar({ low, high, value }: { low?: number | null; high?: number | null; value?: number | null }) {
  if (low == null || high == null || value == null) return null;
  const pct = high > low ? Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100)) : 50;
  return (
    <div className="mt-1.5 w-28" title={`Range since tracking began: ₹${Math.round(low)} – ₹${Math.round(high)}`}>
      <div className="relative pt-1.5">
        <div
          className="absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-ink"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
        <div className="h-1 bg-border rounded-full" />
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-0.5">
        <span>₹{Math.round(low)}</span>
        <span>₹{Math.round(high)}</span>
      </div>
    </div>
  );
}

function TrackedRow({ t, today, hasLabels, colSpan, historyOpen, onToggleHistory, investOpen, onToggleInvest, onDone }: any) {
  const [busy, setBusy] = useState(false);
  const recommended = isRecommended(t);

  async function handleInvest(formData: FormData) {
    setBusy(true);
    try {
      const amount = Number(formData.get("amount"));
      await invest(t.instrument_code, amount, today, t.entity_label ?? null);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-3">{t.instrument?.display_name}</td>
        {hasLabels && <td className="py-3 text-muted">{labelName(t.entity_label)}</td>}
        <td className="py-3">
          <button className="text-left" onClick={onToggleHistory} title="Click to see full price history">
            {t.lastPrice ? (
              <>
                <div className="flex items-center gap-1.5 text-sm font-medium" title={t.lastPrice.date}>
                  <span>₹{t.lastPrice.price}</span>
                  {t.lastPrice.direction === "DOWN" ? (
                    <span className="text-up" aria-label="down">▼</span>
                  ) : t.lastPrice.direction === "UP" ? (
                    <span className="text-down" aria-label="up">▲</span>
                  ) : null}
                </div>
                <RangeBar low={t.range?.low} high={t.range?.high} value={t.lastPrice.price} />
              </>
            ) : (
              <span className="text-xs text-muted">no data</span>
            )}
          </button>
        </td>
        <td className={"py-3 text-right font-medium " + (recommended ? "text-up" : "")}>{fmt(t.accrued)}</td>
        <td className="py-3 text-right">{fmt(t.invested)}</td>
        <td className="py-3 text-right">
          <button className="btn-secondary text-xs py-1 px-3" onClick={onToggleInvest}>Invest</button>
        </td>
      </tr>
      {investOpen && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={colSpan} className="pb-3">
            <form action={handleInvest} className="p-3 rounded-xl bg-paper border border-border flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Amount</label>
                <input type="number" name="amount" defaultValue={t.accrued} required />
              </div>
              <button className="btn-primary text-sm py-2 px-3" disabled={busy}>Confirm investment</button>
              <span className="text-xs text-muted">Will be logged under {labelName(t.entity_label)}.</span>
            </form>
          </td>
        </tr>
      )}
      {historyOpen && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={colSpan} className="pb-4">
            <div className="p-3 rounded-xl bg-paper border border-border">
              <div className="text-xs font-medium text-muted mb-2">
                Price history since {t.start_date}
              </div>
              {t.priceHistory.length === 0 ? (
                <div className="text-xs text-muted">No price data recorded yet.</div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted border-b border-border sticky top-0 bg-paper">
                        <th className="py-1 pr-3">Date</th>
                        <th className="py-1 pr-3">Type</th>
                        <th className="py-1 pr-3 text-right">Price</th>
                        <th className="py-1 pr-3 text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.priceHistory.map((row: any) => (
                        <tr key={row.date} className="border-b border-border last:border-0">
                          <td className="py-1 pr-3">{row.date}</td>
                          <td className="py-1 pr-3 text-muted">{row.day_type}</td>
                          <td className="py-1 pr-3 text-right">{row.price != null ? `₹${row.price}` : "—"}</td>
                          <td className={"py-1 pr-3 text-right font-medium " + (row.direction === "DOWN" ? "text-up" : row.direction === "UP" ? "text-down" : "text-muted")}>
                            {row.change_pct != null ? `${row.direction === "DOWN" ? "▼" : "▲"} ${row.change_pct}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
