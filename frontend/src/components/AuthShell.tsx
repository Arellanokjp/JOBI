import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-aside">
        <Link to="/login" className="brand" style={{ padding: 0 }}><img src="/leaf.svg" alt="" />JOBI</Link>
        <div className="stack">
          <h1>Find work that fits. Hire people who stay.</h1>
          <ul>
            <li>Job seekers build one resume and apply with a single answer sheet per job.</li>
            <li>Employers get a verified company page and a clear queue of applicants.</li>
          </ul>
        </div>
        <span className="muted small">JOBI — jobs and hiring in one place</span>
      </div>
      <main className="auth-main">
        <div className="auth-card">
          <h2 style={{ fontSize: '1.7rem' }}>{title}</h2>
          {children}
        </div>
      </main>
    </div>
  );
}
