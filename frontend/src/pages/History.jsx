import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { fmtDateTime, fmtMinutes, minutesBetween } from '../lib/format';
import { EmptyState, ErrorNote, PageHeader, Spinner, StatusBadge } from '../components/ui';

const STATUSES = ['all', 'waiting', 'serving', 'completed', 'cancelled'];

export default function History() {
  const [params, setParams] = useSearchParams();
  const queueId = params.get('queueId') || '';
  const status = params.get('status') || 'all';
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [queues, setQueues] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.queues().then((r) => setQueues(r.queues)).catch((e) => setError(e.message)); }, []);
  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    setData(null);
    api.history({ queueId, status, search: debounced, page }).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message));
  }, [queueId, status, debounced, page]);

  const setFilter = (k, v) => { const p = new URLSearchParams(params); v && v !== 'all' ? p.set(k, v) : p.delete(k); setParams(p); setPage(1); };

  return (
    <>
      <PageHeader title="Token history" subtitle="Every token ever issued, with its full timeline." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="hq">Queue</label>
          <select id="hq" className="input" value={queueId} onChange={(e) => setFilter('queueId', e.target.value)}>
            <option value="">All queues</option>{queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select></div>
        <div><label className="label" htmlFor="hs">Status</label>
          <select id="hs" className="input capitalize" value={status} onChange={(e) => setFilter('status', e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div><label className="label" htmlFor="hn">Search name or token</label>
          <input id="hn" className="input" placeholder="e.g. Meera or P-014" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <ErrorNote message={error} />
      {!data && !error && <Spinner />}
      {data && data.tokens.length === 0 && <EmptyState title="No tokens match" text="Try a different queue, status or search." />}
      {data && data.tokens.length > 0 && (
        <>
          <div className="overflow-x-auto border-y border-charcoal/30">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-charcoal/30 text-charcoal/60">
                <tr>{['Token', 'Name', 'Queue', 'Status', 'Created', 'Called', 'Finished', 'Waited'].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.tokens.map((t) => (
                  <tr key={t.id} className="border-b border-charcoal/10 hover:bg-sage/40">
                    <td className="num px-3 py-3 font-display text-lg font-extrabold">{t.code}</td>
                    <td className="px-3 py-3">{t.name}</td>
                    <td className="px-3 py-3 text-charcoal/70">{t.queue?.name || 'Deleted'}</td>
                    <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                    <td className="num px-3 py-3">{fmtDateTime(t.createdAt)}</td>
                    <td className="num px-3 py-3">{fmtDateTime(t.calledAt)}</td>
                    <td className="num px-3 py-3">{fmtDateTime(t.completedAt || t.cancelledAt)}</td>
                    <td className="num px-3 py-3">{fmtMinutes(minutesBetween(t.createdAt, t.calledAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-charcoal/60">{data.total} tokens · page {data.page} of {data.pages}</p>
            <div className="flex gap-2">
              <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
