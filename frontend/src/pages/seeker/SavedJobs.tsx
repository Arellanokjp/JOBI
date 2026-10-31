import { Link } from 'react-router-dom';
import { JobRow } from '../../components/JobRow';
import { useToast } from '../../components/toast';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage, useAsync } from '../../lib/hooks';
import type { SavedJob } from '../../lib/types';

export default function SavedJobs() {
  const notify = useToast();
  const list = useAsync(() => api.get<SavedJob[]>('/saved-jobs'), []);

  const remove = async (id: string) => {
    try {
      await api.del(`/saved-jobs/${id}`);
      notify('Removed from saved jobs.');
      list.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader title="Saved jobs" subtitle="Jobs you're keeping an eye on." />
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title="Nothing saved yet"><Link to="/jobs">Find jobs</Link> and tap Save to keep them here.</Empty>}
      <div className="job-list">
        {list.data?.map((s) => (
          <JobRow key={s.id} job={s.jobs} showStatus saved onToggleSave={() => void remove(s.id)} />
        ))}
      </div>
    </>
  );
}
