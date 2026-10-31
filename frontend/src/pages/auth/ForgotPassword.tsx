import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { useToast } from '../../components/toast';
import { Button, Field, FormError } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useForm } from '../../lib/hooks';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const notify = useToast();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const form = useForm({ email: '', otp: '', newPassword: '' });
  const action = useAction();

  const request = async (event: FormEvent) => {
    event.preventDefault();
    const result = await action.run(() => api.publicPost<{ message: string }>('/auth/password-recovery/request', { email: form.values.email.trim() }));
    if (result) {
      notify(result.message);
      setStep('confirm');
    }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    const v = form.values;
    const result = await action.run(() => api.publicPost<{ message: string }>('/auth/password-recovery/confirm', { email: v.email.trim(), otp: v.otp, newPassword: v.newPassword }));
    if (result) {
      notify(result.message);
      navigate('/login');
    }
  };

  return (
    <AuthShell title="Reset your password">
      {step === 'request' ? (
        <form className="stack" onSubmit={request}>
          <p className="muted">Enter your account email and we'll send you a 6-digit reset code.</p>
          <Field label="Email"><input type="email" required {...form.bind('email')} /></Field>
          <FormError message={action.error} />
          <Button type="submit" busy={action.busy}>Send reset code</Button>
          <Link className="small" to="/login">Back to sign in</Link>
        </form>
      ) : (
        <form className="stack" onSubmit={confirm}>
          <p className="muted">If an account exists for {form.values.email}, a code is on its way.</p>
          <Field label="Reset code">
            <input className="otp" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" {...form.bind('otp')} />
          </Field>
          <Field label="New password" hint="At least 8 characters."><input type="password" required minLength={8} maxLength={128} autoComplete="new-password" {...form.bind('newPassword')} /></Field>
          <FormError message={action.error} />
          <Button type="submit" busy={action.busy}>Set new password</Button>
          <Button type="button" variant="ghost" onClick={() => setStep('request')}>Use a different email</Button>
        </form>
      )}
    </AuthShell>
  );
}
