import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/toast';
import { Button, ErrorNote, Field, FormError, Loading, PageHeader, Panel, Seal, StatusBadge } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDate, fmtSalary } from '../lib/format';
import { useAction, useAsync } from '../lib/hooks';
import type { AppField, AppForm, Application, Job, Resume } from '../lib/types';

interface Answer { text?: string; number?: string; date?: string; file?: string; multi?: string[]; checked?: boolean }

export default function JobDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const job = useAsync(() => api.get<Job>(`/jobs/${id}`), [id]);

  if (job.loading && !job.data) return <Loading />;
  if (job.error || !job.data) return <ErrorNote message={job.error ?? 'Job not found.'} onRetry={job.reload} />;
  const j = job.data;
  const salary = fmtSalary(j.salary_min, j.salary_max, j.salary_currency);

  return (
    <>
      <PageHeader
        title={j.title}
        subtitle={`${j.companies.company_name} · ${j.is_remote ? 'Remote' : j.location ?? j.companies.city ?? ''}`}
        actions={<><StatusBadge status={j.status} />{user?.role === 'EMPLOYER' && <Link className="btn btn-ghost" to="/my-jobs">Manage jobs</Link>}</>}
      />
      <div className="job-layout">
        <Panel>
          <div className="inline" style={{ marginBottom: '1rem' }}>
            <Seal name={j.companies.company_name} size={52} />
            <dl className="kv" style={{ flex: 1 }}>
              <dt>Category</dt><dd>{j.job_categories.name}</dd>
              <dt>Type</dt><dd>{j.job_types.name}</dd>
              {salary && <><dt>Salary</dt><dd>{salary}</dd></>}
              {j.application_deadline && <><dt>Apply by</dt><dd>{fmtDate(j.application_deadline)}</dd></>}
            </dl>
          </div>
          <div className="prose">
            <h3>About the role</h3><p className="pre">{j.description}</p>
            <h3>Requirements</h3><p className="pre">{j.requirements}</p>
            {j.responsibilities && <><h3>Responsibilities</h3><p className="pre">{j.responsibilities}</p></>}
          </div>
        </Panel>
        <aside>
          {user?.role === 'JOB_SEEKER' && j.status === 'PUBLISHED' ? <ApplyPanel job={j} /> : (
            <Panel><p className="muted">Only job seekers can apply. {j.status !== 'PUBLISHED' && 'This job is not open for applications.'}</p></Panel>
          )}
        </aside>
      </div>
    </>
  );
}

function ApplyPanel({ job }: { job: Job }) {
  const notify = useToast();
  const existing = useAsync(async () => {
    const list = await api.get<Application[]>('/applications', { job_id: job.id });
    return list[0] ?? null;
  }, [job.id]);
  const form = useAsync(async () => {
    try { return await api.get<AppForm>(`/application-forms/job/${job.id}`); }
    catch (err) { if (err instanceof ApiError && err.status === 404) return null; throw err; }
  }, [job.id]);
  const resume = useAsync(async () => (await api.get<Resume[]>('/resumes'))[0] ?? null, []);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [attach, setAttach] = useState(true);
  const action = useAction();

  if (existing.loading || form.loading || resume.loading) return <Panel><Loading /></Panel>;
  const current = existing.data;

  if (current && current.status !== 'WITHDRAWN') {
    return (
      <Panel title="You've applied">
        <div className="stack-sm">
          <p>Status: <StatusBadge status={current.status} /></p>
          <p className="muted small">Applied {fmtDate(current.applied_at)}.</p>
          <Link className="btn btn-ghost" to="/applications">View my applications</Link>
        </div>
      </Panel>
    );
  }

  const fields = form.data?.is_active ? [...form.data.application_fields].sort((a, b) => a.display_order - b.display_order) : [];
  const set = (fieldId: string, patch: Answer) => setAnswers((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], ...patch } }));

  const toResponse = (f: AppField) => {
    const a = answers[f.id] ?? {};
    switch (f.field_type) {
      case 'NUMBER': return a.number ? { application_field_id: f.id, response_number: Number(a.number) } : null;
      case 'DATE': return a.date ? { application_field_id: f.id, response_date: a.date } : null;
      case 'FILE': return a.file ? { application_field_id: f.id, file_url: a.file } : null;
      case 'MULTISELECT': return a.multi?.length ? { application_field_id: f.id, response_text: JSON.stringify(a.multi) } : null;
      case 'CHECKBOX': return a.checked || f.is_required ? { application_field_id: f.id, response_text: a.checked ? 'true' : 'false' } : null;
      default: return a.text?.trim() ? { application_field_id: f.id, response_text: a.text.trim() } : null;
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const responses = fields.map(toResponse).filter(Boolean);
    const created = await action.run(() => api.post<Application>('/applications', {
      job_id: job.id,
      ...(attach && resume.data ? { resume_id: resume.data.id } : {}),
      ...(responses.length ? { responses } : {}),
    }));
    if (created) {
      notify("Application sent. We'll tell you when the employer responds.");
      existing.reload();
    }
  };

  return (
    <Panel title="Apply for this job">
      <form className="stack" onSubmit={submit}>
        {resume.data ? (
          <label className="check"><input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />Attach my resume</label>
        ) : (
          <p className="note note-ok small">You don't have a resume yet. <Link to="/resume">Create one</Link> so employers can see your experience.</p>
        )}
        {fields.map((f) => <FieldInput key={f.id} field={f} answer={answers[f.id] ?? {}} onChange={(patch) => set(f.id, patch)} />)}
        <FormError message={action.error} />
        <Button type="submit" busy={action.busy}>Send application</Button>
        {current?.status === 'WITHDRAWN' && <p className="muted small">You withdrew an earlier application. Sending again reopens it.</p>}
      </form>
    </Panel>
  );
}

