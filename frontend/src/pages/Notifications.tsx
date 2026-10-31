import { useToast } from '../components/toast';
import { Button, Empty, ErrorNote, Loading, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { errorMessage, useAsync } from '../lib/hooks';
import type { Notification } from '../lib/types';

const refreshBadge = () => window.dispatchEvent(new Event('jobi:notifications'));

export default function Notifications() {
  const notify = useToast();
  const list = useAsync(() => api.get<Notification[]>('/notifications'), []);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      list.reload();
      refreshBadge();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const unread = list.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : 'You’re all caught up.'}
        actions={unread > 0 ? <Button variant="ghost" onClick={() => void run(() => api.patch('/notifications/read-all'))}>Mark all as read</Button> : undefined}
      />
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="Nothing here yet">Updates about applications, interviews and approvals will show up here.</Empty>}
      <div className="timeline">
        {list.data?.map((n) => (
          <article key={n.id} className={`notif${n.is_read ? '' : ' unread'}`}>
            <span className="dot" aria-hidden="true" />
            <div className="grow">
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <p className="muted small">{fmtDateTime(n.created_at)}</p>
            </div>
            <div className="stack-sm">
              {!n.is_read && <Button variant="ghost" onClick={() => void run(() => api.patch(`/notifications/${n.id}/read`))}>Mark read</Button>}
              <Button variant="ghost" onClick={() => void run(() => api.del(`/notifications/${n.id}`))}>Delete</Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
