import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { EmptyState, ErrorNote, PageHeader, Spinner } from '../components/ui';

export default function Queues() {
  const toast = useToast();
  const [queues, setQueues] = useState(null);
  const [form, setForm] = useState({ name: '', counter: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.queues().then((r) => setQueues(r.queues)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { queue } = await api.createQueue(form);
      toast.success(`Created ${queue.name}`);
      setForm({ name: '', counter: '' });
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async (q) => {
    if (!window.confirm(`Delete "${q.name}" and all of its tokens? This cannot be undone.`)) return;
    try { await api.deleteQueue(q.id); toast.success('Queue deleted'); load(); } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <PageHeader title="My queues" subtitle="Each queue has its own tokens, counter and public display board." />
      <form onSubmit={create} className="mb-10 grid gap-3 border border-charcoal/20 bg-white/40 p-5 shadow-soft sm:grid-cols-[2fr_1.4fr_auto] sm:items-end">
        <div><label className="label" htmlFor="qname">Queue name</label>
          <input id="qname" required maxLength={80} className="input" placeholder="e.g. Passport services" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="qcounter">Counter</label>
          <input id="qcounter" maxLength={40} className="input" placeholder="e.g. Counter 3" value={form.counter} onChange={(e) => setForm({ ...form, counter: e.target.value })} /></div>
        <button className="btn-primary" disabled={busy}><Plus size={16} /> Create queue</button>
        {error && <div className="sm:col-span-3"><ErrorNote message={error} /></div>}
      </form>

      {!queues && !error && <Spinner />}
      {queues && queues.length === 0 && <EmptyState title="No queues yet" text="Name your first queue above, then add people to it." />}
      {queues && queues.length > 0 && (
        <ul className="border-t border-charcoal/20">
          {queues.map((q) => (
            <li key={q.id} className="grid items-center gap-4 border-b border-charcoal/20 py-6 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <Link to={`/queues/${q.id}`} className="font-display text-2xl font-extrabold hover:text-forest">{q.name}</Link>
                <p className="text-sm text-charcoal/60">{q.counter} · Token prefix {q.prefix}</p>
              </div>
              <div className="flex gap-8">
                <div><p className="num font-display text-4xl font-black text-amber">{q.counts.waiting}</p><p className="text-xs text-charcoal/60">waiting</p></div>
                <div><p className="num font-display text-4xl font-black">{q.counts.serving}</p><p className="text-xs text-charcoal/60">serving</p></div>
                <div><p className="num font-display text-4xl font-black text-forest">{q.counts.completed}</p><p className="text-xs text-charcoal/60">completed</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/queues/${q.id}`} className="btn-primary">Manage</Link>
                <a href={`/display/${q.id}`} target="_blank" rel="noreferrer" className="btn-ghost" title="Open public display"><ExternalLink size={14} /> Display</a>
                <button className="btn-icon" onClick={() => remove(q)} aria-label={`Delete ${q.name}`}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
