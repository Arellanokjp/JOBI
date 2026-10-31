import { useToast } from '../components/toast';
import { Button, ConfirmButton, Empty, ErrorNote, Loading, PageHeader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime, fullName, humanize } from '../lib/format';
import { errorMessage, useAsync } from '../lib/hooks';
import type { Interview } from '../lib/types';

export default function Interviews() {
  const { user } = useAuth();
  const notify = useToast();
  const isEmployer = user?.role === 'EMPLOYER';
  const list = useAsync(() => api.get<Interview[]>('/interviews'), []);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      notify(done);
      list.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Interviews"
        subtitle={isEmployer ? 'Schedule interviews from an applicant’s page.' : 'Interviews employers have scheduled with you.'}
      />
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="No interviews scheduled" />}
      <div className="job-list">
        {list.data?.map((i) => (
          <article key={i.id} className="job-row">
            <div className="grow">
              <h3>{i.applications?.jobs.title}</h3>
              <div className="job-meta">
                <span>{fmtDateTime(i.scheduled_at)}{i.duration_minutes ? ` · ${i.duration_minutes} min` : ''}</span>
                <span>{humanize(i.interview_type)}</span>
                {isEmployer && i.applications && <span>{fullName(i.applications.users)}</span>}
                {i.location && <span>{i.location}</span>}
                {i.meeting_url && <a href={i.meeting_url} target="_blank" rel="noreferrer">Join link</a>}
              </div>
              {isEmployer && i.notes && <p className="muted small" style={{ marginTop: '.4rem' }}>Notes: {i.notes}</p>}
            </div>
            <div className="job-side">
              <StatusBadge status={i.status} />
              {isEmployer && i.status === 'SCHEDULED' && (
                <div className="inline">
                  <Button variant="ghost" onClick={() => void run(() => api.patch(`/interviews/${i.id}`, { status: 'COMPLETED' }), 'Marked as completed.')}>Completed</Button>
                  <Button variant="ghost" onClick={() => void run(() => api.patch(`/interviews/${i.id}`, { status: 'NO_SHOW' }), 'Marked as no-show.')}>No-show</Button>
                  <ConfirmButton label="Cancel" message="Cancel this interview? The candidate will be notified." onConfirm={() => run(() => api.del(`/interviews/${i.id}`), 'Interview cancelled.')} />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
