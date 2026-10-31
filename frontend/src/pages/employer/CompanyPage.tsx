import { useState } from 'react';
import { EntryModal, type FieldSpec } from '../../components/EntryModal';
import { useToast } from '../../components/toast';
import { Button, ConfirmButton, Empty, ErrorNote, Loading, PageHeader, Panel, Seal, StatusBadge, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { errorMessage, useAction, useAsync } from '../../lib/hooks';
import type { Branch, Company, CompanyDocument, VerificationAttempt } from '../../lib/types';

const COMPANY_FIELDS: FieldSpec[] = [
  { name: 'company_name', label: 'Company name', required: true, wide: true },
  { name: 'registration_number', label: 'Registration number', required: true },
  { name: 'tax_pin', label: 'Tax PIN', required: true },
  { name: 'email', label: 'Company email', type: 'email', required: true },
  { name: 'phone_number', label: 'Company phone', required: true },
  { name: 'website', label: 'Website', type: 'url' },
  { name: 'industry', label: 'Industry' },
  { name: 'logo_url', label: 'Logo link', type: 'url' },
  { name: 'description', label: 'About the company', type: 'textarea' },
  { name: 'country', label: 'Country', required: true },
  { name: 'county', label: 'County', required: true },
  { name: 'city', label: 'City or town', required: true },
  { name: 'physical_address', label: 'Physical address', required: true, wide: true },
  { name: 'postal_address', label: 'Postal address', wide: true },
];
const BRANCH_FIELDS: FieldSpec[] = [
  { name: 'branch_name', label: 'Branch name', required: true, wide: true },
  { name: 'country', label: 'Country', required: true },
  { name: 'county', label: 'County', required: true },
  { name: 'city', label: 'City or town', required: true },
  { name: 'physical_address', label: 'Physical address', required: true },
  { name: 'postal_address', label: 'Postal address' },
  { name: 'phone_number', label: 'Phone' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'is_head_office', label: 'This is the head office', type: 'checkbox' },
];
const DOC_FIELDS: FieldSpec[] = [
  { name: 'document_type', label: 'Document type', required: true, placeholder: 'e.g. Certificate of incorporation' },
  { name: 'document_number', label: 'Document number' },
  { name: 'file_url', label: 'Link to the file', type: 'url', required: true, wide: true, hint: 'Upload the file to your storage and paste its link.' },
  { name: 'original_file_name', label: 'File name' },
  { name: 'expires_at', label: 'Expires', type: 'date' },
];

type TabId = 'profile' | 'branches' | 'documents';

export default function CompanyPage() {
  const notify = useToast();
  const company = useAsync(async () => (await api.get<Company[]>('/companies'))[0] ?? null, []);
  const [tab, setTab] = useState<TabId>('profile');
  const [editing, setEditing] = useState(false);

  if (company.loading && company.data === null) return <Loading />;
  if (company.error) return <ErrorNote message={company.error} onRetry={company.reload} />;

  if (!company.data) {
    return (
      <>
        <PageHeader title="Company" subtitle="Employers need a company profile to post jobs." />
        <Panel>
          <Empty title="Set up your company">Add your company details. An administrator reviews them before you can publish jobs.</Empty>
          <div className="inline" style={{ justifyContent: 'center' }}><Button onClick={() => setEditing(true)}>Create company profile</Button></div>
        </Panel>
        {editing && (
          <EntryModal wide title="Create company profile" submitLabel="Create profile" fields={COMPANY_FIELDS} onClose={() => setEditing(false)}
            onSubmit={async (v) => { await api.post('/companies', v); notify('Company created.'); company.reload(); return true; }} />
        )}
      </>
    );
  }

  const c = company.data;
  const initial: Record<string, string> = {};
  for (const f of COMPANY_FIELDS) initial[f.name] = String((c as unknown as Record<string, unknown>)[f.name] ?? '');

  return (
    <>
      <PageHeader title={c.company_name} subtitle={`${c.city}, ${c.country}`} actions={<StatusBadge status={c.verification_status} />} />
      <Tabs<TabId> value={tab} onChange={setTab} tabs={[{ id: 'profile', label: 'Profile & verification' }, { id: 'branches', label: 'Branches' }, { id: 'documents', label: 'Documents' }]} />

      {tab === 'profile' && (
        <>
          <Verification company={c} onChanged={company.reload} />
          <Panel title="Company details" actions={<Button variant="ghost" onClick={() => setEditing(true)}>Edit details</Button>}>
            <div className="inline" style={{ alignItems: 'flex-start' }}>
              <Seal name={c.company_name} size={56} />
              <dl className="kv" style={{ flex: 1 }}>
                <dt>Registration no.</dt><dd>{c.registration_number}</dd>
                <dt>Tax PIN</dt><dd>{c.tax_pin}</dd>
                <dt>Email</dt><dd>{c.email}</dd>
                <dt>Phone</dt><dd>{c.phone_number}</dd>
                {c.website && <><dt>Website</dt><dd><a href={c.website} target="_blank" rel="noreferrer">{c.website}</a></dd></>}
                {c.industry && <><dt>Industry</dt><dd>{c.industry}</dd></>}
                <dt>Address</dt><dd>{c.physical_address}, {c.county}</dd>
                {c.description && <><dt>About</dt><dd className="pre">{c.description}</dd></>}
              </dl>
            </div>
          </Panel>
          {editing && (
            <EntryModal wide title="Edit company details" fields={COMPANY_FIELDS} initial={initial} onClose={() => setEditing(false)}
              onSubmit={async (v) => { await api.patch(`/companies/${c.id}`, v); notify('Company details saved.'); company.reload(); return true; }} />
          )}
        </>
      )}
      {tab === 'branches' && <Branches />}
      {tab === 'documents' && <Documents />}
    </>
  );
}

function Verification({ company, onChanged }: { company: Company; onChanged: () => void }) {
  const notify = useToast();
  const attempts = useAsync(() => api.get<VerificationAttempt[]>('/company-verification'), [company.verification_status]);
  const request = useAction();
  const latest = attempts.data?.[0];
  const waiting = latest?.status === 'PENDING';

  const send = async () => {
    const ok = await request.run(() => api.post('/company-verification'));
    if (ok) { notify('Verification requested. An administrator will review your company.'); attempts.reload(); onChanged(); }
  };

  return (
    <Panel title="Verification">
      <div className="stack-sm">
        {company.verification_status === 'APPROVED' && <p>Your company is approved{company.verified_at ? ` (${fmtDate(company.verified_at)})` : ''}. You can publish jobs.</p>}
        {waiting && <p>Your request is waiting for an administrator. You'll get a notification when it's decided.</p>}
        {latest?.status === 'REJECTED' && <p className="form-error">Not approved: {latest.reason}</p>}
        {company.verification_status !== 'APPROVED' && !waiting && (
          <>
            <p className="muted">Add your registration documents, then request a review. Until you're approved you can only save drafts.</p>
            <div><Button busy={request.busy} onClick={send}>{latest ? 'Request review again' : 'Request verification'}</Button></div>
          </>
        )}
        {request.error && <p className="form-error">{request.error}</p>}
      </div>
    </Panel>
  );
}

function Branches() {
  const notify = useToast();
  const list = useAsync(() => api.get<Branch[]>('/company-branches'), []);
  const [adding, setAdding] = useState(false);
  const remove = async (id: string) => {
    try { await api.del(`/company-branches/${id}`); notify('Branch removed.'); list.reload(); }
    catch (err) { notify(errorMessage(err), 'error'); }
  };
  return (
    <Panel title="Branches" actions={<Button variant="ghost" onClick={() => setAdding(true)}>Add branch</Button>}>
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="No branches yet" />}
      {list.data?.map((b) => (
        <div className="entry" key={b.id}>
          <div>
            <h3>{b.branch_name} {b.is_head_office && <span className="badge badge-green">Head office</span>}</h3>
            <p className="muted small">{b.physical_address}, {b.city}, {b.county}</p>
          </div>
          <ConfirmButton label="Remove" message="Remove this branch?" onConfirm={() => remove(b.id)} />
        </div>
      ))}
      {adding && <EntryModal wide title="Add branch" fields={BRANCH_FIELDS} onClose={() => setAdding(false)}
        onSubmit={async (v) => { await api.post('/company-branches', v); notify('Branch added.'); list.reload(); return true; }} />}
    </Panel>
  );
}

