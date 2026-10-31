import { useState, type FormEvent } from 'react';
import { EntryModal, type FieldSpec } from '../../components/EntryModal';
import { useToast } from '../../components/toast';
import { Button, ConfirmButton, Empty, ErrorNote, Field, FormError, Loading, Modal, PageHeader, Panel } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { errorMessage, useAction, useAsync, useForm } from '../../lib/hooks';
import type { Resume, Lookup as Skill } from '../../lib/types';

const EDUCATION: FieldSpec[] = [
  { name: 'institution_name', label: 'School or institution', required: true },
  { name: 'qualification', label: 'Qualification', required: true, placeholder: 'e.g. BSc Computer Science' },
  { name: 'field_of_study', label: 'Field of study', wide: true },
  { name: 'start_date', label: 'Start date', type: 'date' },
  { name: 'end_date', label: 'End date', type: 'date' },
  { name: 'description', label: 'Notes', type: 'textarea' },
];
const EXPERIENCE: FieldSpec[] = [
  { name: 'job_title', label: 'Job title', required: true },
  { name: 'company_name', label: 'Company', required: true },
  { name: 'employment_type', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'].map((v) => ({ value: v, label: v })) },
  { name: 'location', label: 'Location' },
  { name: 'start_date', label: 'Start date', type: 'date', required: true },
  { name: 'end_date', label: 'End date', type: 'date', hint: 'Leave empty if this is your current job.' },
  { name: 'is_current', label: 'I currently work here', type: 'checkbox' },
  { name: 'description', label: 'What you did', type: 'textarea' },
];
const CERTIFICATION: FieldSpec[] = [
  { name: 'certification_name', label: 'Certification', required: true },
  { name: 'issuing_organization', label: 'Issued by', required: true },
  { name: 'credential_id', label: 'Credential ID' },
  { name: 'credential_url', label: 'Credential link', type: 'url' },
  { name: 'issue_date', label: 'Issued', type: 'date' },
  { name: 'expiry_date', label: 'Expires', type: 'date' },
];

type Dialog = null | 'education' | 'experience' | 'certifications' | 'skill';

export default function ResumePage() {
  const notify = useToast();
  const resume = useAsync(async () => (await api.get<Resume[]>('/resumes'))[0] ?? null, []);
  const [dialog, setDialog] = useState<Dialog>(null);

  if (resume.loading && resume.data === null) return <Loading />;
  if (resume.error) return <ErrorNote message={resume.error} onRetry={resume.reload} />;
  if (!resume.data) return <CreateResume onCreated={resume.reload} />;
  const r = resume.data;

  const remove = async (path: string, done: string) => {
    try {
      await api.del(path);
      notify(done);
      resume.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };
  const add = (path: string, done: string) => async (values: Record<string, unknown>) => {
    const result = await api.post(path, values);
    notify(done);
    resume.reload();
    return result;
  };

  return (
    <>
      <PageHeader title="My resume" subtitle="Employers only see this when you apply to one of their jobs." />
      <Summary resume={r} onSaved={resume.reload} />

      <Panel title="Experience" actions={<Button variant="ghost" onClick={() => setDialog('experience')}>Add experience</Button>}>
        {r.experience.length === 0 && <Empty title="No experience added" />}
        {r.experience.map((x) => (
          <div className="entry" key={x.id}>
            <div>
              <h3>{x.job_title}</h3>
              <p>{x.company_name}{x.location ? ` · ${x.location}` : ''}</p>
              <p className="muted small">{fmtDate(x.start_date)} – {x.is_current ? 'Present' : fmtDate(x.end_date) || '—'}</p>
              {x.description && <p className="pre small">{x.description}</p>}
            </div>
            <ConfirmButton label="Remove" message="Remove this experience?" onConfirm={() => remove(`/experience/${x.id}`, 'Experience removed.')} />
          </div>
        ))}
      </Panel>

      <Panel title="Education" actions={<Button variant="ghost" onClick={() => setDialog('education')}>Add education</Button>}>
        {r.education.length === 0 && <Empty title="No education added" />}
        {r.education.map((x) => (
          <div className="entry" key={x.id}>
            <div>
              <h3>{x.qualification}</h3>
              <p>{x.institution_name}{x.field_of_study ? ` · ${x.field_of_study}` : ''}</p>
              <p className="muted small">{fmtDate(x.start_date)}{x.end_date ? ` – ${fmtDate(x.end_date)}` : ''}</p>
            </div>
            <ConfirmButton label="Remove" message="Remove this education entry?" onConfirm={() => remove(`/education/${x.id}`, 'Education removed.')} />
          </div>
        ))}
      </Panel>

      <Panel title="Certifications" actions={<Button variant="ghost" onClick={() => setDialog('certifications')}>Add certification</Button>}>
        {r.certifications.length === 0 && <Empty title="No certifications added" />}
        {r.certifications.map((x) => (
          <div className="entry" key={x.id}>
            <div>
              <h3>{x.certification_name}</h3>
              <p>{x.issuing_organization}</p>
              <p className="muted small">{x.issue_date ? `Issued ${fmtDate(x.issue_date)}` : ''}{x.expiry_date ? ` · Expires ${fmtDate(x.expiry_date)}` : ''}</p>
            </div>
            <ConfirmButton label="Remove" message="Remove this certification?" onConfirm={() => remove(`/certifications/${x.id}`, 'Certification removed.')} />
          </div>
        ))}
      </Panel>

      <Panel title="Skills" actions={<Button variant="ghost" onClick={() => setDialog('skill')}>Add skill</Button>}>
        {r.resume_skills.length === 0 && <Empty title="No skills added" />}
        <div className="chips">
          {r.resume_skills.map((s) => (
            <span className="chip" key={s.id}>
              {s.skills.name}{s.proficiency_level ? ` · ${s.proficiency_level.toLowerCase()}` : ''}
              <button aria-label={`Remove ${s.skills.name}`} onClick={() => void remove(`/resume-skills/${s.id}`, 'Skill removed.')}>×</button>
            </span>
          ))}
        </div>
      </Panel>

      {dialog === 'experience' && <EntryModal wide title="Add experience" fields={EXPERIENCE} onClose={() => setDialog(null)} onSubmit={add('/experience', 'Experience added.')} />}
      {dialog === 'education' && <EntryModal wide title="Add education" fields={EDUCATION} onClose={() => setDialog(null)} onSubmit={add('/education', 'Education added.')} />}
      {dialog === 'certifications' && <EntryModal wide title="Add certification" fields={CERTIFICATION} onClose={() => setDialog(null)} onSubmit={add('/certifications', 'Certification added.')} />}
      {dialog === 'skill' && <AddSkill existing={r.resume_skills.map((s) => s.skill_id)} onClose={() => setDialog(null)} onAdded={() => { notify('Skill added.'); resume.reload(); }} />}
    </>
  );
}

function CreateResume({ onCreated }: { onCreated: () => void }) {
  const form = useForm({ professional_summary: '', resume_file_url: '' });
  const action = useAction();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const v = form.values;
    const created = await action.run(() => api.post('/resumes', {
      ...(v.professional_summary.trim() ? { professional_summary: v.professional_summary.trim() } : {}),
      ...(v.resume_file_url.trim() ? { resume_file_url: v.resume_file_url.trim() } : {}),
    }));
    if (created) onCreated();
  };
  return (
    <>
      <PageHeader title="Create your resume" subtitle="One resume per account. You'll add experience, education and skills next." />
      <Panel>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Professional summary" wide><textarea placeholder="A few lines about you and the work you want." {...form.bind('professional_summary')} /></Field>
          <Field label="Link to your CV file" hint="Optional. A link to a PDF you host elsewhere." wide><input type="url" {...form.bind('resume_file_url')} /></Field>
          <div className="field-wide"><FormError message={action.error} /></div>
          <div className="form-actions"><Button type="submit" busy={action.busy}>Create resume</Button></div>
        </form>
      </Panel>
    </>
  );
}

function Summary({ resume, onSaved }: { resume: Resume; onSaved: () => void }) {
  const notify = useToast();
  const form = useForm({ professional_summary: resume.professional_summary ?? '', resume_file_url: resume.resume_file_url ?? '' });
  const action = useAction();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const v = form.values;
    const saved = await action.run(() => api.patch(`/resumes/${resume.id}`, {
      ...(v.professional_summary.trim() ? { professional_summary: v.professional_summary.trim() } : {}),
      ...(v.resume_file_url.trim() ? { resume_file_url: v.resume_file_url.trim() } : {}),
    }));
    if (saved) { notify('Summary saved.'); onSaved(); }
  };
  return (
    <Panel title="Summary">
      <form className="form-grid" onSubmit={submit}>
        <Field label="Professional summary" wide><textarea {...form.bind('professional_summary')} /></Field>
        <Field label="Link to your CV file" wide><input type="url" {...form.bind('resume_file_url')} /></Field>
        <div className="field-wide"><FormError message={action.error} /></div>
        <div className="form-actions"><Button type="submit" busy={action.busy}>Save summary</Button></div>
      </form>
    </Panel>
  );
}

