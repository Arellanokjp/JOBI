import { Link } from 'react-router-dom';
import { fmtDate, fmtSalary } from '../lib/format';
import type { Job } from '../lib/types';
import { Button, Seal, StatusBadge } from './ui';

export function JobRow({ job, saved, onToggleSave, showStatus, busy }: {
  job: Job; saved?: boolean; onToggleSave?: () => void; showStatus?: boolean; busy?: boolean;
}) {
  const salary = fmtSalary(job.salary_min, job.salary_max, job.salary_currency);
  const place = job.is_remote ? 'Remote' : [job.location, job.companies?.city].filter(Boolean)[0];
  const cls = job.status === 'DRAFT' ? ' is-draft' : job.status === 'CLOSED' ? ' is-closed' : '';

  return (
    <article className={`job-row${cls}`}>
      <Seal name={job.companies?.company_name ?? '?'} />
      <div className="grow">
        <h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3>
        <div className="job-meta">
          <span>{job.companies?.company_name}</span>
          {place && <span>{place}</span>}
          <span>{job.job_types?.name}</span>
          {salary && <span>{salary}</span>}
          {job.application_deadline && <span>Apply by {fmtDate(job.application_deadline)}</span>}
        </div>
      </div>
      <div className="job-side">
        {showStatus && <StatusBadge status={job.status} />}
        {onToggleSave && (
          <Button variant="ghost" busy={busy} onClick={onToggleSave} aria-pressed={saved}>
            {saved ? 'Saved' : 'Save'}
          </Button>
        )}
      </div>
    </article>
  );
}
