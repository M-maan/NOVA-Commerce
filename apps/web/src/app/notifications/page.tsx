'use client';
import { useEffect, useState } from 'react';
import { notificationsApi, Notification } from '@/lib/api/notifications.api';

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState({ emailEnabled: true, notificationEnabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([notificationsApi.list(), notificationsApi.preferences()])
      .then(([notifications, prefs]) => { setItems(notifications); setPreferences({ emailEnabled: prefs.emailEnabled, notificationEnabled: prefs.notificationEnabled }); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  async function markRead(id: string) { try { await notificationsApi.read(id); setItems((all) => all.map((item) => item.id === id ? { ...item, readStatus: true } : item)); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update notification'); } }
  async function updatePreference(key: 'emailEnabled' | 'notificationEnabled', value: boolean) {
    const next = { ...preferences, [key]: value }; setPreferences(next); setSaving(true); setError('');
    try { await notificationsApi.updatePreferences(next); } catch (e) { setPreferences(preferences); setError(e instanceof Error ? e.message : 'Unable to save preferences'); } finally { setSaving(false); }
  }
  return <main className="mx-auto max-w-3xl px-4 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Account</p><h1 className="text-3xl font-bold">Notifications</h1></div><span className="text-sm text-muted-foreground">{items.filter((item) => !item.readStatus).length} unread</span></div>
    {error && <p role="alert" className="mt-4 rounded border border-red-300 p-3 text-red-600">{error}</p>}
    <section className="mt-6 rounded-xl border p-5"><h2 className="font-semibold">Notification preferences</h2><p className="mt-1 text-sm text-muted-foreground">Choose how NOVA keeps you informed.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-lg bg-muted/40 p-3"><input type="checkbox" checked={preferences.notificationEnabled} disabled={saving} onChange={(e) => updatePreference('notificationEnabled', e.target.checked)} />In-app notifications</label><label className="flex items-center gap-3 rounded-lg bg-muted/40 p-3"><input type="checkbox" checked={preferences.emailEnabled} disabled={saving} onChange={(e) => updatePreference('emailEnabled', e.target.checked)} />Email notifications</label></div></section>
    {loading ? <p className="mt-6 text-muted-foreground" aria-live="polite">Loading notifications…</p> : items.length ? <div className="mt-6 space-y-3">{items.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.readStatus ? 'opacity-70' : 'border-primary/50'}`}><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-sm text-muted-foreground">{item.message}</p></div>{!item.readStatus && <button onClick={() => markRead(item.id)} className="text-sm text-primary underline">Mark read</button>}</div></article>)}</div> : <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-muted-foreground">You have no notifications.</div>}</main>;
}