function AddSkill({ existing, onClose, onAdded }: { existing: string[]; onClose: () => void; onAdded: () => void }) {
  const skills = useAsync(() => api.get<Skill[]>('/skills'), []);
  const form = useForm({ skill_id: '', proficiency_level: '', years_of_experience: '' });
  const action = useAction();
  const available = (skills.data ?? []).filter((s) => !existing.includes(s.id));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const v = form.values;
    const added = await action.run(() => api.post('/resume-skills', {
      skill_id: v.skill_id,
      ...(v.proficiency_level ? { proficiency_level: v.proficiency_level } : {}),
      ...(v.years_of_experience ? { years_of_experience: Number(v.years_of_experience) } : {}),
    }));
    if (added) { onAdded(); onClose(); }
  };

  return (
    <Modal title="Add a skill" onClose={onClose}>
      {skills.loading ? <Loading /> : available.length === 0 ? <Empty title="No more skills to add">Ask an administrator to add more skills.</Empty> : (
        <form className="form-grid" onSubmit={submit}>
          <Field label="Skill" wide>
            <select required {...form.bind('skill_id')}>
              <option value="">Choose a skill…</option>
              {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Level">
            <select {...form.bind('proficiency_level')}>
              <option value="">—</option>
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((l) => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
          <Field label="Years of experience"><input type="number" min={0} max={60} step="0.5" {...form.bind('years_of_experience')} /></Field>
          <div className="field-wide"><FormError message={action.error} /></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" busy={action.busy}>Add skill</Button></div>
        </form>
      )}
    </Modal>
  );
}
