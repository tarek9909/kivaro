import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ChevronDown, Eye, LogIn, Pencil, Percent, Plus, Save, Search, Store, ToggleLeft, Users } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useTranslation } from '@/app/i18n.js';
import { Badge, Button, DataTable, GlassPanel, GlassPanelBody, GlassPanelHeader, Input, Modal, PageHeader, Pagination, Select, Switch, Textarea } from '@/components/ui/index.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' }
];

const STATUS_TONES = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warn'
};

const STORE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'modules', label: 'Modules' },
  { id: 'settings', label: 'Settings' }
];

const EMPTY_STORE = {
  name: '',
  code: '',
  slug: '',
  status: 'active',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  currency_code: 'USD',
  vat_enabled: false,
  vat_rate: '',
  notes: '',
  owner_full_name: '',
  owner_username: '',
  owner_email: '',
  owner_phone: '',
  owner_password: ''
};

export default function SuperadminDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { storeSlug, tab } = useParams();
  const startImpersonation = useAuthStore((state) => state.startImpersonation);
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = useMemo(() => {
    const next = { page, limit: 20 };
    if (debouncedSearch) next.search = debouncedSearch;
    if (status) next.status = status;
    return next;
  }, [debouncedSearch, page, status]);

  const storesQuery = useQuery({
    queryKey: ['superadmin', 'stores', params],
    queryFn: () => api.superadmin.stores.list(params)
  });

  const platformSettingsQuery = useQuery({
    queryKey: ['superadmin', 'platform-settings'],
    queryFn: () => api.superadmin.platformSettings.get(),
    staleTime: 5 * 60_000
  });

  const selectedStoreQuery = useQuery({
    queryKey: ['superadmin', 'stores', selectedId],
    queryFn: () => api.superadmin.stores.get(selectedId),
    enabled: Boolean(selectedId && !storeSlug)
  });

  const slugStoreQuery = useQuery({
    queryKey: ['superadmin', 'stores', 'slug', storeSlug],
    queryFn: () => api.superadmin.stores.getBySlug(storeSlug),
    enabled: Boolean(storeSlug)
  });

  useEffect(() => {
    if (!storeSlug || tab === 'overview') return;
    const isKnownTab = STORE_TABS.some((item) => item.id === tab);
    if (!tab || !isKnownTab) {
      navigate(`/superadmin/${storeSlug}/overview`, { replace: true });
    }
  }, [navigate, storeSlug, tab]);

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }) => api.superadmin.stores.updateStatus(id, { status: nextStatus }),
    onSuccess: () => {
      toast.success('Store status updated');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'stores'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update store status.'))
  });

  const moduleMutation = useMutation({
    mutationFn: ({ id, modules }) => api.superadmin.stores.modules.replace(id, { modules }),
    onSuccess: () => {
      toast.success('Modules updated');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'stores'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update modules.'))
  });

  const impersonateMutation = useMutation({
    mutationFn: (id) => api.superadmin.stores.impersonate(id),
    onSuccess: (response) => {
      startImpersonation(response?.data);
      toast.success('Entered store');
      navigate('/');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not enter store.'))
  });

  const stores = storesQuery.data?.data?.stores || [];
  const meta = storesQuery.data?.meta || {};
  const selectedStore = storeSlug
    ? slugStoreQuery.data?.data?.store || null
    : selectedStoreQuery.data?.data?.store || null;
  const editingStoreDetail = selectedStore?.id === editingStore?.id ? selectedStore : editingStore;

  const activeTab = STORE_TABS.some((item) => item.id === tab) ? tab : 'overview';
  const storeUrlPrefix = platformSettingsQuery.data?.data?.platform_settings?.store_url_prefix || 'store';

  const columns = [
    {
      id: 'name',
      header: 'Store',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-50">{row.name}</p>
          <p className="truncate text-xs text-ink-400">
            {row.code}{row.slug ? ` / ${row.slug}` : ''}
          </p>
        </div>
      )
    },
    { id: 'email', header: 'Email', cell: (row) => row.email || '-' },
    { id: 'phone', header: 'Phone', cell: (row) => row.phone || '-' },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <Badge tone={STATUS_TONES[row.status] || 'neutral'}>{row.status}</Badge>
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          <Button
            variant="ghost"
            leftIcon={Pencil}
            aria-label={`Edit ${row.name}`}
            onClick={() => {
              setSelectedId(row.id);
              setEditingStore(row);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            leftIcon={LogIn}
            isLoading={impersonateMutation.isPending}
            onClick={() => impersonateMutation.mutate(row.id)}
          >
            {t('superadmin.enterStore')}
          </Button>
          <Button
            variant="ghost"
            leftIcon={Eye}
            onClick={() => navigate(`/superadmin/${row.slug}/overview`)}
          >
            Open
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              statusMutation.mutate({
                id: row.id,
                nextStatus: row.status === 'active' ? 'suspended' : 'active'
              })
            }
          >
            {row.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
        </div>
      )
    }
  ];

  if (storeSlug) {
    return (
      <>
        <StoreDetailPage
          store={selectedStore}
          slug={storeSlug}
          storeUrlPrefix={storeUrlPrefix}
          activeTab={activeTab}
          isLoading={slugStoreQuery.isFetching}
          isError={slugStoreQuery.isError}
          error={slugStoreQuery.error}
          onRetry={() => slugStoreQuery.refetch()}
          onBack={() => navigate('/superadmin')}
          onTabChange={(nextTab) => navigate(`/superadmin/${storeSlug}/${nextTab}`)}
          onEdit={() => setEditingStore(selectedStore)}
          onEnter={() => selectedStore && impersonateMutation.mutate(selectedStore.id)}
          isEntering={impersonateMutation.isPending}
          onToggleModule={(moduleKey, enabled) => {
            if (!selectedStore) return;
            const modules = selectedStore.modules.map((module) => ({
              module_key: module.key,
              enabled: module.key === moduleKey ? enabled : module.enabled
            }));
            moduleMutation.mutate({ id: selectedStore.id, modules });
          }}
        />
        <StoreFormModal
          open={Boolean(editingStore)}
          onClose={() => setEditingStore(null)}
          store={editingStore}
          onSaved={(store) => {
            const oldSlug = storeSlug;
            setEditingStore(null);
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'stores'] });
            if (oldSlug) {
              queryClient.invalidateQueries({ queryKey: ['superadmin', 'stores', 'slug', oldSlug] });
            }
            queryClient.invalidateQueries({ queryKey: ['superadmin', 'stores', 'slug', store.slug] });
            if (store.slug && store.slug !== oldSlug) {
              navigate(`/superadmin/${store.slug}/${activeTab}`, { replace: true });
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Superadmin"
        description="Manage stores, access, and enabled workspace modules."
        actions={
          <Button leftIcon={Plus} onClick={() => setFormOpen(true)}>
            New store
          </Button>
        }
      />

      <section className="space-y-4">
        <PlatformSettingsCard
          settings={platformSettingsQuery.data?.data?.platform_settings}
          isLoading={platformSettingsQuery.isPending}
          isError={platformSettingsQuery.isError}
          error={platformSettingsQuery.error}
          onRetry={() => platformSettingsQuery.refetch()}
        />
        <GlassPanel>
          <GlassPanelBody>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <Input
                label="Search stores"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                leftIcon={Search}
                placeholder="Name, code, email, or phone"
              />
              <Select
                label="Status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </GlassPanelBody>
        </GlassPanel>

        <DataTable
          columns={columns}
          rows={stores}
          rowKey={(row) => row.id}
          isLoading={storesQuery.isPending}
          isError={storesQuery.isError}
          error={storesQuery.error}
          onRetry={() => storesQuery.refetch()}
          onRowClick={(row) => navigate(`/superadmin/${row.slug}/overview`)}
          empty={{
            title: 'No stores found',
            description: 'Create the first store or adjust the filters.',
            icon: Store
          }}
          footer={
            <Pagination
              page={meta.page || page}
              totalPages={meta.totalPages || 1}
              total={meta.total}
              limit={meta.limit || 20}
              onChange={setPage}
            />
          }
        />
      </section>

      <StoreFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(store) => {
          setFormOpen(false);
          navigate(`/superadmin/${store.slug}/overview`);
          queryClient.invalidateQueries({ queryKey: ['superadmin', 'stores'] });
        }}
      />
      <StoreFormModal
        open={Boolean(editingStore)}
        onClose={() => setEditingStore(null)}
        store={editingStoreDetail}
        onSaved={(store) => {
          setEditingStore(null);
          setSelectedId(store.id);
          queryClient.invalidateQueries({ queryKey: ['superadmin', 'stores'] });
        }}
      />
    </div>
  );
}

