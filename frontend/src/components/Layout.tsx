import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fullName } from '../lib/format';
import type { Role } from '../lib/types';
import { Button, Loading } from './ui';

interface NavItem { to: string; label: string; badge?: boolean }

const NAV: Record<Role, NavItem[]> = {
  JOB_SEEKER: [
    { to: '/jobs', label: 'Find jobs' },
    { to: '/applications', label: 'My applications' },
    { to: '/saved', label: 'Saved jobs' },
    { to: '/resume', label: 'My resume' },
    { to: '/interviews', label: 'Interviews' },
    { to: '/notifications', label: 'Notifications', badge: true },
    { to: '/profile', label: 'Profile' },
  ],
  EMPLOYER: [
    { to: '/my-jobs', label: 'My jobs' },
    { to: '/applicants', label: 'Applicants' },
    { to: '/interviews', label: 'Interviews' },
    { to: '/company', label: 'Company' },
    { to: '/notifications', label: 'Notifications', badge: true },
    { to: '/profile', label: 'Profile' },
  ],
  ADMIN: [
    { to: '/admin/companies', label: 'Company reviews' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/catalog', label: 'Categories & skills' },
    { to: '/admin/audit', label: 'Audit log' },
    { to: '/notifications', label: 'Notifications', badge: true },
    { to: '/profile', label: 'Profile' },
  ],
};

export function Layout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => setOpen(false), [location.pathname]);

  // Keep the unread badge fresh (on navigation and every minute).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () =>
      api.get<{ unread: number }>('/notifications/unread-count')
        .then((r) => !cancelled && setUnread(r.unread))
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener('jobi:notifications', load);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('jobi:notifications', load); };
  }, [user, location.pathname]);

  if (loading) return <Loading label="Signing you in…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  return (
    <div className="shell">
      <aside className={`rail${open ? ' open' : ''}`}>
        <NavLink to="/" className="brand"><img src="/leaf.svg" alt="" />JOBI</NavLink>
        <nav className="nav" aria-label="Main">
          {NAV[user.role].map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
              {item.badge && unread > 0 && <span className="nav-count">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="rail-foot">
          <div>
            <strong>{fullName(user)}</strong>
            <span className="muted small">{user.role === 'JOB_SEEKER' ? 'Job seeker' : user.role === 'EMPLOYER' ? 'Employer' : 'Administrator'}</span>
          </div>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
        </div>
      </aside>
      <div>
        <Button variant="ghost" className="menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Open menu">Menu</Button>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
