import { Wordmark } from './Layout';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[5fr_6fr]">
      <aside className="hidden flex-col justify-between bg-charcoal p-12 text-ivory lg:flex">
        <Wordmark light />
        <div>
          <p className="text-sm text-sage/70">Now serving</p>
          <p className="num font-display text-[9rem] font-black leading-none text-amber">A-042</p>
          <p className="mt-6 max-w-sm text-lg text-sage">Call the next person, keep the line fair, and show everyone where they stand.</p>
        </div>
        <p className="text-sm text-sage/60">Queue management for counters, clinics and service desks.</p>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Wordmark /></div>
          <h1 className="text-4xl font-extrabold">{title}</h1>
          <p className="mb-8 mt-2 text-charcoal/70">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
