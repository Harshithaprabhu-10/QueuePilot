import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { fmtMinutes } from '../lib/format';
import { EmptyState, ErrorNote, PageHeader, Spinner } from '../components/ui';

const C = { forest: '#315B48', amber: '#D6A442', sage: '#D9DED5', charcoal: '#202322' };
const tick = { fontSize: 12, fill: 'rgba(32,35,34,0.65)' };
const tip = { contentStyle: { background: C.charcoal, border: 'none', color: '#F5F2E9', fontSize: 12 }, itemStyle: { color: '#F5F2E9' }, labelStyle: { color: C.sage } };

function Stat({ label, value, hint, color }) {
  return (
    <div className="border-charcoal/20 px-5 py-6 sm:border-l first:border-l-0">
      <p className="text-sm text-charcoal/70">{label}</p>
      <p className={`num mt-2 font-display text-6xl font-black leading-none ${color || ''}`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-charcoal/60">{hint}</p>}
    </div>
  );
}

const ChartBlock = ({ title, note, children }) => (
  <section className="border border-charcoal/20 bg-white/40 p-5 shadow-soft">
    <h2 className="text-lg font-bold">{title}</h2>
    <p className="mb-4 text-sm text-charcoal/60">{note}</p>
    <div className="h-64">{children}</div>
  </section>
);

export default function Dashboard() {
  const [queues, setQueues] = useState([]);
  const [queueId, setQueueId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.queues().then((r) => setQueues(r.queues)).catch((e) => setError(e.message)); }, []);

  const load = useCallback(() => {
    api.analytics(queueId).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message));
  }, [queueId]);
  useEffect(() => { setData(null); load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const s = data?.summary;
  const outcomeTotal = data ? data.outcome.completed + data.outcome.cancelled : 0;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
        <label className="sr-only" htmlFor="qsel">Queue</label>
        <select id="qsel" className="input !w-56" value={queueId} onChange={(e) => setQueueId(e.target.value)}>
          <option value="">All queues</option>
          {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
      </PageHeader>
      <ErrorNote message={error} />
      {!data && !error && <Spinner />}
      {data && (
        <>
          {queues.length === 0 && (
            <div className="mb-8"><EmptyState title="No queues yet" text="Create a queue and add people to see live numbers here.">
              <Link to="/queues" className="btn-primary">Create a queue</Link></EmptyState></div>
          )}
          <div className="grid grid-cols-2 border-y border-charcoal/20 lg:grid-cols-6">
            <Stat label="Tokens today" value={s.totalToday} />
            <Stat label="Waiting now" value={s.waiting} color="text-amber" />
            <Stat label="Serving now" value={s.serving} />
            <Stat label="Completed today" value={s.completedToday} color="text-forest" />
            <Stat label="Cancelled today" value={s.cancelledToday} />
            <Stat label="Average wait today" value={s.avgWaitMinutes === null ? '–' : fmtMinutes(Math.round(s.avgWaitMinutes))} hint={s.avgWaitAllTimeMinutes !== null ? `All time: ${fmtMinutes(Math.round(s.avgWaitAllTimeMinutes))}` : 'No one called yet'} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <ChartBlock title="Queue length" note="People waiting at the end of each of the last 12 hours">
              <ResponsiveContainer>
                <AreaChart data={data.trend} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid stroke="rgba(32,35,34,0.1)" vertical={false} />
                  <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval={1} />
                  <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} formatter={(v) => [v, 'Waiting']} />
                  <Area type="monotone" dataKey="length" stroke={C.amber} strokeWidth={2.5} fill={C.amber} fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartBlock>
            <ChartBlock title="Daily token activity" note="Tokens created and completed, last 7 days">
              <ResponsiveContainer>
                <BarChart data={data.daily} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid stroke="rgba(32,35,34,0.1)" vertical={false} />
                  <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} cursor={{ fill: 'rgba(32,35,34,0.05)' }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="created" name="Created" fill={C.sage} stroke={C.charcoal} strokeOpacity={0.25} />
                  <Bar dataKey="completed" name="Completed" fill={C.forest} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
          </div>

          <div className="mt-6">
            <ChartBlock title="Completed versus cancelled" note="All tokens that have finished">
              {outcomeTotal === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-charcoal/60">Nothing completed or cancelled yet.</p>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={[{ name: 'Completed', value: data.outcome.completed }, { name: 'Cancelled', value: data.outcome.cancelled }]}
                      dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                      <Cell fill={C.forest} /><Cell fill={C.charcoal} />
                    </Pie>
                    <Tooltip {...tip} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartBlock>
          </div>
        </>
      )}
    </>
  );
}
