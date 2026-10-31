import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { Button, Field, FormError } from '../../components/ui';
import { useAction, useForm } from '../../lib/hooks';
import { homeFor, useAuth } from '../../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const form = useForm({ email: '', password: '' });
  const action = useAction();
  const [needsVerify, setNeedsVerify] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setNeedsVerify(false);
    const user = await action.run(() => login(form.values.email.trim(), form.values.password));
    if (user) navigate(from && from !== '/' ? from : homeFor(user.role), { replace: true });
    else setNeedsVerify(/verify your email/i.test(action.error ?? ''));
  };

  return (
    <AuthShell title="Sign in">
      <form className="stack" onSubmit={submit}>
        <Field label="Email"><input type="email" autoComplete="email" required {...form.bind('email')} /></Field>
        <Field label="Password"><input type="password" autoComplete="current-password" minLength={8} required {...form.bind('password')} /></Field>
        <FormError message={action.error} />
        {(needsVerify || /verify your email/i.test(action.error ?? '')) && (
          <p className="small">Your email isn't verified yet. <Link to={`/verify?email=${encodeURIComponent(form.values.email)}`}>Enter your code</Link>.</p>
        )}
        <Button type="submit" busy={action.busy}>Sign in</Button>
        <div className="spread small">
          <Link to="/forgot">Forgot your password?</Link>
          <span>New here? <Link to="/register">Create an account</Link></span>
        </div>
      </form>
    </AuthShell>
  );
}
