import { useState } from 'react';
import { Button, Empty, ErrorNote, Field, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { useAsync, useForm } from '../../lib/hooks';
import type { AuditLog as Log } from '../../lib/types';

const PAGE = 50;

export default function AuditLog() {
  const filters = useForm({ action: '', entity_type: '' });
  const [applied, setApplied] = useState(filters.values);
  const [page, setPage] = useState(1);
  const list = useAsync(() => api.get<Log[]>('/audit-logs', { ...applied, page, limit: PAGE }), [applied, page]);

  return (
    <>
      <PageHeader title="Audit log" subtitle="A read-only record of administrative actions." />
      <form className="filters" style={{ gridTemplateColumns: '1fr 1fr auto' }} onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(filters.values); }}>
        <Field label="Action"><input placeholder="e.g. USER_UPDATED" {...filters.bind('action')} /></Field>
        <Field label="Record type"><input placeholder="e.g. companies" {...filters.bind('entity_type')} /></Field>
        <Button type="submit">Filter</Button>
      </form>
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="No entries" />}
      {list.data && list.data.length > 0 && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>When</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
            <tbody>
              {list.data.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDateTime(l.created_at)}</td>
                  <td><strong>{l.action}</strong></td>
                  <td>{l.entity_type}{l.entity_id ? <div className="muted small">{l.entity_id}</div> : null}</td>
                  <td className="pre">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && (page > 1 || list.data.length === PAGE) && (
        <div className="inline" style={{ marginTop: '1.25rem', justifyContent: 'center' }}>
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Newer</Button>
          <span className="muted">Page {page}</span>
          <Button variant="ghost" disabled={list.data.length < PAGE} onClick={() => setPage((p) => p + 1)}>Older</Button>
        </div>
      )}
    </>
  );
}
