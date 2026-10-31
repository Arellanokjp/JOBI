import { Link, useSearchParams } from 'react-router-dom';
import { Empty, ErrorNote, Field, Loading, PageHeader, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate, fullName, humanize } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import type { Application, Job } from '../../lib/types';

const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'];

export default function Applicants() {
  const [params, setParams] = useSearchParams();
  const jobId = params.get('job_id') ?? '';
  const status = params.get('status') ?? '';
  const jobs = useAsync(() => api.get<Job[]>('/jobs', { limit: 100 }), []);
  const list = useAsync(() => api.get<Application[]>('/applications', { job_id: jobId, status, limit: 100 }), [jobId, status]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Applicants" subtitle="People who applied to your jobs." />
      <div className="filters" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Job">
          <select value={jobId} onChange={(e) => update('job_id', e.target.value)}>
            <option value="">All jobs</option>
            {jobs.data?.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => update('status', e.target.value)}>
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </Field>
      </div>

      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="No applicants match">Applications appear here as soon as candidates apply.</Empty>}
      {list.data && list.data.length > 0 && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Candidate</th><th>Job</th><th>Applied</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.data.map((a) => (
                <tr key={a.id}>
                  <td><strong>{fullName(a.users)}</strong><br /><span className="muted small">{a.users?.email}</span></td>
                  <td>{a.jobs.title}</td>
                  <td>{fmtDate(a.applied_at)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><Link className="btn btn-ghost" to={`/applicants/${a.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