function PlatformSettingsCard({ settings, isLoading, isError, error, onRetry }) {
  const queryClient = useQueryClient();
  const [prefix, setPrefix] = useState('store');

  useEffect(() => {
    if (settings?.store_url_prefix) {
      setPrefix(settings.store_url_prefix);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (payload) => api.superadmin.platformSettings.update(payload),
    onSuccess: () => {
      toast.success('Workspace URL prefix saved');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'platform-settings'] });
      useAuthStore.getState().refreshUser?.();
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError, 'Could not save workspace URL prefix.'))
  });

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate({ store_url_prefix: prefix });
  }

  return (
    <GlassPanel>
      <GlassPanelHeader
        icon={Store}
        title="Store workspace URL"
        subtitle="Set the global first URL segment for store workspaces."
      />
      <GlassPanelBody>
        {isLoading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        ) : isError ? (
          <div className="space-y-3 text-sm text-ink-300">
            <p>{getErrorMessage(error, 'Could not load platform settings.')}</p>
            <Button variant="secondary" onClick={onRetry}>Retry</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" noValidate>
            <Input
              label="URL prefix"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              description={`Store dashboard URLs use /${prefix || 'store'}/store-slug.`}
              required
            />
            <div className="flex items-end">
              <Button type="submit" leftIcon={Save} isLoading={mutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </GlassPanelBody>
    </GlassPanel>
  );
}

function StoreDetailPage({
  store,
  slug,
  storeUrlPrefix,
  activeTab,
  isLoading,
  isError,
  error,
  onRetry,
  onBack,
  onTabChange,
  onEdit,
  onEnter,
  isEntering,
  onToggleModule
}) {
  const [metricsExpanded, setMetricsExpanded] = useState(true);
  const [modulesExpanded, setModulesExpanded] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Store workspace"
        title={store?.name || slug}
        description={store?.code ? `${store.code} / ${store.slug}` : 'Loading store workspace...'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onBack}>
              Stores
            </Button>
            <Button variant="ghost" leftIcon={Pencil} onClick={onEdit} disabled={!store}>
              Edit
            </Button>
            <Button leftIcon={LogIn} onClick={onEnter} disabled={!store} isLoading={isEntering}>
              Enter store
            </Button>
          </div>
        }
      />

      <GlassPanel>
        <GlassPanelBody className="grid grid-cols-3 gap-2 p-2 sm:flex">
          {STORE_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === item.id
                  ? 'bg-white/12 text-ink-50 shadow-glass'
                  : 'text-ink-300 hover:bg-white/5 hover:text-ink-100'
              }`}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </GlassPanelBody>
      </GlassPanel>

      {isLoading ? (
        <GlassPanel>
          <GlassPanelBody className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </GlassPanelBody>
        </GlassPanel>
      ) : isError ? (
        <GlassPanel>
          <GlassPanelBody className="space-y-3">
            <p className="text-sm font-medium text-ink-50">Store not found</p>
            <p className="text-sm text-ink-300">
              {getErrorMessage(error, 'Could not load this store.')}
            </p>
            <Button variant="secondary" onClick={onRetry}>Retry</Button>
          </GlassPanelBody>
        </GlassPanel>
      ) : store ? (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMetricsExpanded(!metricsExpanded)}
                className="flex w-full items-center justify-between gap-3 font-display text-sm font-semibold text-ink-50 hover:text-ink-200 focus:outline-none transition-colors"
              >
                <span>Summary Metrics</span>
                <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform duration-300 ${metricsExpanded ? 'rotate-180' : ''}`} />
              </button>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${metricsExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  <SummaryCard icon={Users} label="Users" value={store?.summary?.users_count ?? '-'} />
                  <SummaryCard icon={Store} label="Warehouses" value={store?.summary?.warehouses_count ?? '-'} />
                  <SummaryCard icon={Building2} label="Customers" value={store?.summary?.customers_count ?? '-'} />
                  <SummaryCard icon={ToggleLeft} label="Items" value={store?.summary?.items_count ?? '-'} />
                  <SummaryCard
                    icon={Percent}
                    label="VAT"
                    value={store?.vat?.enabled ? `${store.vat.rate || 0}%` : 'Disabled'}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-3 border-t border-white/5 pt-5">
              <button
                type="button"
                onClick={() => setModulesExpanded(!modulesExpanded)}
                className="flex w-full items-center justify-between gap-3 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-sm font-semibold text-ink-50 hover:text-ink-200 transition-colors">Modules</h2>
                  {store?.status && <Badge tone={STATUS_TONES[store.status] || 'neutral'}>{store.status}</Badge>}
                </div>
                <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform duration-300 ${modulesExpanded ? 'rotate-180' : ''}`} />
              </button>
              <div className={`transition-all duration-300 ease-in-out ${modulesExpanded ? 'max-h-[2000px] opacity-100 overflow-visible pt-2' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <ModuleToggleList
                  modules={store?.modules || []}
                  values={Object.fromEntries((store?.modules || []).map((module) => [module.key, module.enabled]))}
                  onToggle={onToggleModule}
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <GlassPanel>
              <GlassPanelHeader
                icon={Store}
                title="Store settings"
                subtitle="Core identity, contact details, and VAT settings for this workspace."
              />
              <GlassPanelBody className="grid gap-3 md:grid-cols-2">
                <SummaryCard icon={Store} label="Code" value={store.code || '-'} />
                <SummaryCard icon={Building2} label="Slug" value={store.slug || '-'} />
                <SummaryCard icon={Store} label="Workspace URL" value={`/${storeUrlPrefix || 'store'}/${store.slug}`} />
                <SummaryCard icon={Percent} label="VAT" value={store.vat?.enabled ? `${store.vat.rate || 0}%` : 'Disabled'} />
                <SummaryCard icon={ToggleLeft} label="Status" value={store.status || '-'} />
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 md:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Contact</p>
                  <p className="mt-2 text-sm text-ink-100">{store.contact_name || '-'}</p>
                  <p className="text-sm text-ink-300">{store.email || '-'}</p>
                  <p className="text-sm text-ink-300">{store.phone || '-'}</p>
                  <p className="mt-2 text-sm text-ink-300">{store.address || '-'}</p>
                </div>
              </GlassPanelBody>
            </GlassPanel>
          )}
        </div>
      ) : (
        <GlassPanel>
          <GlassPanelBody className="text-sm text-ink-300">
            No store details loaded.
          </GlassPanelBody>
        </GlassPanel>
      )}
    </div>
  );
}

