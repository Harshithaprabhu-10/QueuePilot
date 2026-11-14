import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, ExternalLink, History as HistoryIcon, Megaphone, UserPlus, X } from 'lucide-react';
import { api } from '../lib/api';
import { fmtMinutes, fmtTime, minutesBetween } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { EmptyState, ErrorNote, Spinner } from '../components/ui';

export default function QueueDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [queue, setQueue] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const [q, t] = await Promise.all([api.queue(id), api.tokens(id)]);
      setQueue(q.queue); setTokens(t.tokens); setError('');
    } catch (e) { setError(e.message); }
  }, [id]);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  // Runs an API action, then refreshes the list. Errors surface as toasts.
  const act = async (fn, okMessage) => {
    setBusy(true);
    try { const r = await fn(); if (okMessage) toast.success(typeof okMessage === 'function' ? okMessage(r) : okMessage); } catch (e) { toast.error(e.message); }
    await load(); setBusy(false);
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await act(() => api.addToken(id, name.trim()), (r) => `${r.token.code} issued to ${r.token.name}`);
    setName('');
  };

  if (!queue && error) return <ErrorNote message={error} />;
  if (!queue) return <Spinner />;

  const waiting = tokens.filter((t) => t.status === 'waiting');
  const serving = tokens.filter((t) => t.status === 'serving');

  return (
    <>
      <Link to="/queues" className="text-sm text-charcoal/60 hover:text-charcoal">← My queues</Link>
      <div className="mb-8 mt-2 flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/20 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">{queue.name}</h1>
          <p className="mt-2 text-charcoal/70">{queue.counter} · {queue.counts.completed} completed · {queue.counts.cancelled} cancelled</p>
        </div>
        <div className="flex gap-2">
          <a href={`/display/${id}`} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink size={14} /> Open display</a>
          <Link to={`/history?queueId=${id}`} className="btn-ghost"><HistoryIcon size={14} /> History</Link>
        </div>
      </div>
      <ErrorNote message={error} />

      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-8">
          <form onSubmit={add}>
            <label className="label" htmlFor="pname">Add a person</label>
            <input id="pname" className="input" maxLength={80} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-primary mt-3 w-full" disabled={busy || !name.trim()}><UserPlus size={16} /> Issue token</button>
          </form>
          <button className="btn-amber w-full !py-4 !text-base" disabled={busy || waiting.length === 0}
            onClick={() => act(() => api.callNext(id), (r) => `Now serving ${r.token.code}`)}>
            <Megaphone size={18} /> Call next{waiting[0] ? ` (${waiting[0].code})` : ''}
          </button>
        </aside>

        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-xl font-bold">Now serving</h2>
            {serving.length === 0 ? <p className="border border-dashed border-charcoal/30 px-4 py-6 text-sm text-charcoal/60">No one is being served. Call the next person when the counter is free.</p> : (
              <ul className="border-t border-charcoal">
                {serving.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-charcoal/20 bg-charcoal px-5 py-4 text-ivory">
                    <div className="flex items-baseline gap-5">
                      <span className="num font-display text-5xl font-black text-amber">{t.code}</span>
                      <span className="text-lg">{t.name}</span>
                      <span className="text-sm text-sage/70">called {fmtTime(t.calledAt)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn border-forest bg-forest text-ivory hover:bg-ivory hover:text-forest" disabled={busy} onClick={() => act(() => api.completeToken(t.id), `${t.code} completed`)}><Check size={14} /> Complete</button>
                      <button className="btn border-sage/50 text-ivory hover:bg-ivory hover:text-charcoal" disabled={busy} onClick={() => act(() => api.cancelToken(t.id), `${t.code} cancelled`)}><X size={14} /> Cancel</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">Waiting <span className="num text-charcoal/50">({waiting.length})</span></h2>
            {waiting.length === 0 ? <EmptyState title="Nobody is waiting" text="Add a person to issue the first token." /> : (
              <ul className="border-t border-charcoal">
                {waiting.map((t, i) => (
                  <li key={t.id} className="grid grid-cols-[2rem_auto_1fr_auto] items-center gap-x-4 gap-y-2 border-b border-charcoal/20 py-3">
                    <span className="num text-sm text-charcoal/50" title="Position">{t.position}</span>
                    <span className="num font-display text-3xl font-black text-amber">{t.code}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.name}</p>
                      <p className="text-xs text-charcoal/60">Joined {fmtTime(t.createdAt)} · waiting {fmtMinutes(minutesBetween(t.createdAt, now))}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="btn-icon" disabled={busy || i === 0} onClick={() => act(() => api.moveToken(t.id, 'up'))} aria-label={`Move ${t.code} up`}><ArrowUp size={14} /></button>
                      <button className="btn-icon" disabled={busy || i === waiting.length - 1} onClick={() => act(() => api.moveToken(t.id, 'down'))} aria-label={`Move ${t.code} down`}><ArrowDown size={14} /></button>
                      <button className="btn-icon" disabled={busy} onClick={() => act(() => api.cancelToken(t.id), `${t.code} cancelled`)} aria-label={`Cancel ${t.code}`}><X size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
