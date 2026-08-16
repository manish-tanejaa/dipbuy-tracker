"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addTrackedInstrument,
  removeTrackedInstrument,
  changeDailyAmount,
  addEntityLabel,
  removeEntityLabel,
  signOut,
} from "../actions";
import { createClient } from "@/utils/supabase/client";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function labelName(label: string | null | undefined) {
  return label && label.trim() ? label : "Personal";
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M11.3 1.3a1 1 0 0 1 1.4 0l2 2a1 1 0 0 1 0 1.4l-8 8-3.7 1 1-3.7 8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">{title}</div>
          <button className="text-muted hover:text-ink text-lg leading-none" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SetupClient({ profile, tracked, allInstruments, entityLabels, today }: any) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  async function handleTrackNew(formData: FormData) {
    setBusy(true);
    try {
      const code = String(formData.get("code"));
      const startDate = String(formData.get("start_date"));
      const amount = Number(formData.get("amount"));
      const label = String(formData.get("entity") || "") || null;
      await addTrackedInstrument(code, startDate, amount, label);
      setShowAdd(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleEditAmount(formData: FormData) {
    if (!editTarget) return;
    setBusy(true);
    try {
      const amount = Number(formData.get("amount"));
      const effective = String(formData.get("effective"));
      await changeDailyAmount(editTarget.instrument_code, effective, amount, editTarget.entity_label ?? null);
      setEditTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleStop(configId: string) {
    if (!window.confirm("Stop tracking this instrument? You can start again anytime from here.")) return;
    setBusy(true);
    try {
      await removeTrackedInstrument(configId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(formData: FormData) {
    setPasswordMsg(null);
    const newPassword = String(formData.get("new_password") || "");
    const confirmPassword = String(formData.get("confirm_password") || "");
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "err", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "Passwords don't match." });
      return;
    }
    setPasswordBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ type: "ok", text: "Password updated." });
    } catch (err: any) {
      setPasswordMsg({ type: "err", text: err.message || "Something went wrong." });
    } finally {
      setPasswordBusy(false);
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
          <div className="flex items-center gap-5 text-sm">
            <a href="/dashboard" className="text-muted hover:text-ink">Portfolio</a>
            <a href="/dashboard/setup" className="font-semibold text-ink border-b-2 border-brand-500 pb-1">Setup</a>
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {/* tracked instruments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Your tracked instruments</div>
            <button
              className="w-8 h-8 rounded-full bg-brand-500 text-white text-lg leading-none flex items-center justify-center hover:bg-brand-600"
              onClick={() => setShowAdd(true)}
              title="Track a new instrument"
            >
              +
            </button>
          </div>

          <div className="space-y-1">
            {tracked.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <span className="font-medium">{t.instrument?.display_name}</span>
                  {t.entity_label && (
                    <span className="ml-2 text-xs text-muted bg-paper border border-border rounded-full px-2 py-0.5 align-middle">
                      {t.entity_label}
                    </span>
                  )}
                  <span className="text-muted ml-2">{fmt(t.daily_amount)}/day</span>
                  <span className="text-muted ml-2 text-xs">· effective from {t.start_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:border-ink"
                    onClick={() => setEditTarget(t)}
                    title="Edit daily amount"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="w-7 h-7 rounded-lg border border-down text-down flex items-center justify-center hover:bg-red-50"
                    onClick={() => handleStop(t.id)}
                    title="Stop tracking"
                    disabled={busy}
                  >
                    <StopIcon />
                  </button>
                </div>
              </div>
            ))}
            {tracked.length === 0 && (
              <div className="text-sm text-muted py-6 text-center">Not tracking anything yet — tap + to start.</div>
            )}
          </div>
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

        {/* change password */}
        <div className="card p-5">
          <button className="text-sm font-semibold flex items-center gap-2 w-full text-left" onClick={() => { setShowChangePassword(!showChangePassword); setPasswordMsg(null); }}>
            {showChangePassword ? "▾" : "▸"} Change your password
          </button>
          {showChangePassword && (
            <form action={handleChangePassword} className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">New password</label>
                <input type="password" name="new_password" minLength={6} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Confirm new password</label>
                <input type="password" name="confirm_password" minLength={6} required />
              </div>
              {passwordMsg && (
                <div className={"sm:col-span-2 text-sm rounded-lg px-3 py-2 border " + (passwordMsg.type === "ok" ? "text-brand-700 bg-brand-50 border-brand-100" : "text-down bg-red-50 border-red-100")}>
                  {passwordMsg.text}
                </div>
              )}
              <div className="sm:col-span-2 flex justify-end">
                <button className="btn-primary" disabled={passwordBusy}>Update password</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* track new instrument modal */}
      {showAdd && (
        <Modal title="Track a new instrument" onClose={() => setShowAdd(false)}>
          <form action={handleTrackNew} className="space-y-3">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Daily amount</label>
                <input type="number" name="amount" defaultValue={1000} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Start date</label>
                <input type="date" name="start_date" defaultValue={today} required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy}>Start tracking</button>
          </form>
        </Modal>
      )}

      {/* edit daily amount modal */}
      {editTarget && (
        <Modal title={`Edit daily amount — ${editTarget.instrument?.display_name}`} onClose={() => setEditTarget(null)}>
          <form action={handleEditAmount} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">New daily amount</label>
              <input type="number" name="amount" defaultValue={editTarget.daily_amount} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Effective from</label>
              <input type="date" name="effective" defaultValue={today} required />
            </div>
            <div className="text-xs text-muted">Past amounts stay in your history — this only changes what accrues going forward.</div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addTrackedInstrument,
  removeTrackedInstrument,
  changeDailyAmount,
  addEntityLabel,
  removeEntityLabel,
  signOut,
} from "../actions";
import { createClient } from "@/utils/supabase/client";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function labelName(label: string | null | undefined) {
  return label && label.trim() ? label : "Personal";
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M11.3 1.3a1 1 0 0 1 1.4 0l2 2a1 1 0 0 1 0 1.4l-8 8-3.7 1 1-3.7 8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">{title}</div>
          <button className="text-muted hover:text-ink text-lg leading-none" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SetupClient({ profile, tracked, allInstruments, entityLabels, today }: any) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  async function handleTrackNew(formData: FormData) {
    setBusy(true);
    try {
      const code = String(formData.get("code"));
      const startDate = String(formData.get("start_date"));
      const amount = Number(formData.get("amount"));
      const label = String(formData.get("entity") || "") || null;
      await addTrackedInstrument(code, startDate, amount, label);
      setShowAdd(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleEditAmount(formData: FormData) {
    if (!editTarget) return;
    setBusy(true);
    try {
      const amount = Number(formData.get("amount"));
      const effective = String(formData.get("effective"));
      await changeDailyAmount(editTarget.instrument_code, effective, amount, editTarget.entity_label ?? null);
      setEditTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleStop(configId: string) {
    if (!window.confirm("Stop tracking this instrument? You can start again anytime from here.")) return;
    setBusy(true);
    try {
      await removeTrackedInstrument(configId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(formData: FormData) {
    setPasswordMsg(null);
    const newPassword = String(formData.get("new_password") || "");
    const confirmPassword = String(formData.get("confirm_password") || "");
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "err", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "Passwords don't match." });
      return;
    }
    setPasswordBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ type: "ok", text: "Password updated." });
    } catch (err: any) {
      setPasswordMsg({ type: "err", text: err.message || "Something went wrong." });
    } finally {
      setPasswordBusy(false);
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
          <div className="flex items-center gap-5 text-sm">
            <a href="/dashboard" className="text-muted hover:text-ink">Portfolio</a>
            <a href="/dashboard/setup" className="font-semibold text-ink border-b-2 border-brand-500 pb-1">Setup</a>
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {/* tracked instruments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Your tracked instruments</div>
            <button
              className="w-8 h-8 rounded-full bg-brand-500 text-white text-lg leading-none flex items-center justify-center hover:bg-brand-600"
              onClick={() => setShowAdd(true)}
              title="Track a new instrument"
            >
              +
            </button>
          </div>

          <div className="space-y-1">
            {tracked.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <span className="font-medium">{t.instrument?.display_name}</span>
                  {t.entity_label && (
                    <span className="ml-2 text-xs text-muted bg-paper border border-border rounded-full px-2 py-0.5 align-middle">
                      {t.entity_label}
                    </span>
                  )}
                  <span className="text-muted ml-2">{fmt(t.daily_amount)}/day</span>
                  <span className="text-muted ml-2 text-xs">· effective from {t.start_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:border-ink"
                    onClick={() => setEditTarget(t)}
                    title="Edit daily amount"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="w-7 h-7 rounded-lg border border-down text-down flex items-center justify-center hover:bg-red-50"
                    onClick={() => handleStop(t.id)}
                    title="Stop tracking"
                    disabled={busy}
                  >
                    <StopIcon />
                  </button>
                </div>
              </div>
            ))}
            {tracked.length === 0 && (
              <div className="text-sm text-muted py-6 text-center">Not tracking anything yet — tap + to start.</div>
            )}
          </div>
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

        {/* change password */}
        <div className="card p-5">
          <button className="text-sm font-semibold flex items-center gap-2 w-full text-left" onClick={() => { setShowChangePassword(!showChangePassword); setPasswordMsg(null); }}>
            {showChangePassword ? "▾" : "▸"} Change your password
          </button>
          {showChangePassword && (
            <form action={handleChangePassword} className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">New password</label>
                <input type="password" name="new_password" minLength={6} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Confirm new password</label>
                <input type="password" name="confirm_password" minLength={6} required />
              </div>
              {passwordMsg && (
                <div className={"sm:col-span-2 text-sm rounded-lg px-3 py-2 border " + (passwordMsg.type === "ok" ? "text-brand-700 bg-brand-50 border-brand-100" : "text-down bg-red-50 border-red-100")}>
                  {passwordMsg.text}
                </div>
              )}
              <div className="sm:col-span-2 flex justify-end">
                <button className="btn-primary" disabled={passwordBusy}>Update password</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* track new instrument modal */}
      {showAdd && (
        <Modal title="Track a new instrument" onClose={() => setShowAdd(false)}>
          <form action={handleTrackNew} className="space-y-3">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Daily amount</label>
                <input type="number" name="amount" defaultValue={1000} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Start date</label>
                <input type="date" name="start_date" defaultValue={today} required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy}>Start tracking</button>
          </form>
        </Modal>
      )}

      {/* edit daily amount modal */}
      {editTarget && (
        <Modal title={`Edit daily amount — ${editTarget.instrument?.display_name}`} onClose={() => setEditTarget(null)}>
          <form action={handleEditAmount} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">New daily amount</label>
              <input type="number" name="amount" defaultValue={editTarget.daily_amount} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Effective from</label>
              <input type="date" name="effective" defaultValue={today} required />
            </div>
            <div className="text-xs text-muted">Past amounts stay in your history — this only changes what accrues going forward.</div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
