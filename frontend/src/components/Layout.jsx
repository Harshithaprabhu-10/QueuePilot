import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Wordmark({ light = false }) {
  return (
    <span className={`font-display text-xl font-black tracking-tight ${light ? 'text-ivory' : 'text-charcoal'}`}>
      Queue<span className={light ? 'text-amber' : 'text-forest'}>Pilot</span>
    </span>
  );
}

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/queues', label: 'My queues' },
  { to: '/history', label: 'Token history' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-2">
            <Wordmark />
            <nav className="flex gap-6">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end}
                  className={({ isActive }) => `border-b-2 pb-0.5 text-sm font-medium transition-colors ${isActive ? 'border-forest text-charcoal' : 'border-transparent text-charcoal/60 hover:text-charcoal'}`}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-charcoal/60 sm:inline">{user?.name}</span>
            <button className="btn-ghost" onClick={() => { logout(); navigate('/login'); }}>
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10"><Outlet /></main>
    </div>
  );
}
