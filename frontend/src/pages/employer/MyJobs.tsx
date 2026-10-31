import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EntryModal, type FieldSpec } from '../../components/EntryModal';
import { JobRow } from '../../components/JobRow';
import { useToast } from '../../components/toast';
import { Button, ConfirmButton, Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { dateInput } from '../../lib/format';
import { errorMessage, useAsync } from '../../lib/hooks';
import type { Company, Job, Lookup } from '../../lib/types';

export default function MyJobs() {
  const notify = useToast();
  const jobs = useAsync(() => api.get<Job[]>('/jobs', { limit: 100 }), []);
  const categories = useAsync(() => api.get<Lookup[]>('/job-categories'), []);
  const types = useAsync(() => api.get<Lookup[]>('/job-types'), []);
  const company = useAsync(async () => (await api.get<Company[]>('/companies'))[0] ?? null, []);
  const [dialog, setDialog] = useState<null | { job?: Job }>(null);

  const approved = company.data?.verification_status === 'APPROVED';

  const fields = (editing: boolean): FieldSpec[] => [
    { name: 'title', label: 'Job title', required: true, wide: true },
    { name: 'category_id', label: 'Category', type: 'select', required: true, options: (categories.data ?? []).filter((c) => c.is_active !== false).map((c) => ({ value: c.id, label: c.name })) },
    { name: 'job_type_id', label: 'Job type', type: 'select', required: true, options: (types.data ?? []).filter((t) => t.is_active !== false).map((t) => ({ value: t.id, label: t.name })) },
    { name: 'description', label: 'About the role', type: 'textarea', required: true },
    { name: 'requirements', label: 'Requirements', type: 'textarea', required: true },
    { name: 'responsibilities', label: 'Responsibilities', type: 'textarea' },
    { name: 'salary_min', label: 'Minimum salary', type: 'number' },
    { name: 'salary_max', label: 'Maximum salary', type: 'number' },
    { name: 'salary_currency', label: 'Currency', placeholder: 'KES' },
    { name: 'location', label: 'Location' },
    { name: 'application_deadline', label: 'Apply by', type: 'date', hint: 'Must be a future date.' },
    { name: 'is_remote', label: 'This job can be done remotely', type: 'checkbox' },
    ...(editing ? [] : [{
      name: 'status', label: 'Save as', type: 'select' as const, required: true,
      options: [{ value: 'DRAFT', label: 'Draft (not visible yet)' }, ...(approved ? [{ value: 'PUBLISHED', label: 'Published now' }] : [])],
    }]),
  ];

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      notify(done);
      jobs.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const save = (job?: Job) => async (values: Record<string, unknown>) => {
    const body = { ...values };
    // The server requires a future deadline, so only send it when the employer changed it.
    if (job && body.application_deadline === dateInput(job.application_deadline)) delete body.application_deadline;
    if (job) await api.patch(`/jobs/${job.id}`, body);
    else await api.post('/jobs', { status: 'DRAFT', ...body });
    notify(job ? 'Job saved.' : 'Job created.');
    jobs.reload();
    return true;
  };

  const initialFor = (job: Job): Record<string, string | boolean> => ({
    title: job.title, category_id: job.category_id, job_type_id: job.job_type_id, description: job.description,
    requirements: job.requirements, responsibilities: job.responsibilities ?? '',
    salary_min: job.salary_min ? String(Number(job.salary_min)) : '', salary_max: job.salary_max ? String(Number(job.salary_max)) : '',
    salary_currency: job.salary_currency ?? '', location: job.location ?? '',
    application_deadline: dateInput(job.application_deadline), is_remote: job.is_remote,
  });

  return (
    <>
      <PageHeader title="My jobs" subtitle="Create jobs, publish them and manage their application forms."
        actions={<Button onClick={() => setDialog({})}>Post a job</Button>} />

      {company.data === null && !company.loading && (
        <div className="note" style={{ marginBottom: '1rem' }}>
          <span>Create your company profile before posting jobs.</span><Link className="btn btn-primary" to="/company">Set up company</Link>
        </div>
      )}
      {company.data && !approved && (
        <div className="note" style={{ marginBottom: '1rem' }}>
          <span>Your company is <strong>{company.data.verification_status.toLowerCase()}</strong>. You can save drafts, but publishing opens once an administrator approves it.</span>
          <Link className="btn btn-ghost" to="/company">Verification</Link>
        </div>
      )}

      {jobs.error && <ErrorNote message={jobs.error} onRetry={jobs.reload} />}
      {jobs.loading && !jobs.data && <Loading />}
      {jobs.data?.length === 0 && <Empty title="No jobs yet">Post your first job to start receiving applications.</Empty>}
      <div className="job-list">
        {jobs.data?.map((job) => (
          <div key={job.id} className="stack-sm">
            <JobRow job={job} showStatus />
            <div className="inline" style={{ paddingLeft: '.25rem' }}>
              <Button variant="ghost" onClick={() => setDialog({ job })}>Edit</Button>
              <Link className="btn btn-ghost" to={`/my-jobs/${job.id}/form`}>{job.application_forms ? 'Edit application form' : 'Add application form'}</Link>
              <Link className="btn btn-ghost" to={`/applicants?job_id=${job.id}`}>Applicants</Link>
              {job.status !== 'PUBLISHED' && (
                <Button variant="ghost" onClick={() => void run(() => api.patch(`/jobs/${job.id}`, { status: 'PUBLISHED' }), 'Published.')}>Publish</Button>
              )}
              {job.status === 'PUBLISHED' && (
                <Button variant="ghost" onClick={() => void run(() => api.patch(`/jobs/${job.id}`, { status: 'CLOSED' }), 'Job closed.')}>Close</Button>
              )}
              <ConfirmButton label="Delete" message={`Delete “${job.title}”? Applicants will no longer see it.`} onConfirm={() => run(() => api.del(`/jobs/${job.id}`), 'Job deleted.')} />
            </div>
          </div>
        ))}
      </div>

      {dialog && (
        <EntryModal
          wide
          title={dialog.job ? 'Edit job' : 'Post a job'}
          submitLabel={dialog.job ? 'Save job' : 'Create job'}
          fields={fields(Boolean(dialog.job))}
          initial={dialog.job ? initialFor(dialog.job) : { salary_currency: 'KES', status: 'DRAFT' }}
          onClose={() => setDialog(null)}
          onSubmit={save(dialog.job)}
        />
      )}
    </>
  );
}
