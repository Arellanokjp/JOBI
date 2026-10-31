import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EntryModal, type FieldSpec } from '../../components/EntryModal';
import { useToast } from '../../components/toast';
import { Button, Empty, ErrorNote, Loading, PageHeader, Panel, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate, fmtDateTime, fullName, humanize } from '../../lib/format';
import { errorMessage, useAction, useAsync } from '../../lib/hooks';
import type { Application, Resume } from '../../lib/types';

const NEXT = ['UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED', 'REJECTED'];
const FINAL = ['HIRED', 'REJECTED', 'WITHDRAWN'];

const INTERVIEW: FieldSpec[] = [
  { name: 'interview_type', label: 'Format', type: 'select', required: true, options: [{ value: 'VIDEO', label: 'Video call' }, { value: 'IN_PERSON', label: 'In person' }, { value: 'PHONE', label: 'Phone' }] },
  { name: 'scheduled_at', label: 'Date and time', type: 'datetime-local', required: true },
  { name: 'duration_minutes', label: 'Length (minutes)', type: 'number' },
  { name: 'meeting_url', label: 'Meeting link', type: 'url', hint: 'Required for video calls.' },
  { name: 'location', label: 'Location', wide: true, hint: 'Required for in-person interviews.' },
  { name: 'notes', label: 'Private notes', type: 'textarea', hint: 'Only your team can see these.' },
];

export default function ApplicantDetail() {
  const { id = '' } = useParams();
  const notify = useToast();
  const app = useAsync(() => api.get<Application>(`/applications/${id}`), [id]);
  const resume = useAsync(async () => {
    const rid = app.data?.resume_id;
    return rid ? api.get<Resume>(`/resumes/${rid}`) : null;
  }, [app.data?.resume_id]);
  const [status, setStatus] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const change = useAction();

  if (app.loading && !app.data) return <Loading />;
  if (app.error || !app.data) return <ErrorNote message={app.error ?? 'Application not found.'} onRetry={app.reload} />;
  const a = app.data;
  const locked = FINAL.includes(a.status);

  const saveStatus = async () => {
    const ok = await change.run(() => api.patch(`/applications/${a.id}`, { status }));
    if (ok) { notify('Status updated. The candidate has been notified.'); setStatus(''); app.reload(); }
  };

  return (
    <>
      <PageHeader
        title={fullName(a.users)}
        subtitle={`Applied for ${a.jobs.title} on ${fmtDate(a.applied_at)}`}
        actions={<><StatusBadge status={a.status} /><Link className="btn btn-ghost" to="/applicants">All applicants</Link></>}
      />

      <Panel title="Decision">
        {locked ? <p className="muted">This application is {humanize(a.status).toLowerCase()} and can't be changed.</p> : (
          <div className="inline">
            <select style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="New status">
              <option value="">Move to…</option>
              {NEXT.filter((s) => s !== a.status).map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
            <Button disabled={!status} busy={change.busy} onClick={saveStatus}>Update status</Button>
            <Button variant="ghost" onClick={() => setScheduling(true)}>Schedule interview</Button>
          </div>
        )}
        {change.error && <p className="form-error" style={{ marginTop: '.75rem' }}>{change.error}</p>}
      </Panel>

      <Panel title="Contact">
        <dl className="kv">
          <dt>Email</dt><dd><a href={`mailto:${a.users?.email}`}>{a.users?.email}</a></dd>
          <dt>Phone</dt><dd>{a.users?.phone_number}</dd>
        </dl>
      </Panel>

      {(a.application_responses?.length ?? 0) > 0 && (
        <Panel title="Answers to your questions">
          <dl className="kv">
            {a.application_responses!.map((r) => (
              <div key={r.id} style={{ display: 'contents' }}>
                <dt>{r.application_fields.field_label}</dt>
                <dd className="pre">{r.response_text ?? r.response_number ?? (r.response_date ? fmtDate(r.response_date) : r.file_url ? <a href={r.file_url} target="_blank" rel="noreferrer">Open file</a> : '')}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      <Panel title="Resume">
        {!a.resume_id && <Empty title="No resume attached" />}
        {resume.loading && a.resume_id && <Loading />}
        {resume.error && <ErrorNote message={resume.error} onRetry={resume.reload} />}
        {resume.data && <ResumeView resume={resume.data} />}
      </Panel>

      {(a.interviews?.length ?? 0) > 0 && (
        <Panel title="Interviews">
          {a.interviews!.map((i) => (
            <div className="entry" key={i.id}>
              <div>
                <h3>{fmtDateTime(i.scheduled_at)} · {humanize(i.interview_type)}</h3>
                <p className="muted small">{[i.location, i.meeting_url].filter(Boolean).join(' · ')}</p>
                {i.notes && <p className="small">Notes: {i.notes}</p>}
              </div>
              <StatusBadge status={i.status} />
            </div>
          ))}
        </Panel>
      )}

      {scheduling && (
        <EntryModal
          wide title="Schedule interview" submitLabel="Schedule" fields={INTERVIEW}
          initial={{ interview_type: 'VIDEO' }}
          onClose={() => setScheduling(false)}
          onSubmit={async (values) => {
            try {
              await api.post('/interviews', { ...values, application_id: a.id });
              notify('Interview scheduled. The candidate has been notified.');
              app.reload();
              return true;
            } catch (err) { throw new Error(errorMessage(err)); }
          }}
        />
      )}
    </>
  );
}

function ResumeView({ resume: r }: { resume: Resume }) {
  return (
    <div className="stack">
      {r.professional_summary && <p className="pre">{r.professional_summary}</p>}
      {r.resume_file_url && <p><a href={r.resume_file_url} target="_blank" rel="noreferrer">Open CV file</a></p>}
      {r.experience.length > 0 && <div><h3>Experience</h3>{r.experience.map((x) => (
        <p key={x.id}><strong>{x.job_title}</strong>, {x.company_name} <span className="muted small">({fmtDate(x.start_date)} – {x.is_current ? 'present' : fmtDate(x.end_date)})</span></p>
      ))}</div>}
      {r.education.length > 0 && <div><h3>Education</h3>{r.education.map((x) => (
        <p key={x.id}><strong>{x.qualification}</strong>, {x.institution_name}</p>
      ))}</div>}
      {r.certifications.length > 0 && <div><h3>Certifications</h3>{r.certifications.map((x) => (
        <p key={x.id}>{x.certification_name} <span className="muted small">— {x.issuing_organization}</span></p>
      ))}</div>}
      {r.resume_skills.length > 0 && <div><h3>Skills</h3><div className="chips">{r.resume_skills.map((s) => (
        <span className="chip" key={s.id}>{s.skills.name}{s.proficiency_level ? ` · ${s.proficiency_level.toLowerCase()}` : ''}</span>
      ))}</div></div>}
    </div>
  );
}
