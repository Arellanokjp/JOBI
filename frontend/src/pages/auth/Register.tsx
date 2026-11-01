import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { useToast } from '../../components/toast';
import { Button, Field, FormError } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useForm } from '../../lib/hooks';

type Kind = 'job-seeker' | 'employer';

export default function Register() {
  const navigate = useNavigate();
  const notify = useToast();
  const [kind, setKind] = useState<Kind>('job-seeker');
  const form = useForm({ first_name: '', last_name: '', email: '', phone_number: '', password: '' });
  const action = useAction();
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const v = form.values;
    const body = { ...v, email: v.email.trim(), first_name: v.first_name.trim(), last_name: v.last_name.trim(), phone_number: v.phone_number.trim() };
    const result = await action.run(() => api.publicPost<{ message: string }>(`/auth/register/${kind}`, body));
    if (result) {
      notify('Account created. Enter the 6-digit code we emailed you.');
      navigate(`/verify?email=${encodeURIComponent(body.email)}`);
    }
  };

  return (
    <AuthShell title="Create your account">
      <form className="stack" onSubmit={submit}>
        <div className="role-pick" role="radiogroup" aria-label="Account type">
          <label>
            <input type="radio" name="kind" checked={kind === 'job-seeker'} onChange={() => setKind('job-seeker')} />
            <strong>I'm looking for work</strong><span className="muted small">Job seeker</span>
          </label>
          <label>
            <input type="radio" name="kind" checked={kind === 'employer'} onChange={() => setKind('employer')} />
            <strong>I'm hiring</strong><span className="muted small">Employer</span>
          </label>
        </div>
        <div className="form-grid">
          <Field label="First name"><input placeholder="Enter your first name" required maxLength={50} autoComplete="given-name" {...form.bind('first_name')} /></Field>
          <Field label="Last name"><input placeholder="Enter your last name" required maxLength={50} autoComplete="family-name" {...form.bind('last_name')} /></Field>
          <Field label="Email" wide><input type="email" placeholder="Enter your email" required {...form.bind('email')} /></Field>
          <Field label="Phone number" wide><input type="tel" required maxLength={20} autoComplete="tel" placeholder="+254 700 000000" {...form.bind('phone_number')} /></Field>
          <Field label="Password" hint="At least 8 characters." wide><input type={showPassword ? "text" : "password"} placeholder="Enter your password" minLength={8} required {...form.bind('password')} /> <label>
        <input
          type="checkbox"
          checked={showPassword}
          onChange={() => setShowPassword(!showPassword)}
        />
        Show Password
      </label></Field>
        </div>
        <FormError message={action.error} />
        <Button type="submit" busy={action.busy}>Create account</Button>
        <p className="small">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