function ModuleToggleList({ modules = [], values = {}, onToggle, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-ink-300">
        Loading features...
      </div>
    );
  }

  const moduleGroups = modules
    .filter((module) => module.type !== 'feature')
    .map((module) => ({
      ...module,
      enabled: values[module.key] ?? module.enabled ?? true,
      features: modules
        .filter((feature) => feature.parentKey === module.key)
        .map((feature) => ({
          ...feature,
          enabled: values[feature.key] ?? feature.enabled ?? true
        }))
    }));

  return (
    <div className="space-y-3">
      {moduleGroups.map((module) => (
        <div key={module.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-50">{module.label}</p>
              <p className="text-xs text-ink-400">
                {module.features.length ? `${module.features.length} tab pages` : 'Module access'}
              </p>
            </div>
            <Switch
              checked={module.enabled}
              onChange={(checked) => onToggle(module.key, checked)}
              label={module.enabled ? 'Enabled' : 'Disabled'}
            />
          </div>
          {module.features.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {module.features.map((feature) => (
                <Switch
                  key={feature.key}
                  checked={feature.enabled}
                  disabled={!module.enabled}
                  onChange={(checked) => onToggle(feature.key, checked)}
                  label={feature.label}
                  description={feature.enabled ? 'Enabled' : 'Disabled'}
                  className="p-2"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <Icon className="h-4 w-4 text-brand-300" aria-hidden="true" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="text-lg font-semibold text-ink-50">{value}</p>
    </div>
  );
}

function formFromStore(store) {
  if (!store) return EMPTY_STORE;
  return {
    ...EMPTY_STORE,
    name: store.name || '',
    code: store.code || '',
    slug: store.slug || '',
    status: store.status || 'active',
    contact_name: store.contact_name || '',
    phone: store.phone || '',
    email: store.email || '',
    address: store.address || '',
    currency_code: store.currency_code || 'USD',
    vat_enabled: Boolean(store.vat?.enabled),
    vat_rate: store.vat?.rate === undefined || store.vat?.rate === null ? '' : String(store.vat.rate),
    notes: store.notes || ''
  };
}

function modulesFromRows(rows = []) {
  return Object.fromEntries(rows.map((module) => [module.key, module.enabled !== false]));
}

function StoreFormModal({ open, onClose, onCreated, onSaved, store }) {
  const isEdit = Boolean(store);
  const { t } = useTranslation();
  const [form, setForm] = useState(() => formFromStore(store));
  const [modules, setModules] = useState({});
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [ownerExpanded, setOwnerExpanded] = useState(false);

  const queryClient = useQueryClient();
  const catalogQuery = useQuery({
    queryKey: ['superadmin', 'modules', 'catalog'],
    queryFn: () => api.superadmin.modules.catalog(),
    enabled: open,
    staleTime: 5 * 60_000
  });
  const catalog = catalogQuery.data?.data?.modules || [];

  useEffect(() => {
    if (open) {
      setForm(formFromStore(store));
      setModules(store?.modules ? modulesFromRows(store.modules) : {});
      setProfileExpanded(true);
      setFeaturesExpanded(false);
      setOwnerExpanded(!store);
    }
  }, [open, store]);

  useEffect(() => {
    if (!open || catalog.length === 0) return;
    setModules((current) => {
      if (Object.keys(current).length > 0) return current;
      return Object.fromEntries(catalog.map((module) => [module.key, module.enabled !== false]));
    });
  }, [catalog, open]);

  const saveMutation = useMutation({
    mutationFn: (payload) => isEdit
      ? api.superadmin.stores.update(store.id, payload)
      : api.superadmin.stores.create(payload),
    onSuccess: (response) => {
      const savedStore = response?.data?.store;
      toast.success(isEdit ? 'Store updated' : 'Store created');
      setForm(EMPTY_STORE);
      setModules({});
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'stores'] });
      if (isEdit) onSaved?.(savedStore);
      else onCreated?.(savedStore);
    },
    onError: (error) => toast.error(getErrorMessage(error, isEdit ? 'Could not update store.' : 'Could not create store.'))
  });

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setModule(moduleKey, enabled) {
    setModules((current) => ({
      ...current,
      [moduleKey]: enabled
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!isEdit && (!form.owner_full_name?.trim() || !form.owner_password)) {
      setOwnerExpanded(true);
      toast.error('First owner full name and password are required.');
      return;
    }
    const owner = !isEdit
      ? {
          full_name: form.owner_full_name.trim(),
          username: form.owner_username || null,
          email: form.owner_email || null,
          phone: form.owner_phone || null,
          password: form.owner_password
        }
      : undefined;
    const vatRate = Number(form.vat_rate || 0);

    if (form.vat_enabled && (!vatRate || Number.isNaN(vatRate) || vatRate <= 0)) {
      toast.error('VAT rate is required when VAT is enabled.');
      return;
    }
    if (isEdit && !form.slug?.trim()) {
      toast.error('Store URL slug is required.');
      return;
    }

    const payload = {
      name: form.name,
      code: form.code,
      slug: form.slug?.trim() || undefined,
      status: form.status,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      currency_code: form.currency_code || 'USD',
      vat: {
        enabled: Boolean(form.vat_enabled),
        rate: vatRate
      },
      notes: form.notes || null,
      modules
    };

    if (!isEdit) {
      payload.owner = owner;
    }

    saveMutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('superadmin.editStore') : 'Create store'}
      description={isEdit ? 'Update the store workspace, VAT, and module access.' : 'Add a store workspace and create its first owner.'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="store-form" isLoading={saveMutation.isPending}>
            {isEdit ? t('common.save') : 'Create store'}
          </Button>
        </>
      }
    >
      <form id="store-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Store Profile */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={() => setProfileExpanded(!profileExpanded)}
            className="flex w-full items-center justify-between gap-3 font-display text-sm font-semibold text-ink-50 hover:text-ink-200 focus:outline-none transition-colors"
          >
            <span>Store Profile</span>
            <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform duration-300 ${profileExpanded ? 'rotate-180' : ''}`} />
          </button>
          <div className={`transition-all duration-300 ease-in-out ${profileExpanded ? 'max-h-[1000px] opacity-100 overflow-visible mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Store name" required value={form.name} onChange={(event) => setField('name', event.target.value)} />
                <Input label="Store code" required value={form.code} onChange={(event) => setField('code', event.target.value)} />
                <Input
                  label="URL slug"
                  required={isEdit}
                  value={form.slug}
                  onChange={(event) => setField('slug', event.target.value)}
                  description={isEdit ? 'Changing this updates the store URL.' : 'Optional. Used in /superadmin/slug routes.'}
                />
                <Input label="Contact name" value={form.contact_name} onChange={(event) => setField('contact_name', event.target.value)} />
                <Input label="Phone" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
                <Input label="Email" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
                <Input label="Currency" value={form.currency_code} onChange={(event) => setField('currency_code', event.target.value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <Switch
                  checked={form.vat_enabled}
                  onChange={(checked) => setField('vat_enabled', checked)}
                  label={form.vat_enabled ? 'VAT enabled' : 'VAT disabled'}
                  description="Initial VAT setting for new customer sale lines in this store."
                />
                <Input
                  label="VAT rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.0001"
                  value={form.vat_rate}
                  onChange={(event) => setField('vat_rate', event.target.value)}
                  rightIcon={Percent}
                  disabled={!form.vat_enabled}
                  description={form.vat_enabled ? 'Required when VAT is enabled.' : 'Leave disabled for no VAT.'}
                />
              </div>
              <Textarea label="Address" value={form.address} onChange={(event) => setField('address', event.target.value)} />
              <Textarea label="Notes" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
            </div>
          </div>
        </div>

        {/* Section 2: Features */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={() => setFeaturesExpanded(!featuresExpanded)}
            className="flex w-full items-center justify-between gap-3 text-left focus:outline-none"
          >
            <div>
              <h3 className="font-display text-sm font-semibold text-ink-50 hover:text-ink-200 transition-colors">Features</h3>
              <p className="mt-1 text-xs text-ink-400">
                Choose which modules and tab pages are available in this store.
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform duration-300 ${featuresExpanded ? 'rotate-180' : ''}`} />
          </button>
          <div className={`transition-all duration-300 ease-in-out ${featuresExpanded ? 'max-h-[2000px] opacity-100 overflow-visible mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <ModuleToggleList
              modules={catalog}
              values={modules}
              onToggle={setModule}
              isLoading={catalogQuery.isPending}
            />
          </div>
        </div>

        {!isEdit && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={() => setOwnerExpanded(!ownerExpanded)}
            className="flex w-full items-center justify-between gap-3 text-left focus:outline-none"
          >
            <div>
              <h3 className="font-display text-sm font-semibold text-ink-50 hover:text-ink-200 transition-colors">First owner</h3>
              <p className="mt-1 text-xs text-ink-400">
                Create the initial superuser account for the workspace store.
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform duration-300 ${ownerExpanded ? 'rotate-180' : ''}`} />
          </button>
          <div className={`transition-all duration-300 ease-in-out ${ownerExpanded ? 'max-h-[1000px] opacity-100 overflow-visible mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Full name" required value={form.owner_full_name} onChange={(event) => setField('owner_full_name', event.target.value)} />
              <Input label="Username" value={form.owner_username} onChange={(event) => setField('owner_username', event.target.value)} />
              <Input label="Email" type="email" value={form.owner_email} onChange={(event) => setField('owner_email', event.target.value)} />
              <Input label="Phone" value={form.owner_phone} onChange={(event) => setField('owner_phone', event.target.value)} />
              <Input label="Password" type="password" required value={form.owner_password} onChange={(event) => setField('owner_password', event.target.value)} />
            </div>
          </div>
        </div>
        )}
      </form>
    </Modal>
  );
}
