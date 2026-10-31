export const humanize = (value?: string | null) =>
  value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ') : '';

export const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const fmtDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

/** Decimal columns arrive as strings, e.g. "50000.00". */
export function fmtSalary(min?: string | null, max?: string | null, currency?: string | null) {
  const n = (v: string) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const c = currency ?? '';
  if (min && max) return `${c} ${n(min)} – ${n(max)}`.trim();
  if (min) return `From ${c} ${n(min)}`.trim();
  if (max) return `Up to ${c} ${n(max)}`.trim();
  return '';
}

export const fullName = (p?: { first_name: string; last_name: string } | null) =>
  p ? `${p.first_name} ${p.last_name}` : '';

/** Value for <input type="datetime-local"> in the user's timezone. */
export const toLocalInput = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const dateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
