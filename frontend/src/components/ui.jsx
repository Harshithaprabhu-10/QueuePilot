import { Loader2 } from 'lucide-react';

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center gap-2 py-10 text-sm text-charcoal/60"><Loader2 size={16} className="animate-spin" /> {label}</div>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/20 pb-6">
    <div>
      <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-xl text-charcoal/70">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

export const EmptyState = ({ title, text, children }) => (
  <div className="border border-dashed border-charcoal/30 px-6 py-12 text-center">
    <p className="font-display text-xl font-bold">{title}</p>
    {text && <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal/70">{text}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);

export const ErrorNote = ({ message }) =>
  message ? <p role="alert" className="border-l-4 border-amber bg-amber/15 px-3 py-2 text-sm">{message}</p> : null;

const STATUS_STYLE = {
  waiting: 'bg-amber/25 text-charcoal',
  serving: 'bg-charcoal text-ivory',
  completed: 'bg-forest text-ivory',
  cancelled: 'bg-sage text-charcoal/70 line-through',
};
export const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
);
