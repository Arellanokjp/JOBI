// Shapes returned by the JOBI backend (only the fields the UI uses).

export type Role = 'ADMIN' | 'EMPLOYER' | 'JOB_SEEKER';

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: Role;
}

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type ApplicationStatus =
  | 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'INTERVIEW_SCHEDULED'
  | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
export type FieldType =
  | 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'RADIO' | 'MULTISELECT' | 'CHECKBOX' | 'FILE';

export interface Lookup { id: string; name: string; description?: string | null; is_active?: boolean }

export interface CompanySummary {
  id: string; company_name: string; logo_url?: string | null;
  city?: string; county?: string; country?: string; verification_status?: VerificationStatus;
}

export interface Company extends CompanySummary {
  registration_number: string; tax_pin: string; email: string; phone_number: string;
  website?: string | null; industry?: string | null; description?: string | null;
  physical_address: string; postal_address?: string | null;
  verification_status: VerificationStatus; verified_at?: string | null;
}

export interface Branch {
  id: string; company_id: string; branch_name: string; country: string; county: string; city: string;
  physical_address: string; phone_number?: string | null; email?: string | null; is_head_office: boolean;
}

export interface CompanyDocument {
  id: string; company_id: string; document_type: string; document_number?: string | null;
  file_url: string; original_file_name?: string | null; document_status: VerificationStatus;
  rejection_reason?: string | null; expires_at?: string | null;
}

export interface VerificationAttempt {
  id: string; company_id: string; attempt_number: number; status: VerificationStatus;
  reason?: string | null; created_at: string; reviewed_at?: string | null;
  companies?: { id: string; company_name: string; verification_status: VerificationStatus };
}

export interface Job {
  id: string; company_id: string; category_id: string; job_type_id: string;
  title: string; description: string; requirements: string; responsibilities?: string | null;
  salary_min?: string | null; salary_max?: string | null; salary_currency?: string | null;
  location?: string | null; is_remote: boolean; application_deadline?: string | null;
  status: JobStatus; published_at?: string | null; created_at: string;
  companies: CompanySummary; job_categories: { id: string; name: string }; job_types: { id: string; name: string };
  application_forms?: { id: string; is_active: boolean } | null;
}

export interface AppField {
  id: string; application_form_id: string; field_name: string; field_label: string; field_type: FieldType;
  placeholder?: string | null; help_text?: string | null; is_required: boolean;
  field_options?: string[] | null; display_order: number;
}
export interface AppForm {
  id: string; job_id: string; title: string; description?: string | null; is_active: boolean;
  application_fields: AppField[];
}

export interface AppResponse {
  id: string; response_text?: string | null; response_number?: string | null;
  response_date?: string | null; file_url?: string | null; application_fields: AppField;
}

export interface Person {
  id: string; first_name: string; last_name: string; email: string; phone_number: string;
  profile_photo_url?: string | null;
}

export interface Interview {
  id: string; application_id: string; interview_type: 'IN_PERSON' | 'VIDEO' | 'PHONE';
  scheduled_at: string; duration_minutes?: number | null; meeting_url?: string | null;
  location?: string | null; notes?: string | null; status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  applications?: { id: string; status: ApplicationStatus; job_id: string; jobs: { id: string; title: string }; users: Person };
}

export interface Application {
  id: string; job_id: string; applicant_user_id: string; resume_id?: string | null;
  status: ApplicationStatus; applied_at: string; withdrawn_at?: string | null;
  jobs: { id: string; title: string; status: JobStatus; company_id: string; companies: CompanySummary };
  users?: Person; resumes?: Resume | null;
  application_responses?: AppResponse[]; interviews?: Interview[];
}

export interface Education {
  id: string; institution_name: string; qualification: string; field_of_study?: string | null;
  start_date?: string | null; end_date?: string | null; description?: string | null;
}
export interface Experience {
  id: string; company_name: string; job_title: string; employment_type?: string | null;
  location?: string | null; start_date: string; end_date?: string | null; is_current: boolean; description?: string | null;
}
export interface Certification {
  id: string; certification_name: string; issuing_organization: string; credential_id?: string | null;
  issue_date?: string | null; expiry_date?: string | null; credential_url?: string | null;
}
export interface ResumeSkill {
  id: string; skill_id: string; proficiency_level?: string | null; years_of_experience?: string | null;
  skills: { id: string; name: string };
}
export interface Resume {
  id: string; user_id: string; professional_summary?: string | null; resume_file_url?: string | null;
  education: Education[]; experience: Experience[]; certifications: Certification[]; resume_skills: ResumeSkill[];
}

export interface SavedJob { id: string; job_id: string; saved_at: string; jobs: Job }

export interface Notification {
  id: string; title: string; message: string; notification_type: string; is_read: boolean; created_at: string;
}

export interface AdminUser {
  id: string; first_name: string; last_name: string; email: string; phone_number: string;
  email_verified: boolean; account_status: string; last_login_at?: string | null; created_at: string;
  roles: { id: string; name: Role };
}

export interface AuditLog {
  id: string; user_id?: string | null; action: string; entity_type: string; entity_id?: string | null;
  description?: string | null; created_at: string;
}
