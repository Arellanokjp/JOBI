import { useState } from 'react';
import { EntryModal, type FieldSpec } from '../../components/EntryModal';
import { useToast } from '../../components/toast';
import { Button, ConfirmButton, Empty, ErrorNote, Field, Loading, PageHeader, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, fullName, humanize } from '../../lib/format';
import { errorMessage, useAsync, useForm } from '../../lib/hooks';
import type { AdminUser } from '../../lib/types';

const PAGE = 25;
const ROLES = ['JOB_SEEKER', 'EMPLOYER', 'ADMIN'];
const STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];
const opts = (list: string[]) => list.map((v) => ({ value: v, label: humanize(v) }));

const BASE: FieldSpec[] = [
  { name: 'first_name', label: 'First name', required: true },
  { name: 'last_name', label: 'Last name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone_number', label: 'Phone', required: true },
  { name: 'role', label: 'Role', type: 'select', required: true, options: opts(ROLES) },
  { name: 'account_status', label: 'Account status', type: 'select', required: true, options: opts(STATUSES) },
  { name: 'email_verified', label: 'Email is verified', type: 'checkbox' },
];

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const notify = useToast();
  const filters = useForm({ q: '', role: '', account_status: '' });
  const [applied, setApplied] = useState(filters.values);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<null | { user?: AdminUser }>(null);
  const list = useAsync(() => api.get<AdminUser[]>('/admin', { ...applied, page, limit: PAGE }), [applied, page]);

  const remove = async (u: AdminUser) => {
    try { await api.del(`/admin/${u.id}`); notify('User deleted.'); list.reload(); }
    catch (err) { notify(errorMessage(err), 'error'); }
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Manage accounts, roles and access." actions={<Button onClick={() => setDialog({})}>Add user</Button>} />
      <form className="filters" onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(filters.values); }}>
        <Field label="Search"><input placeholder="Name, email or phone" {...filters.bind('q')} /></Field>
        <Field label="Role"><select {...filters.bind('role')}><option value="">Any</option>{opts(ROLES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        <Field label="Status"><select {...filters.bind('account_status')}><option value="">Any</option>{opts(STATUSES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        <Button type="submit">Filter</Button>
      </form>

      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="No users match" />}
      {list.data && list.data.length > 0 && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
            <tbody>
              {list.data.map((u) => (
                <tr key={u.id}>
                  <td><strong>{fullName(u)}</strong><br /><span className="muted small">{u.email}{u.email_verified ? '' : ' (unverified)'}</span></td>
                  <td>{humanize(u.roles.name)}</td>
                  <td><StatusBadge status={u.account_status} /></td>
                  <td>{u.last_login_at ? fmtDate(u.last_login_at) : '—'}</td>
                  <td>
                    <div className="inline">
                      <Button variant="ghost" onClick={() => setDialog({ user: u })}>Edit</Button>
                      {u.id !== me?.id && <ConfirmButton label="Delete" message={`Delete ${fullName(u)}? They will no longer be able to sign in.`} onConfirm={() => remove(u)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && (page > 1 || list.data.length === PAGE) && (
        <div className="inline" style={{ marginTop: '1.25rem', justifyContent: 'center' }}>
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="muted">Page {page}</span>
          <Button variant="ghost" disabled={list.data.length < PAGE} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {dialog && (
        <EntryModal
          wide
          title={dialog.user ? `Edit ${fullName(dialog.user)}` : 'Add user'}
          submitLabel={dialog.user ? 'Save user' : 'Create user'}
          fields={dialog.user ? BASE : [...BASE, { name: 'password', label: 'Temporary password', type: 'text', required: true, hint: 'At least 8 characters.' }]}
          initial={dialog.user
            ? { first_name: dialog.user.first_name, last_name: dialog.user.last_name, email: dialog.user.email, phone_number: dialog.user.phone_number, role: dialog.user.roles.name, account_status: dialog.user.account_status, email_verified: dialog.user.email_verified }
            : { role: 'JOB_SEEKER', account_status: 'ACTIVE', email_verified: true }}
          onClose={() => setDialog(null)}
          onSubmit={async (v) => {
            if (dialog.user) await api.patch(`/admin/${dialog.user.id}`, v);
            else await api.post('/admin', v);
            notify(dialog.user ? 'User saved.' : 'User created.');
            list.reload();
            return true;
          }}
        />
      )}
    </>
  );
}
