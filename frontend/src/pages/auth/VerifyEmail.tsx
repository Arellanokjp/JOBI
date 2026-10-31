import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { useToast } from '../../components/toast';
import { Button, Field, FormError } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useForm } from '../../lib/hooks';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notify = useToast();
  const form = useForm({ email: params.get('email') ?? '', otp: '' });
  const verify = useAction();
  const resend = useAction();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await verify.run(() => api.publicPost<{ message: string }>('/auth/email/verify-otp', { email: form.values.email.trim(), otp: form.values.otp }));
    if (result) {
      notify(result.message);
      navigate('/login');
    }
  };

  const sendAgain = async () => {
    const result = await resend.run(() => api.publicPost<{ message: string }>('/auth/email/resend-otp', { email: form.values.email.trim() }));
    if (result) {
      notify(result.message);
      setCooldown(60);
    }
  };

  return (
    <AuthShell title="Verify your email">
      <form className="stack" onSubmit={submit}>
        <p className="muted">Enter the 6-digit code we sent to your email. It expires after 10 minutes.</p>
        <Field label="Email"><input type="email" required {...form.bind('email')} /></Field>
        <Field label="Verification code">
          <input className="otp" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" {...form.bind('otp')} />
        </Field>
        <FormError message={verify.error ?? resend.error} />
        <Button type="submit" busy={verify.busy}>Verify email</Button>
        <div className="spread small">
          <Button type="button" variant="ghost" busy={resend.busy} disabled={cooldown > 0 || !form.values.email} onClick={sendAgain}>
            {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send a new code'}
          </Button>
          <Link to="/login">Back to sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}