function Documents() {
  const notify = useToast();
  const list = useAsync(() => api.get<CompanyDocument[]>('/company-documents'), []);
  const [adding, setAdding] = useState(false);
  const remove = async (id: string) => {
    try { await api.del(`/company-documents/${id}`); notify('Document removed.'); list.reload(); }
    catch (err) { notify(errorMessage(err), 'error'); }
  };
  return (
    <Panel title="Documents" actions={<Button variant="ghost" onClick={() => setAdding(true)}>Add document</Button>}>
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="No documents yet">Add your certificate of incorporation and tax documents so we can verify your company.</Empty>}
      {list.data?.map((d) => (
        <div className="entry" key={d.id}>
          <div>
            <h3>{d.document_type} <StatusBadge status={d.document_status} /></h3>
            <p className="small"><a href={d.file_url} target="_blank" rel="noreferrer">{d.original_file_name || 'Open file'}</a></p>
            {d.rejection_reason && <p className="form-error small">Rejected: {d.rejection_reason}</p>}
          </div>
          <ConfirmButton label="Remove" message="Remove this document?" onConfirm={() => remove(d.id)} />
        </div>
      ))}
      {adding && <EntryModal wide title="Add document" fields={DOC_FIELDS} onClose={() => setAdding(false)}
        onSubmit={async (v) => { await api.post('/company-documents', v); notify('Document added.'); list.reload(); return true; }} />}
    </Panel>
  );
}
