import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { humanize } from '../lib/format';

export function Button({
  variant = 'primary', busy, children, disabled, className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger'; busy?: boolean }) {
  return (
    <button className={`btn btn-${variant}${className ? ` ${className}` : ''}`} disabled={disabled || busy} {...rest}>
      {busy ? 'Working…' : children}
    </button>
  );
}

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  return message ? <p className="form-error" role="alert">{message}</p> : null;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <p className="loading" role="status">{label}</p>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="note note-error" role="alert">
      <span>{message}</span>
      {onRetry && <Button variant="ghost" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = 'green' | 'amber' | 'red' | 'grey';
const TONES: Record<string, Tone> = {
  APPROVED: 'green', PUBLISHED: 'green', ACTIVE: 'green', HIRED: 'green', OFFERED: 'green', COMPLETED: 'green',
  SHORTLISTED: 'green', SCHEDULED: 'green', INTERVIEW_SCHEDULED: 'green',
  PENDING: 'amber', DRAFT: 'amber', SUBMITTED: 'amber', UNDER_REVIEW: 'amber',
  REJECTED: 'red', SUSPENDED: 'red', CANCELLED: 'red', NO_SHOW: 'red',
  CLOSED: 'grey', WITHDRAWN: 'grey', INACTIVE: 'grey',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${TONES[status] ?? 'grey'}`}>{humanize(status)}</span>;
}

export function Seal({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span className="seal" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={value === tab.id} className={`tab${value === tab.id ? ' tab-on' : ''}`} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** A destructive action that asks once before running. */
export function ConfirmButton({ label, message, onConfirm, variant = 'danger' }: {
  label: string; message: string; onConfirm: () => void | Promise<void>; variant?: 'ghost' | 'danger';
}) {
  return (
    <Button variant={variant} onClick={() => { if (window.confirm(message)) void onConfirm(); }}>
      {label}
    </Button>
  );
}
