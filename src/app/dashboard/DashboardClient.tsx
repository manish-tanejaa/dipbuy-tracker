"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addTrackedInstrument,
  removeTrackedInstrument,
  changeDailyAmount,
  invest,
  addEntityLabel,
  removeEntityLabel,
  signOut,
} from "./actions";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function labelName(label: string | null | undefined) {
  return label && label.trim() ? label : "Personal";
}

function optionText(t: any) {
  const label = t.entity_label ? ` · ${t.entity_label}` : "";
  return `${t.instrument?.display_name ?? t.instrument_code}${label} — ${fmt(t.daily_amount)}/day`;
}

export default function DashboardClient({ profile, tracked, allInstruments, entityLabels, investments, today }: any) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(tracked[0]?.id ?? "");
  const [showAccrued, setShowAccrued] = useState(false);
  const [showTrackedList, setShowTrackedList] = useState(false);
  const [showInvest, setShowInvest] = useState(false);
  const [showTrackNew, setShowTrackNew] = useState(false);
  const [showChangeAmount, setShowChangeAmount] = useState(false);
  const [showStopTracking, setShowStopTracking] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [busy, setBusy] = useState(false);

  const selected = tracked.find((t: any) => t.id === selectedId);

  const totalAccrued = useMemo(() => tracked.reduce((s: number, t: any) => s + (t.accrued || 0), 0), [tracked]);
  const recommendedCount = useMemo(
    () => tracked.filter((t: any) => t.lastPrice?.direction === "DOWN").length,
    [tracked]
  );

  function isRecommended(t: any) {
    return t?.lastPrice?.direction === "DOWN";
  }

  const hasLabels = entityLabels.length > 0;

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

  async function handleTrackNew(formData: FormData) {
    setBusy(true);
    try {
      const code = String(formData.get("code"));
      const startDate = String(formData.get("start_date"));
      const amount = Number(formData.get("amount"));
      const label = String(formData.get("entity") || "") || null;
      await addTrackedInstrument(code, startDate, amount, label);
      setShowTrackNew(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleInvest(formData: FormData) {
    if (!selected) return;
    setBusy(true);
    try {
      const amount = Number(formData.get("amount"));
      await invest(selected.instrument_code, amount, today, selected.entity_label ?? null);
      setShowInvest(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeAmount(formData: FormData) {
    setBusy(true);
    try {
      const configId = String(formData.get("config_id"));
      const target = tracked.find((t: any) => t.id === configId);
      if (!target) return;
      const amount = Number(formData.get("amount"));
      const effective = String(formData.get("effective"));
      await changeDailyAmount(target.instrument_code, effective, amount, target.entity_label ?? null);
      setShowChangeAmount(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleStopTracking(formData: FormData) {
    setBusy(true);
    try {
      const configId = String(formData.get("config_id"));
      await removeTrackedInstrument(configId);
      setShowStopTracking(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* top bar */}
      <div className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white">D</div>
            <span className="font-semibold">DipBuy</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
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
              DipBuy helps you set aside a fixed amount every day for the instruments you want to keep buying on dips,
              and reminds you when a good day to invest comes along. It doesn't move real money — it just tracks what
              you've committed to and what you've actually deployed.
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>
                <span className="font-medium">Track an instrument.</span> Open "Track a new instrument" below, pick
                one from the shared list, and set how much should accrue per day (e.g. ₹1,000/day). That amount adds
                up daily whether or not you invest.
              </li>
              <li>
                <span className="font-medium">Watch for the dip flag.</span> After each trading day, DipBuy checks
                whether the instrument closed down. If it did, it's flagged 🟢 — a sign it may be a good day to
                deploy your accrued amount. The "Total accrued" tile turns green when at least one tracked instrument
                is flagged today, and red otherwise.
              </li>
              <li>
                <span className="font-medium">Invest when ready.</span> Click Invest — from the "Total accrued" tile,
                the instrument picker, or the tracked table — to log that you've deployed the accrued amount. This
                resets the accrual clock for that instrument.
              </li>
              <li>
                <span className="font-medium">Adjust anytime.</span> Use "Change daily amount" to update how much
                accrues going forward (past amounts stay in your history), or "Stop tracking" to pause an instrument.
              </li>
              <li>
                <span className="font-medium">Investing via an HUF or Trust?</span> Add a label under "Manage your
                labels", then pick it whenever you track an instrument or invest. No separate login needed — every
                total on this page splits automatically by label.
              </li>
              <li>
                <span className="font-medium">Check your totals.</span> "Portfolio breakup" shows what's invested vs.
                still accrued, in total and by label. "All tracked instruments" lists everything you're tracking with
                its label, rate, and current accrued amount.
              </li>
            </ol>
          </div>
        )}

        {/* portfolio summary — clickable tiles */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <button
            type="button"
            className="card p-5 text-left hover:border-brand-300 transition-colors"
            onClick={() => { setShowAccrued(!showAccrued); setShowTrackedList(false); }}
          >
            <div className="text-xs text-muted uppercase tracking-wide">Total accrued</div>
            <div className={"text-2xl font-semibold mt-1 " + (recommendedCount > 0 ? "text-up" : "text-down")}>
              {fmt(totalAccrued)}
            </div>
            <div className="text-xs text-muted mt-1">{showAccrued ? "hide" : "tap to see"} breakdown</div>
          </button>

          <button
            type="button"
            className="card p-5 text-left hover:border-brand-300 transition-colors"
            onClick={() => { setShowTrackedList(!showTrackedList); setShowAccrued(false); }}
          >
            <div className="text-xs text-muted uppercase tracking-wide">Tracked</div>
            <div className="text-2xl font-semibold mt-1">{tracked.length}</div>
            <div className="text-xs text-muted mt-1">{showTrackedList ? "hide" : "tap to see"} list</div>
          </button>

          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Dip-buy flagged today</div>
            <div className={"text-2xl font-semibold mt-1 " + (recommendedCount > 0 ? "text-up" : "")}>{recommendedCount}</div>
          </div>
        </div>

        {/* expanded: accrued breakdown with invest action per row */}
        {showAccrued && (
          <div className="card p-5 mb-4">
            <div className="text-sm font-semibold mb-3">Accrued, not yet invested</div>
            {hasLabels && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(accruedByLabel).map(([label, amt]) => (
                  <span key={label} className="text-xs bg-paper border border-border rounded-full px-3 py-1">
                    {label}: <span className="font-medium">{fmt(amt as number)}</span>
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {tracked.map((t: any) => (
                <AccruedRow key={t.id} t={t} today={today} isRecommended={isRecommended(t)} onDone={() => router.refresh()} />
              ))}
              {tracked.length === 0 && <div className="text-sm text-muted py-4 text-center">Not tracking anything yet.</div>}
            </div>
          </div>
        )}

        {/* expanded: simple tracked list */}
        {showTrackedList && (
          <div className="card p-5 mb-4">
            <div className="text-sm font-semibold mb-3">Everything you're tracking</div>
            <div className="space-y-1">
              {tracked.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span>
                    {t.instrument?.display_name}
                    {t.entity_label && <span className="text-muted"> · {t.entity_label}</span>}
                  </span>
                  <span className="text-muted">{fmt(t.daily_amount)}/day</span>
                </div>
              ))}
              {tracked.length === 0 && <div className="text-sm text-muted py-4 text-center">Not tracking anything yet.</div>}
            </div>
          </div>
        )}

        {/* instrument picker */}
        <div className="card p-5 mb-6">
          <label className="text-xs font-medium text-muted block mb-2">Select an instrument</label>
          <select
            className="text-base font-medium"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {tracked.map((t: any) => (
              <option key={t.id} value={t.id}>
                {isRecommended(t) ? "🟢 " : ""}{optionText(t)}
              </option>
            ))}
          </select>

          {selected && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-lg font-semibold">
                    {selected.instrument?.display_name}
                    {selected.entity_label && (
                      <span className="ml-2 text-xs font-normal text-muted bg-paper border border-border rounded-full px-2 py-0.5 align-middle">
                        {selected.entity_label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    tracking since {selected.start_date} · {fmt(selected.daily_amount)}/day
                  </div>
                </div>
                <div className="text-right">
                  <div className={"text-3xl font-bold " + (isRecommended(selected) ? "text-up" : "")}>
                    {fmt(selected.accrued)}
                  </div>
                  <div className="text-xs text-muted mt-1">accrued, not yet invested</div>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted">
                {selected.lastPrice ? (
                  selected.lastPrice.direction === "DOWN" ? (
                    <span>Last trading day ({selected.lastPrice.date}): <span className="text-down font-medium">DOWN {selected.lastPrice.change_pct}%</span> — flagged as a dip-buy opportunity.</span>
                  ) : (
                    <span>Last trading day ({selected.lastPrice.date}): <span className="text-up font-medium">UP {selected.lastPrice.change_pct}%</span> — no action flagged.</span>
                  )
                ) : (
                  <span>No trading day recorded yet.</span>
                )}
              </div>

              <div className="flex gap-3 mt-5 flex-wrap">
                <button className="btn-primary" onClick={() => setShowInvest(!showInvest)}>Invest</button>
              </div>

              {showInvest && (
                <form action={handleInvest} className="mt-4 p-4 rounded-xl bg-paper border border-border space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">Amount</label>
                    <input type="number" name="amount" defaultValue={selected.accrued} required />
                  </div>
                  <div className="text-xs text-muted">
                    Will be logged under <span className="font-medium">{labelName(selected.entity_label)}</span>.
                  </div>
                  <button className="btn-primary" disabled={busy}>Confirm investment</button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* portfolio breakup */}
        <div className="card p-5 mb-6">
          <div className="text-sm font-semibold mb-4">Portfolio breakup — total investments till date</div>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-xs text-muted uppercase tracking-wide">Total invested</div>
              <div className="text-2xl font-semibold mt-1">{fmt(totalInvested)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted uppercase tracking-wide">Total accrued (pending)</div>
              <div className="text-lg font-medium mt-1">{fmt(totalAccrued)}</div>
            </div>
          </div>

          {hasLabels && (
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
          )}
        </div>

        {/* holdings list */}
        <div className="card p-5 mb-6">
          <div className="text-sm font-semibold mb-3">All tracked instruments</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3">Instrument</th>
                <th className="py-2 pr-3">Label</th>
                <th className="py-2 pr-3">Rate</th>
                <th className="py-2 pr-3 text-right">Accrued</th>
              </tr>
            </thead>
            <tbody>
              {tracked.map((t: any) => (
                <tr
                  key={t.id}
                  className={"cursor-pointer border-b border-border last:border-0 " + (t.id === selectedId ? "bg-brand-50" : "")}
                  onClick={() => setSelectedId(t.id)}
                >
                  <td className="py-3">{t.instrument?.display_name}</td>
                  <td className="py-3 text-muted">{labelName(t.entity_label)}</td>
                  <td className="py-3 text-muted">{fmt(t.daily_amount)}/day</td>
                  <td className={"py-3 text-right font-medium " + (isRecommended(t) ? "text-up" : "")}>{fmt(t.accrued)}</td>
                </tr>
              ))}
              {tracked.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted">Not tracking anything yet — add an instrument below.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* config sections */}
        <div className="space-y-4">
          {/* track a new instrument */}
          <div className="card p-5">
            <button className="text-sm font-semibold flex items-center gap-2 w-full text-left" onClick={() => setShowTrackNew(!showTrackNew)}>
              {showTrackNew ? "▾" : "▸"} Track a new instrument
            </button>
            {showTrackNew && (
              <form action={handleTrackNew} className="mt-4 grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Instrument</label>
                  <select name="code" required>
                    {allInstruments.map((i: any) => (
                      <option key={i.code} value={i.code}>{i.display_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Label (optional)</label>
                  <select name="entity">
                    <option value="">— none — (Personal)</option>
                    {entityLabels.map((l: any) => (
                      <option key={l.id} value={l.label}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Daily amount</label>
                  <input type="number" name="amount" defaultValue={1000} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Start date</label>
                  <input type="date" name="start_date" defaultValue={today} required />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button className="btn-primary" disabled={busy}>Start tracking</button>
                </div>
              </form>
            )}
          </div>

          {/* change daily amount */}
          <div className="card p-5">
            <button className="text-sm font-semibold flex items-center gap-2 w-full text-left" onClick={() => setShowChangeAmount(!showChangeAmount)}>
              {showChangeAmount ? "▾" : "▸"} Change daily amount
            </button>
            {showChangeAmount && (
              <form action={handleChangeAmount} className="mt-4 grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted block mb-1">Instrument</label>
                  <select name="config_id" required>
                    {tracked.map((t: any) => (
                      <option key={t.id} value={t.id}>{optionText(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">New daily amount</label>
                  <input type="number" name="amount" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Effective from</label>
                  <input type="date" name="effective" defaultValue={today} required />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button className="btn-primary" disabled={busy}>Save</button>
                </div>
              </form>
            )}
          </div>

          {/* stop tracking */}
          <div className="card p-5">
            <button className="text-sm font-semibold flex items-center gap-2 w-full text-left" onClick={() => setShowStopTracking(!showStopTracking)}>
              {showStopTracking ? "▾" : "▸"} Stop tracking
            </button>
            {showStopTracking && (
              <form action={handleStopTracking} className="mt-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[240px]">
                  <label className="text-xs font-medium text-muted block mb-1">Instrument</label>
                  <select name="config_id" required>
                    {tracked.map((t: any) => (
                      <option key={t.id} value={t.id}>{optionText(t)}</option>
                    ))}
                  </select>
                </div>
                <button className="btn-secondary" disabled={busy}>Stop tracking</button>
              </form>
            )}
          </div>

          {/* entity labels */}
          <div className="card p-5">
            <button className="text-sm font-semibold flex items-center gap-2 w-full text-left" onClick={() => setShowEntities(!showEntities)}>
              {showEntities ? "▾" : "▸"} Manage your labels
            </button>
            {showEntities && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {entityLabels.map((l: any) => (
                    <span key={l.id} className="inline-flex items-center gap-2 bg-paper border border-border rounded-full px-3 py-1 text-sm">
                      {l.label}
                      <button className="text-muted hover:text-down" onClick={async () => { await removeEntityLabel(l.id); router.refresh(); }}>×</button>
                    </span>
                  ))}
                  {entityLabels.length === 0 && <span className="text-sm text-muted">No labels yet — e.g. add "manish-huf" or "taneja-trust".</span>}
                </div>
                <form
                  action={async (fd) => { await addEntityLabel(String(fd.get("label"))); router.refresh(); }}
                  className="flex gap-2"
                >
                  <input type="text" name="label" placeholder="e.g. manish-huf" required />
                  <button className="btn-secondary" type="submit">Add label</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccruedRow({ t, today, isRecommended, onDone }: any) {
  const [showInvest, setShowInvest] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleInvest(formData: FormData) {
    setBusy(true);
    try {
      const amount = Number(formData.get("amount"));
      await invest(t.instrument_code, amount, today, t.entity_label ?? null);
      setShowInvest(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">
            {t.instrument?.display_name}
            {t.entity_label && <span className="text-xs text-muted"> · {t.entity_label}</span>}
          </div>
          <div className="text-xs text-muted">{fmt(t.daily_amount)}/day</div>
        </div>
        <div className="flex items-center gap-3">
          <div className={"text-base font-semibold " + (isRecommended ? "text-up" : "")}>{fmt(t.accrued)}</div>
          <button className="btn-secondary text-xs py-1 px-3" onClick={() => setShowInvest(!showInvest)}>Invest</button>
        </div>
      </div>
      {showInvest && (
        <form action={handleInvest} className="mt-3 pt-3 border-t border-border flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted block mb-1">Amount</label>
            <input type="number" name="amount" defaultValue={t.accrued} required />
          </div>
          <button className="btn-primary text-sm py-2 px-3" disabled={busy}>Confirm</button>
        </form>
      )}
    </div>
  );
}
