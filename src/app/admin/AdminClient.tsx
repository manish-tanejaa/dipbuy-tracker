"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateInstrument, addInstrument, setUserRole } from "./actions";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

export default function AdminClient({ instruments, trackerCounts, users, totalUsers }: any) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveRow(code: string, form: HTMLFormElement) {
    setBusy(true);
    const fd = new FormData(form);
    try {
      await updateInstrument(code, {
        display_name: String(fd.get("display_name")),
        ticker: String(fd.get("ticker")),
        source_template: String(fd.get("source_template")),
        in_base_pack: fd.get("in_base_pack") === "on",
        active: fd.get("active") === "on",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(fd: FormData) {
    setBusy(true);
    try {
      await addInstrument({
        code: String(fd.get("code")).toUpperCase(),
        display_name: String(fd.get("display_name")),
        ticker: String(fd.get("ticker")),
        source_template: String(fd.get("source_template")),
        in_base_pack: fd.get("in_base_pack") === "on",
      });
      setShowAdd(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center font-bold text-white">A</div>
            <span className="font-semibold">DipBuy Admin</span>
          </div>
          <a href="/dashboard" className="text-sm text-brand-600 font-semibold">Back to dashboard</a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Total users</div>
            <div className="text-2xl font-semibold mt-1">{totalUsers}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Instruments in registry</div>
            <div className="text-2xl font-semibold mt-1">{instruments.length}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted uppercase tracking-wide">Instruments actively tracked by someone</div>
            <div className="text-2xl font-semibold mt-1">{Object.keys(trackerCounts).length}</div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Shared instrument registry — pricing sources (admin-only edit)</div>
            <button className="btn-secondary text-sm" onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Cancel" : "+ Add instrument"}</button>
          </div>

          {showAdd && (
            <form action={handleAdd} className="grid sm:grid-cols-2 gap-3 mb-6 p-4 bg-paper rounded-xl border border-border">
              <input name="code" placeholder="Code, e.g. TCS" required />
              <input name="display_name" placeholder="Display name, e.g. TCS" required />
              <input name="ticker" placeholder="Ticker" required />
              <input name="source_template" placeholder="Source URL with {MMDDYYYY}" required className="sm:col-span-2" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="in_base_pack" /> Include in default starter pack</label>
              <button className="btn-primary" disabled={busy}>Add</button>
            </form>
          )}

          <div className="grid grid-cols-[60px_1fr_1fr] gap-x-3 gap-y-1 text-xs text-muted px-1 mb-1">
            <span>Code</span><span>Name / Ticker</span><span>Source URL</span>
          </div>
          <div className="space-y-2">
            {instruments.map((i: any) => (
              <InstrumentRow key={i.code} instrument={i} count={trackerCounts[i.code] || 0} onSave={saveRow} busy={busy} />
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold mb-4">Users</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Age</th>
                <th className="py-2 pr-3">Income range</th>
                <th className="py-2 pr-3">OK to contact</th>
                <th className="py-2 pr-3">Tracking</th>
                <th className="py-2 pr-3 text-right">Total accrued</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="py-3">{u.display_name}</td>
                  <td className="py-3">
                    <select
                      defaultValue={u.role}
                      className="text-sm"
                      onChange={async (e) => { await setUserRole(u.id, e.target.value as any); router.refresh(); }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-3 text-muted">{u.phone || "—"}</td>
                  <td className="py-3 text-muted">{u.age ?? "—"}</td>
                  <td className="py-3 text-muted">{u.income_range || "—"}</td>
                  <td className="py-3 text-muted">{u.marketing_consent ? "Yes" : "No"}</td>
                  <td className="py-3">{u.trackedCount} instruments</td>
                  <td className="py-3 text-right font-medium">{fmt(u.totalAccrued)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InstrumentRow({ instrument, count, onSave, busy }: any) {
  return (
    <form
      className="grid grid-cols-[60px_1fr_1fr] gap-x-3 gap-y-2 items-center p-3 rounded-xl border border-border bg-paper"
      onSubmit={(e) => { e.preventDefault(); onSave(instrument.code, e.currentTarget); }}
    >
      <span className="font-mono text-xs text-muted">{instrument.code}</span>
      <div className="flex gap-2">
        <input name="display_name" defaultValue={instrument.display_name} className="text-xs" placeholder="Display name" />
        <input name="ticker" defaultValue={instrument.ticker} className="text-xs" placeholder="Ticker" />
      </div>
      <input name="source_template" defaultValue={instrument.source_template} className="text-xs" placeholder="Source URL" />

      <span></span>
      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-1"><input type="checkbox" name="in_base_pack" defaultChecked={instrument.in_base_pack} /> base pack</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={instrument.active} /> active</label>
        <span className="text-muted">{count} user{count === 1 ? "" : "s"} tracking</span>
      </div>
      <div className="flex justify-end">
        <button className="btn-secondary text-xs py-1 px-3" disabled={busy}>Save</button>
      </div>
    </form>
  );
}