function FieldInput({ field, answer, onChange }: { field: AppField; answer: Answer; onChange: (patch: Answer) => void }) {
  const label = field.field_label + (field.is_required ? '' : ' (optional)');
  const options = field.field_options ?? [];
  const req = field.is_required;

  let control: React.ReactNode;
  switch (field.field_type) {
    case 'TEXTAREA':
      control = <textarea required={req} placeholder={field.placeholder ?? ''} value={answer.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} />; break;
    case 'NUMBER':
      control = <input type="number" required={req} step="any" value={answer.number ?? ''} onChange={(e) => onChange({ number: e.target.value })} />; break;
    case 'DATE':
      control = <input type="date" required={req} value={answer.date ?? ''} onChange={(e) => onChange({ date: e.target.value })} />; break;
    case 'SELECT':
      control = (
        <select required={req} value={answer.text ?? ''} onChange={(e) => onChange({ text: e.target.value })}>
          <option value="">Choose…</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ); break;
    case 'RADIO':
      control = (
        <div className="stack-sm">
          {options.map((o) => (
            <label key={o} className="check"><input type="radio" required={req} name={field.id} checked={answer.text === o} onChange={() => onChange({ text: o })} />{o}</label>
          ))}
        </div>
      ); break;
    case 'MULTISELECT':
      control = (
        <div className="stack-sm">
          {options.map((o) => {
            const on = answer.multi?.includes(o) ?? false;
            return <label key={o} className="check"><input type="checkbox" checked={on} onChange={() => onChange({ multi: on ? (answer.multi ?? []).filter((x) => x !== o) : [...(answer.multi ?? []), o] })} />{o}</label>;
          })}
        </div>
      ); break;
    case 'CHECKBOX':
      control = <label className="check"><input type="checkbox" required={req} checked={answer.checked ?? false} onChange={(e) => onChange({ checked: e.target.checked })} />{field.placeholder || 'Yes'}</label>; break;
    case 'FILE':
      control = <input type="url" required={req} placeholder="https://…" value={answer.file ?? ''} onChange={(e) => onChange({ file: e.target.value })} />; break;
    default:
      control = <input required={req} placeholder={field.placeholder ?? ''} value={answer.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} />;
  }

  // Groups of checkboxes/radios are labelled with a div so each option keeps its own label.
  const grouped = ['RADIO', 'MULTISELECT', 'CHECKBOX'].includes(field.field_type);
  return grouped ? (
    <div className="field"><span className="field-label">{label}</span>{control}{field.help_text && <span className="field-hint">{field.help_text}</span>}</div>
  ) : (
    <Field label={label} hint={field.help_text ?? (field.field_type === 'FILE' ? 'Paste a link to your file.' : undefined)}>{control}</Field>
  );
}

