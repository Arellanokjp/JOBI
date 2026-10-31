import { useState } from 'react';
import { EntryModal, type FieldSpec } from '../../components/EntryModal';
import { useToast } from '../../components/toast';
import { Button, ConfirmButton, Empty, ErrorNote, Loading, PageHeader, Panel, StatusBadge, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage, useAsync } from '../../lib/hooks';
import type { Lookup } from '../../lib/types';

type TabId = 'job-categories' | 'job-types' | 'skills';

const TABS: { id: TabId; label: string; singular: string; hasActive: boolean }[] = [
  { id: 'job-categories', label: 'Job categories', singular: 'category', hasActive: true },
  { id: 'job-types', label: 'Job types', singular: 'job type', hasActive: true },
  { id: 'skills', label: 'Skills', singular: 'skill', hasActive: false },
];

export default function Catalog() {
  const [tab, setTab] = useState<TabId>('job-categories');
  const meta = TABS.find((t) => t.id === tab)!;
  return (
    <>
      <PageHeader title="Categories & skills" subtitle="The lists employers and job seekers choose from." />
      <Tabs<TabId> value={tab} onChange={setTab} tabs={TABS.map(({ id, label }) => ({ id, label }))} />
      <Section key={tab} path={tab} singular={meta.singular} hasActive={meta.hasActive} />
    </>
  );
}

function Section({ path, singular, hasActive }: { path: TabId; singular: string; hasActive: boolean }) {
  const notify = useToast();
  const list = useAsync(() => api.get<Lookup[]>(`/${path}`), [path]);
  const [dialog, setDialog] = useState<null | { item?: Lookup }>(null);

  const fields: FieldSpec[] = [
    { name: 'name', label: 'Name', required: true, wide: true },
    { name: 'description', label: 'Description', wide: true },
    ...(hasActive ? [{ name: 'is_active', label: 'Available to choose', type: 'checkbox' as const }] : []),
  ];

  const remove = async (item: Lookup) => {
    try { await api.del(`/${path}/${item.id}`); notify('Removed.'); list.reload(); }
    catch (err) { notify(errorMessage(err), 'error'); }
  };

  return (
    <Panel title={`${list.data?.length ?? 0} ${singular}${list.data?.length === 1 ? '' : 's'}`} actions={<Button onClick={() => setDialog({})}>Add {singular}</Button>}>
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.length === 0 && <Empty title={`No ${singular}s yet`} />}
      {list.data?.map((item) => (
        <div className="entry" key={item.id}>
          <div>
            <h3>{item.name} {hasActive && item.is_active === false && <StatusBadge status="INACTIVE" />}</h3>
            {item.description && <p className="muted small">{item.description}</p>}
          </div>
          <div className="inline">
            <Button variant="ghost" onClick={() => setDialog({ item })}>Edit</Button>
            <ConfirmButton label="Delete" message={`Delete “${item.name}”? This fails if it is still in use.`} onConfirm={() => remove(item)} />
          </div>
        </div>
      ))}
      {dialog && (
        <EntryModal
          title={dialog.item ? `Edit ${singular}` : `Add ${singular}`}
          fields={fields}
          initial={dialog.item ? { name: dialog.item.name, description: dialog.item.description ?? '', is_active: dialog.item.is_active ?? true } : { is_active: true }}
          onClose={() => setDialog(null)}
          onSubmit={async (v) => {
            if (dialog.item) await api.patch(`/${path}/${dialog.item.id}`, v);
            else await api.post(`/${path}`, v);
            notify('Saved.');
            list.reload();
            return true;
          }}
        />
      )}
    </Panel>
  );
}
