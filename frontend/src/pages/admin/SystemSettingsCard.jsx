import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Settings as SettingsIcon } from 'lucide-react';
import { api } from '@/api/index.js';
import {
  Badge,
  Button,
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader,
  Input,
  Modal,
  Select,
  Textarea,
  LoadingState,
  ErrorState,
  EmptyState
} from '@/components/ui/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { formatDateTime } from '@/lib/formatters.js';

const VALUE_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'json', label: 'Structured' }
];

function formatValueType(type) {
  return VALUE_TYPES.find((option) => option.value === type)?.label || type;
}

function parseValueByType(rawValue, valueType) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  switch (valueType) {
    case 'number': {
      const n = Number(rawValue);
      if (Number.isNaN(n)) throw new Error('Invalid number value.');
      return n;
    }
    case 'boolean':
      return rawValue === 'true' || rawValue === true;
    case 'json':
      return JSON.parse(rawValue);
    default:
      return String(rawValue);
  }
}

function formatStoredValue(setting) {
  if (setting.setting_value === null || setting.setting_value === undefined) return '-';
  if (setting.value_type === 'json') {
    try {
      return JSON.stringify(JSON.parse(setting.setting_value), null, 2);
    } catch {
      return setting.setting_value;
    }
  }
  return String(setting.setting_value);
}

export function SystemSettingsCard({ canEdit = false }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const settingsQuery = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => api.settings.systemSettings.list()
  });

  const settings = settingsQuery.data?.data?.settings || [];

  return (
    <GlassPanel>
      <GlassPanelHeader
        icon={SettingsIcon}
        title="System settings"
        subtitle="Operational toggles and configuration values."
        actions={
          canEdit ? (
            <Button
              size="sm"
              leftIcon={Plus}
              onClick={() => setEditing({ setting_key: '', value_type: 'string' })}
            >
              New setting
            </Button>
          ) : null
        }
      />
      <GlassPanelBody>
        {settingsQuery.isPending ? (
          <LoadingState label="Loading settings..." />
        ) : settingsQuery.isError ? (
          <ErrorState
            title="Could not load settings"
            description={getErrorMessage(settingsQuery.error)}
            onRetry={() => settingsQuery.refetch()}
          />
        ) : settings.length === 0 ? (
          <EmptyState
            icon={SettingsIcon}
            title="No system settings yet"
            description={
              canEdit
                ? 'Add a setting to control runtime configuration.'
                : 'No settings have been configured yet.'
            }
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
            {settings.map((setting) => (
              <li
                key={setting.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-mono text-sm text-ink-50">
                        {setting.setting_key}
                      </p>
                      <Badge tone="neutral">{formatValueType(setting.value_type)}</Badge>
                    </div>
                    {setting.description && (
                      <p className="mt-1 text-xs text-ink-300 text-pretty">
                        {setting.description}
                      </p>
                    )}
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/5 bg-ink-950/40 p-3 font-mono text-xs text-ink-100">
                      {formatStoredValue(setting)}
                    </pre>
                    <p className="mt-2 text-[11px] uppercase tracking-wider text-ink-400">
                      Updated {formatDateTime(setting.updated_at)}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setEditing({
                          setting_key: setting.setting_key,
                          setting_value:
                            setting.value_type === 'json'
                              ? formatStoredValue(setting)
                              : setting.setting_value || '',
                          value_type: setting.value_type,
                          description: setting.description || '',
                          isExisting: true
                        })
                      }
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassPanelBody>

      <SystemSettingFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        initial={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['system-settings'] })}
      />
    </GlassPanel>
  );
}

function SystemSettingFormModal({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState({
    setting_key: '',
    value_type: 'string',
    setting_value: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const isExisting = Boolean(initial?.isExisting);

  useEffect(() => {
    if (!open) return;
    setForm({
      setting_key: initial?.setting_key || '',
      value_type: initial?.value_type || 'string',
      setting_value: initial?.setting_value ?? '',
      description: initial?.description || ''
    });
    setErrors({});
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: ({ key, payload }) => api.settings.systemSettings.update(key, payload),
    onSuccess: () => {
      toast.success('Setting saved');
      onSaved?.();
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save setting.'));
    }
  });

  function validate() {
    const next = {};
    if (!form.setting_key?.trim()) next.setting_key = 'Setting key is required.';
    try {
      parseValueByType(form.setting_value, form.value_type);
    } catch (error) {
      next.setting_value = error.message || 'Invalid value.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    let value;
    try {
      value = parseValueByType(form.setting_value, form.value_type);
    } catch (error) {
      setErrors({ setting_value: error.message });
      return;
    }
    mutation.mutate({
      key: form.setting_key.trim(),
      payload: {
        setting_value: value,
        value_type: form.value_type,
        description: form.description?.trim() || null
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isExisting ? 'Edit setting' : 'Create setting'}
      description="Settings are upserted by key. Choose the value type that matches the consumer of this setting."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="setting-form"
            leftIcon={Save}
            isLoading={mutation.isPending}
          >
            Save setting
          </Button>
        </>
      }
    >
      <form id="setting-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Setting key"
          value={form.setting_key}
          onChange={(event) => setForm((p) => ({ ...p, setting_key: event.target.value }))}
          error={errors.setting_key}
          disabled={isExisting}
          description={
            isExisting
              ? 'Keys are immutable. Create a new setting for a different key.'
              : 'Lowercase, dot-separated identifier. Example: invoices.default_due_days'
          }
        />
        <Select
          label="Value type"
          value={form.value_type}
          onChange={(event) => setForm((p) => ({ ...p, value_type: event.target.value }))}
        >
          {VALUE_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {form.value_type === 'boolean' ? (
          <Select
            label="Value"
            value={String(form.setting_value)}
            onChange={(event) => setForm((p) => ({ ...p, setting_value: event.target.value }))}
            error={errors.setting_value}
          >
            <option value="false">false</option>
            <option value="true">true</option>
          </Select>
        ) : form.value_type === 'json' ? (
          <Textarea
            label="Structured value"
            value={form.setting_value || ''}
            onChange={(event) => setForm((p) => ({ ...p, setting_value: event.target.value }))}
            error={errors.setting_value}
            rows={6}
          />
        ) : (
          <Input
            label="Value"
            type={form.value_type === 'number' ? 'number' : 'text'}
            value={form.setting_value || ''}
            onChange={(event) => setForm((p) => ({ ...p, setting_value: event.target.value }))}
            error={errors.setting_value}
          />
        )}
        <Textarea
          label="Description"
          value={form.description || ''}
          onChange={(event) => setForm((p) => ({ ...p, description: event.target.value }))}
          rows={2}
        />
      </form>
    </Modal>
  );
}
