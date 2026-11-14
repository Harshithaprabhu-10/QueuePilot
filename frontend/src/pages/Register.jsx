import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { ErrorNote } from '../components/ui';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setBusy(true);
    try { await register(form); navigate('/queues', { replace: true }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create account" subtitle="Set up a manager account and start your first queue.">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={error} />
        <div><label className="label" htmlFor="name">Your name</label>
          <input id="name" required autoComplete="name" className="input" value={form.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={set('email')} /></div>
        <div><label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} autoComplete="new-password" className="input" value={form.password} onChange={set('password')} />
          <p className="mt-1 text-xs text-charcoal/60">At least 6 characters.</p></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-sm text-charcoal/70">Already registered? <Link to="/login" className="font-semibold text-forest underline">Sign in</Link></p>
    </AuthShell>
  );
}
