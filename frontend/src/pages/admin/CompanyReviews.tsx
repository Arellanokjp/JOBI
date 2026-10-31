import { useState } from 'react';
import { EntryModal } from '../../components/EntryModal';
import { useToast } from '../../components/toast';
import { Button, Empty, ErrorNote, Loading, Modal, PageHeader, StatusBadge, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { errorMessage, useAction, useAsync } from '../../lib/hooks';
import type { Company, CompanyDocument, VerificationAttempt } from '../../lib/types';

type TabId = 'PENDING' | 'ALL';

export default function CompanyReviews() {
  const [tab, setTab] = useState<TabId>('PENDING');
  const list = useAsync(() => api.get<VerificationAttempt[]>('/company-verification', { status: tab === 'PENDING' ? 'PENDING' : undefined }), [tab]);
  const [selected, setSelected] = useState<VerificationAttempt | null>(null);

  return (
    <>
      <PageHeader title="Company reviews" subtitle="Approve companies so their employers can publish jobs." />
      <Tabs<TabId> value={tab} onChange={setTab} tabs={[{ id: 'PENDING', label: 'Waiting for review' }, { id: 'ALL', label: 'All requests' }]} />
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title={tab === 'PENDING' ? 'Nothing waiting' : 'No requests yet'} />}
      {list.data && list.data.length > 0 && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Company</th><th>Request</th><th>Sent</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.data.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.companies?.company_name}</strong></td>
                  <td>#{a.attempt_number}</td>
                  <td>{fmtDate(a.created_at)}</td>
                  <td><StatusBadge status={a.status} />{a.reason && <div className="muted small">{a.reason}</div>}</td>
                  <td>{a.status === 'PENDING' && <Button variant="ghost" onClick={() => setSelected(a)}>Review</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <ReviewModal attempt={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); list.reload(); }} />}
    </>
  );
}

function ReviewModal({ attempt, onClose, onDone }: { attempt: VerificationAttempt; onClose: () => void; onDone: () => void }) {
  const notify = useToast();
  const company = useAsync(() => api.get<Company>(`/companies/${attempt.company_id}`), [attempt.company_id]);
  const docs = useAsync(() => api.get<CompanyDocument[]>('/company-documents', { company_id: attempt.company_id }), [attempt.company_id]);
  const decide = useAction();
  const [rejecting, setRejecting] = useState<'company' | CompanyDocument | null>(null);

  const approve = async () => {
    const ok = await decide.run(() => api.patch(`/company-verification/${attempt.id}/review`, { status: 'APPROVED' }));
    if (ok) { notify('Company approved.'); onDone(); }
  };
  const reviewDoc = async (doc: CompanyDocument, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      await api.patch(`/company-documents/${doc.id}/review`, { document_status: status, ...(reason ? { rejection_reason: reason } : {}) });
      notify(status === 'APPROVED' ? 'Document approved.' : 'Document rejected.');
      docs.reload();
    } catch (err) { notify(errorMessage(err), 'error'); }
  };

  const c = company.data;
  return (
    <Modal wide title={`Review ${attempt.companies?.company_name ?? 'company'}`} onClose={onClose}>
      {company.loading && <Loading />}
      {company.error && <ErrorNote message={company.error} onRetry={company.reload} />}
      {c && (
        <div className="stack">
          <dl className="kv">
            <dt>Registration no.</dt><dd>{c.registration_number}</dd>
            <dt>Tax PIN</dt><dd>{c.tax_pin}</dd>
            <dt>Email / phone</dt><dd>{c.email} · {c.phone_number}</dd>
            <dt>Address</dt><dd>{c.physical_address}, {c.city}, {c.county}, {c.country}</dd>
            {c.website && <><dt>Website</dt><dd><a href={c.website} target="_blank" rel="noreferrer">{c.website}</a></dd></>}
          </dl>
          <div>
            <h3>Documents</h3>
            {docs.data?.length === 0 && <p className="muted small">No documents were uploaded.</p>}
            {docs.data?.map((d) => (
              <div className="entry" key={d.id}>
                <div>
                  <p><strong>{d.document_type}</strong> <StatusBadge status={d.document_status} /></p>
                  <p className="small"><a href={d.file_url} target="_blank" rel="noreferrer">{d.original_file_name || 'Open file'}</a>{d.document_number ? ` · ${d.document_number}` : ''}</p>
                  {d.rejection_reason && <p className="muted small">Reason: {d.rejection_reason}</p>}
                </div>
                <div className="inline">
                  <Button variant="ghost" onClick={() => void reviewDoc(d, 'APPROVED')}>Approve</Button>
                  <Button variant="danger" onClick={() => setRejecting(d)}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
          {decide.error && <p className="form-error">{decide.error}</p>}
          <div className="form-actions">
            <Button variant="danger" onClick={() => setRejecting('company')}>Reject company</Button>
            <Button busy={decide.busy} onClick={approve}>Approve company</Button>
          </div>
        </div>
      )}
      {rejecting && (
        <EntryModal
          title={rejecting === 'company' ? 'Reject company' : 'Reject document'} submitLabel="Reject"
          fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true, hint: 'The employer sees this, so say what to fix.' }]}
          onClose={() => setRejecting(null)}
          onSubmit={async (v) => {
            if (rejecting === 'company') {
              await api.patch(`/company-verification/${attempt.id}/review`, { status: 'REJECTED', reason: v.reason });
              notify('Company rejected.');
              onDone();
            } else {
              await reviewDoc(rejecting, 'REJECTED', String(v.reason));
            }
            return true;
          }}
        />
      )}
    </Modal>
  );
}
