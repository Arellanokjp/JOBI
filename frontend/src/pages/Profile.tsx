import type { FormEvent } from 'react';
import { useToast } from '../components/toast';
import { Button, Field, FormError, PageHeader, Panel } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAction, useForm } from '../lib/hooks';

export default function Profile() {
  const { user, refresh } = useAuth();
  const notify = useToast();
  const form = useForm({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    phone_number: user?.phone_number ?? '',
  });
  const action = useAction();
  if (!user) return null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const done = await action.run(async () => {
      await api.patch(`/users/${user.id}`, form.values);
      await refresh();
      return true;
    });
    if (done) notify('Profile saved.');
  };

  return (
    <>
      <PageHeader title="Your profile" subtitle={user.email} />
      <Panel>
        <form className="form-grid" onSubmit={save}>
          <Field label="First name"><input required maxLength={50} {...form.bind('first_name')} /></Field>
          <Field label="Last name"><input required maxLength={50} {...form.bind('last_name')} /></Field>
          <Field label="Phone number" wide><input required maxLength={20} {...form.bind('phone_number')} /></Field>
          <Field label="Email" hint="Your email is your sign-in and can't be changed here." wide><input value={user.email} disabled readOnly /></Field>
          <div className="field-wide"><FormError message={action.error} /></div>
          <div className="form-actions"><Button type="submit" busy={action.busy}>Save changes</Button></div>
        </form>
      </Panel>
    </>
  );
}
