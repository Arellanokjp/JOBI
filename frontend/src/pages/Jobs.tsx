import { useState } from 'react';
import { JobRow } from '../components/JobRow';
import { useToast } from '../components/toast';
import { Button, Empty, ErrorNote, Field, Loading, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errorMessage, useAsync, useForm } from '../lib/hooks';
import type { Job, Lookup, SavedJob } from '../lib/types';

const PAGE_SIZE = 20;

export default function Jobs() {
  const { user } = useAuth();
  const notify = useToast();
  const isSeeker = user?.role === 'JOB_SEEKER';
  const filters = useForm({ q: '', category_id: '', job_type_id: '', is_remote: false });
  const [applied, setApplied] = useState(filters.values);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<string | null>(null);

  const categories = useAsync(() => api.get<Lookup[]>('/job-categories'), []);
  const types = useAsync(() => api.get<Lookup[]>('/job-types'), []);
  const saved = useAsync(() => (isSeeker ? api.get<SavedJob[]>('/saved-jobs') : Promise.resolve([] as SavedJob[])), [isSeeker]);
  const jobs = useAsync(
    () => api.get<Job[]>('/jobs', {
      q: applied.q, category_id: applied.category_id, job_type_id: applied.job_type_id,
      is_remote: applied.is_remote || undefined, page, limit: PAGE_SIZE,
    }),
    [applied, page],
  );

  const savedByJob = new Map((saved.data ?? []).map((s) => [s.job_id, s.id]));

  const toggleSave = async (jobId: string) => {
    setPending(jobId);
    try {
      const existing = savedByJob.get(jobId);
      if (existing) await api.del(`/saved-jobs/${existing}`);
      else await api.post('/saved-jobs', { job_id: jobId });
      saved.reload();
      notify(existing ? 'Removed from saved jobs.' : 'Saved for later.');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setPending(null);
    }
  };

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied(filters.values);
  };

  return (
    <>
      <PageHeader
        title={isSeeker ? 'Find your next job' : 'Jobs'}
        subtitle={isSeeker ? 'Open positions from verified companies.' : user?.role === 'EMPLOYER' ? 'Your company’s jobs, in every status.' : 'All jobs on the platform.'}
      />
      <form className="filters" onSubmit={search}>
        <Field label="Search"><input placeholder="Title, skill or place" {...filters.bind('q')} /></Field>
        <Field label="Category">
          <select {...filters.bind('category_id')}>
            <option value="">Any</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Job type">
          <select {...filters.bind('job_type_id')}>
            <option value="">Any</option>
            {types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <div className="stack-sm">
          <label className="check"><input type="checkbox" {...filters.check('is_remote')} />Remote only</label>
          <Button type="submit">Search</Button>
        </div>
      </form>

      {jobs.error && <ErrorNote message={jobs.error} onRetry={jobs.reload} />}
      {jobs.loading && !jobs.data && <Loading />}
      {jobs.data && jobs.data.length === 0 && <Empty title="No jobs match yet">Try a broader search, or check back soon.</Empty>}
      <div className="job-list">
        {jobs.data?.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            showStatus={!isSeeker}
            saved={savedByJob.has(job.id)}
            busy={pending === job.id}
            onToggleSave={isSeeker ? () => void toggleSave(job.id) : undefined}
          />
        ))}
      </div>
      {jobs.data && (page > 1 || jobs.data.length === PAGE_SIZE) && (
        <div className="inline" style={{ marginTop: '1.25rem', justifyContent: 'center' }}>
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="muted">Page {page}</span>
          <Button variant="ghost" disabled={jobs.data.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}
