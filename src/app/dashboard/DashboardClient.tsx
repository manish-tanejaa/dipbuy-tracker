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

export default function DashboardClient({ profile, tracked, untracked, entityLabels, investments, today }: any) {
  const router = useRouter();
  const [selectedCode, setSelectedCode] = useState<string>(tracked[0]?.instrument_code ?? "");
  const [showAdd, setShowAdd] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const [showInvest, setShowInvest] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = tracked.find((t: any) => t.instrument_code === selectedCode);

  const totalAccrued = useMemo(() => tracked.reduce((s: number, t: any) => s + (t.accrued || 0), 0), [tracked]);
  const recommendedCount = useMemo(
    () => tracked.filter((t: any) => t.lastPrice?.direction === "DOWN").length,
    [tracked]
  );

  function isRecommended(t: any) {
    return t?.lastPrice?.direction === "DOWN";
  }

  async function handleAdd(formData: FormData) {
    setBusy(true);
    try {
      const code = String(formData.get("code"));
      const startDate = String(formData.get("start_date"));
      const amount = Number(formData.get("amount"));
      await addTrackedInstrument(code, startDate, amount);
      setShowAdd(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleInvest(formData: FormData) {
    setBusy(true);
    try {
      const amount = Number(formData.get("amount"));
      const entity = String(formData.get("entity") || "") || null;
      await invest(selected.instrument_code, amount, today, entity);
      setShowInvest(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRateChange(formData: FormData) {
    setBusy(true);
    try {
      const amount = Number(formData.get("amount"));
      const effective = String(formData.get("effective"));
      await changeDailyAmount(selected.instrument_code, effective, amount);
      setShowRate(false);
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
            <form action={async () => { await signOut(); router.push("/login"); router.refresh(); }}>
              <button className="text-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* portfolio summary — minimal, 3 numbers */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total accrued</div>
            <div className={"text-2xl font-semibold mt-1 " + (recommendedCount > 0 ? "text-up" : "")}>{fmt(totalAccrued)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Tracked</div>
            <div className="text-2xl font-semibold mt-1">{tracked.length}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Dip-buy flagged today</div>
            <div className={"text-2xl font-semibold mt-1 " + (recommendedCount > 0 ? "text-up" : "")}>{recommendedCount}</div>
          </div>
        </div>

        {/* instrument picker */}
        <div className="card p-5 mb-6">
          <label className="text-xs font-medium text-muted block mb-2">Select an instrument</label>
          <select
            className="text-base font-medium"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
          >
            {tracked.map((t: any) => (
              <option key={t.instrument_code} value={t.instrument_code}>
                {isRecommended(t) ? "🟢 " : ""}{t.instrument?.display_name} — {fmt(t.accrued)}
              </option>
            ))}
          </select>

          {selected && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-lg font-semibold">{selected.instrument?.display_name}</div>
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
                <button className="btn-secondary" onClick={() => setShowRate(!showRate)}>Change daily amount</button>
                <button
                  className="btn-secondary"
                  onClick={async () => { setBusy(true); await removeTrackedInstrument(selected.id); setBusy(false); router.refresh(); }}
                >
                  Stop tracking
                </button>
              </div>

              {showInvest && (
                <form action={handleInvest} className="mt-4 p-4 rounded-xl bg-paper border border-border space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">Amount</label>
                    <input type="number" name="amount" defaultValue={selected.accrued} required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">Label (optional — e.g. manish-huf)</label>
                    <select name="entity">
                      <option value="">— none —</option>
                      {entityLabels.map((l: any) => (
                        <option key={l.id} value={l.label}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-primary" disabled={busy}>Confirm investment</button>
                </form>
              )}

              {showRate && (
                <form action={handleRateChange} className="mt-4 p-4 rounded-xl bg-paper border border-border space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">New daily amount</label>
                    <input type="number" name="amount" defaultValue={selected.daily_amount} required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">Effective from</label>
                    <input type="date" name="effective" defaultValue={today} required />
                  </div>
                  <button className="btn-primary" disabled={busy}>Save</button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* holdings list */}
        <div className="card p-5 mb-6">
          <div className="text-sm font-semibold mb-3">All tracked instruments</div>
          <table className="w-full text-sm">
            <tbody>
              {tracked.map((t: any) => (
                <tr
                  key={t.instrument_code}
                  className={"cursor-pointer border-b border-border last:border-0 " + (t.instrument_code === selectedCode ? "bg-brand-50" : "")}
                  onClick={() => setSelectedCode(t.instrument_code)}
                >
                  <td className="py-3">{t.instrument?.display_name}</td>
                  <td className="py-3 text-muted">{fmt(t.daily_amount)}/day</td>
                  <td className={"py-3 text-right font-medium " + (isRecommended(t) ? "text-up" : "")}>{fmt(t.accrued)}</td>
                </tr>
              ))}
              {tracked.length === 0 && (
                <tr><td className="py-6 text-center text-muted">Not tracking anything yet — add an instrument below.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* add instrument */}
        <div className="card p-5 mb-6">
          <button className="text-sm font-semibold flex items-center gap-2" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "▾" : "▸"} Track a new instrument
          </button>
          {showAdd && (
            <form action={handleAdd} className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Instrument</label>
                <select name="code" required>
                  {untracked.map((i: any) => (
                    <option key={i.code} value={i.code}>{i.display_name}</option>
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
              <div className="flex items-end">
                <button className="btn-primary w-full" disabled={busy}>Start tracking</button>
              </div>
            </form>
          )}
        </div>

        {/* entity labels */}
        <div className="card p-5">
          <button className="text-sm font-semibold flex items-center gap-2" onClick={() => setShowEntities(!showEntities)}>
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
  );
}
