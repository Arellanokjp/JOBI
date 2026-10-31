import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EntryModal, type FieldSpec } from '../../components/EntryModal';
import { useToast } from '../../components/toast';
import { Button, ConfirmButton, Empty, ErrorNote, Loading, PageHeader, Panel } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { humanize } from '../../lib/format';
import { errorMessage, useAsync } from '../../lib/hooks';
import type { AppForm, FieldType, Job } from '../../lib/types';

const TYPES: FieldType[] = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'RADIO', 'MULTISELECT', 'CHECKBOX', 'FILE'];
const CHOICE: FieldType[] = ['SELECT', 'RADIO', 'MULTISELECT'];

export default function FormBuilder() {
  const { id: jobId = '' } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const job = useAsync(() => api.get<Job>(`/jobs/${jobId}`), [jobId]);
  const form = useAsync(async () => {
    try { return await api.get<AppForm>(`/application-forms/job/${jobId}`); }
    catch (err) { if (err instanceof ApiError && err.status === 404) return null; throw err; }
  }, [jobId]);
  const [dialog, setDialog] = useState<'form' | 'field' | null>(null);

  const run = async (action: () => Promise<unknown>, done: string, after?: () => void) => {
    try {
      await action();
      notify(done);
      if (after) after(); else form.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  if (job.loading || (form.loading && form.data === null && !form.error)) return <Loading />;
  if (job.error || !job.data) return <ErrorNote message={job.error ?? 'Job not found.'} onRetry={job.reload} />;
  if (form.error) return <ErrorNote message={form.error} onRetry={form.reload} />;

  const f = form.data;
  const fieldSpecs: FieldSpec[] = [
    { name: 'field_label', label: 'Question', required: true, wide: true, placeholder: 'e.g. How many years of experience do you have?' },
    { name: 'field_name', label: 'Short name', required: true, hint: 'Lowercase letters, numbers and underscores, e.g. years_experience.' },
    { name: 'field_type', label: 'Answer type', type: 'select', required: true, options: TYPES.map((t) => ({ value: t, label: humanize(t) })) },
    { name: 'options_text', label: 'Choices', type: 'textarea', hint: 'For select, radio and multi-select questions. One choice per line.' },
    { name: 'placeholder', label: 'Placeholder' },
    { name: 'help_text', label: 'Help text' },
    { name: 'display_order', label: 'Order', type: 'number' },
    { name: 'is_required', label: 'Applicants must answer this', type: 'checkbox' },
  ];

  const addField = async (values: Record<string, unknown>) => {
    const { options_text, ...rest } = values;
    const options = String(options_text ?? '').split('\n').map((o) => o.trim()).filter(Boolean);
    const type = rest.field_type as FieldType;
    await api.post('/application-fields', {
      ...rest,
      application_form_id: f!.id,
      ...(CHOICE.includes(type) ? { field_options: options } : {}),
    });
    notify('Question added.');
    form.reload();
    return true;
  };

  return (
    <>
      <PageHeader
        title="Application form"
        subtitle={`Extra questions for “${job.data.title}”. Applicants answer them when they apply.`}
        actions={<Link className="btn btn-ghost" to="/my-jobs">Back to jobs</Link>}
      />

      {!f ? (
        <Panel>
          <Empty title="This job has no application form">Applicants can still apply with their resume. Add a form if you want to ask extra questions.</Empty>
          <div className="inline" style={{ justifyContent: 'center' }}><Button onClick={() => setDialog('form')}>Create form</Button></div>
        </Panel>
      ) : (
        <>
          <Panel
            title={f.title}
            actions={
              <div className="inline">
                <Button variant="ghost" onClick={() => void run(() => api.patch(`/application-forms/${f.id}`, { is_active: !f.is_active }), f.is_active ? 'Form turned off.' : 'Form turned on.')}>
                  {f.is_active ? 'Turn off' : 'Turn on'}
                </Button>
                <ConfirmButton label="Delete form" message="Delete this form and its questions? This is blocked if applicants already answered it." onConfirm={() => run(() => api.del(`/application-forms/${f.id}`), 'Form deleted.', () => navigate('/my-jobs'))} />
              </div>
            }
          >
            {f.description && <p className="muted">{f.description}</p>}
            {!f.is_active && <p className="note" style={{ marginTop: '.75rem' }}>This form is off, so applicants aren't asked these questions.</p>}
          </Panel>

          <Panel title="Questions" actions={<Button onClick={() => setDialog('field')}>Add question</Button>}>
            {f.application_fields.length === 0 && <Empty title="No questions yet" />}
            {[...f.application_fields].sort((a, b) => a.display_order - b.display_order).map((q) => (
              <div className="entry" key={q.id}>
                <div>
                  <h3>{q.field_label}</h3>
                  <p className="muted small">{humanize(q.field_type)}{q.is_required ? ' · required' : ''}{q.field_options?.length ? ` · ${q.field_options.join(', ')}` : ''}</p>
                </div>
                <ConfirmButton label="Remove" message="Remove this question?" onConfirm={() => run(() => api.del(`/application-fields/${q.id}`), 'Question removed.')} />
              </div>
            ))}
          </Panel>
        </>
      )}

      {dialog === 'form' && (
        <EntryModal
          title="Create application form"
          submitLabel="Create form"
          fields={[{ name: 'title', label: 'Form title', required: true, wide: true }, { name: 'description', label: 'Intro for applicants', type: 'textarea' }]}
          initial={{ title: 'Application questions' }}
          onClose={() => setDialog(null)}
          onSubmit={async (values) => { await api.post('/application-forms', { ...values, job_id: jobId }); notify('Form created.'); form.reload(); return true; }}
        />
      )}
      {dialog === 'field' && (
        <EntryModal wide title="Add question" submitLabel="Add question" fields={fieldSpecs}
          initial={{ field_type: 'TEXT', display_order: String(f?.application_fields.length ?? 0) }}
          onClose={() => setDialog(null)} onSubmit={addField} />
      )}
    </>
  );
}
