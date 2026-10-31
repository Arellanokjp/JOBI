import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/toast';
import { ConfirmButton, Button, Empty, ErrorNote, Loading, PageHeader, Seal, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate, fmtDateTime, humanize } from '../../lib/format';
import { errorMessage, useAsync } from '../../lib/hooks';
import type { Application } from '../../lib/types';

const FINAL = ['HIRED', 'REJECTED', 'WITHDRAWN'];

export default function MyApplications() {
  const notify = useToast();
  const list = useAsync(() => api.get<Application[]>('/applications'), []);
  const [open, setOpen] = useState<string | null>(null);

  const withdraw = async (id: string) => {
    try {
      await api.del(`/applications/${id}`);
      notify('Application withdrawn.');
      list.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader title="My applications" subtitle="Track every job you've applied for." />
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="No applications yet"><Link to="/jobs">Browse open jobs</Link> and apply to get started.</Empty>}
      <div className="job-list">
        {list.data?.map((a) => (
          <div key={a.id}>
            <article className="job-row">
              <Seal name={a.jobs.companies.company_name} />
              <div className="grow">
                <h3><Link to={`/jobs/${a.job_id}`}>{a.jobs.title}</Link></h3>
                <div className="job-meta"><span>{a.jobs.companies.company_name}</span><span>Applied {fmtDate(a.applied_at)}</span></div>
              </div>
              <div className="job-side">
                <StatusBadge status={a.status} />
                <div className="inline">
                  <Button variant="ghost" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'Hide details' : 'Details'}</Button>
                  {!FINAL.includes(a.status) && <ConfirmButton label="Withdraw" message="Withdraw this application?" onConfirm={() => withdraw(a.id)} />}
                </div>
              </div>
            </article>
            {open === a.id && <Details id={a.id} />}
          </div>
        ))}
      </div>
    </>
  );
}

function Details({ id }: { id: string }) {
  const detail = useAsync(() => api.get<Application>(`/applications/${id}`), [id]);
  if (detail.loading) return <Loading />;
  if (detail.error || !detail.data) return <ErrorNote message={detail.error ?? 'Could not load details.'} onRetry={detail.reload} />;
  const { interviews = [], application_responses: answers = [] } = detail.data;

  return (
    <div className="panel" style={{ marginTop: '.5rem' }}>
      <div className="stack">
        <div>
          <h3>Interviews</h3>
          {interviews.length === 0 ? <p className="muted small">None scheduled yet.</p> : interviews.map((i) => (
            <p key={i.id}>{fmtDateTime(i.scheduled_at)} · {humanize(i.interview_type)} <StatusBadge status={i.status} />
              {i.location && <span className="muted"> · {i.location}</span>}
              {i.meeting_url && <> · <a href={i.meeting_url} target="_blank" rel="noreferrer">Join link</a></>}
            </p>
          ))}
        </div>
        {answers.length > 0 && (
          <div>
            <h3>Your answers</h3>
            <dl className="kv">
              {answers.map((r) => (
                <div key={r.id} style={{ display: 'contents' }}>
                  <dt>{r.application_fields.field_label}</dt>
                  <dd>{r.response_text ?? r.response_number ?? (r.response_date ? fmtDate(r.response_date) : r.file_url)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
