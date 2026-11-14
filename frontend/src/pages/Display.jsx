import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Wordmark } from '../components/Layout';

// Public page: no login required. Refreshes itself every 3 seconds.
export default function Display() {
  const { queueId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    let alive = true;
    const load = () => api.publicQueue(queueId).then((d) => { if (alive) { setData(d); setError(''); } }).catch((e) => alive && setError(e.message));
    load();
    const poll = setInterval(load, 3000);
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, [queueId]);

  if (error && !data) {
    return <div className="flex min-h-screen items-center justify-center bg-charcoal p-8 text-center text-sage"><p className="font-display text-3xl font-bold">{error}</p></div>;
  }
  if (!data) return <div className="min-h-screen bg-charcoal p-8 text-sage">Loading…</div>;

  const current = data.serving[0];
  const others = data.serving.slice(1);

  return (
    <div className="flex min-h-screen flex-col bg-charcoal text-ivory">
      <header className="flex items-center justify-between border-b border-sage/20 px-6 py-4 sm:px-10">
        <div className="flex items-center gap-6"><Wordmark light /><span className="hidden text-sage/70 sm:inline">{data.queue.name}</span></div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-sm text-sage"><span className="live-dot h-2 w-2 rounded-full bg-amber" /> Live</span>
          <span className="num font-display text-2xl font-bold">{clock.toLocaleTimeString('en-GB')}</span>
        </div>
      </header>

      <main className="grid flex-1 lg:grid-cols-[3fr_2fr]">
        <section className="flex flex-col justify-center border-b border-sage/20 px-6 py-12 sm:px-10 lg:border-b-0 lg:border-r">
          <p className="inline-block self-start bg-amber px-3 py-1 text-sm font-extrabold tracking-widest text-charcoal">NOW SERVING</p>
          {current ? (
            <div key={current.code} className="flip-in">
              <p className="num font-display font-black leading-none text-amber" style={{ fontSize: 'clamp(6rem, 22vw, 18rem)' }}>{current.code}</p>
              <p className="mt-4 font-display text-4xl font-bold sm:text-5xl">{current.name}</p>
              <p className="mt-2 text-2xl text-sage">Please go to <span className="font-bold text-ivory">{current.counter}</span></p>
            </div>
          ) : (
            <p className="mt-8 font-display text-5xl font-bold text-sage/70">No one is being served right now</p>
          )}
          {others.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-t border-sage/20 pt-4 text-sage">
              {others.map((o) => <span key={o.code} className="num text-xl"><span className="font-bold text-ivory">{o.code}</span> · {o.counter}</span>)}
            </div>
          )}
        </section>

        <section className="px-6 py-12 sm:px-10">
          <div className="flex items-baseline justify-between">
            <p className="inline-block bg-sage px-3 py-1 text-sm font-extrabold tracking-widest text-charcoal">WAITING</p>
            <p className="text-sage"><span className="num font-bold text-ivory">{data.waitingCount}</span> in line</p>
          </div>
          {data.next.length === 0 ? <p className="mt-8 text-xl text-sage/70">The line is empty.</p> : (
            <ul className="mt-4 border-t border-sage/30">
              {data.next.map((t) => (
                <li key={t.code} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-b border-sage/20 py-4">
                  <span className="num text-lg text-sage/60">{t.position}</span>
                  <span className="num font-display text-5xl font-black">{t.code}</span>
                  <span className="truncate text-lg text-sage">{t.name}</span>
                </li>
              ))}
            </ul>
          )}
          {data.waitingCount > data.next.length && <p className="mt-4 text-sage/70">+ {data.waitingCount - data.next.length} more</p>}
        </section>
      </main>
    </div>
  );
}
