import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent, Save } from 'lucide-react';
import { api } from '@/api/index.js';
import {
  Button,
  ErrorState,
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader,
  Input,
  LoadingState,
  Switch
} from '@/components/ui/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { formatNumber } from '@/lib/formatters.js';

export function VatSettingsCard({ canEdit = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ enabled: false, rate: '' });
  const [errors, setErrors] = useState({});

  const vatQuery = useQuery({
    queryKey: ['vat-settings'],
    queryFn: () => api.settings.vat.get()
  });

  const vat = vatQuery.data?.data?.vat;

  useEffect(() => {
    if (!vat) return;
    setForm({
      enabled: Boolean(vat.enabled),
      rate: vat.rate === null || vat.rate === undefined ? '' : String(vat.rate)
    });
    setErrors({});
  }, [vat]);

  const preview = useMemo(() => {
    const rate = Number(form.rate || 0);
    const subtotal = 100;
    const vatAmount = form.enabled && !Number.isNaN(rate) ? (subtotal * rate) / 100 : 0;
    return {
      subtotal,
      vatAmount,
      total: subtotal + vatAmount
    };
  }, [form.enabled, form.rate]);

  const mutation = useMutation({
    mutationFn: (payload) => api.settings.vat.update(payload),
    onSuccess: () => {
      toast.success('VAT settings saved');
      queryClient.invalidateQueries({ queryKey: ['vat-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save VAT settings.'));
    }
  });

  function validate() {
    const next = {};
    const rate = Number(form.rate);
    if (form.rate === '' || Number.isNaN(rate) || rate < 0 || rate > 100) {
      next.rate = 'VAT rate must be between 0 and 100.';
    } else if (form.enabled && rate <= 0) {
      next.rate = 'VAT rate is required when VAT is enabled.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      enabled: form.enabled,
      rate: Number(form.rate || 0)
    });
  }

  return (
    <GlassPanel>
      <GlassPanelHeader
        icon={Percent}
        title="VAT"
        subtitle="Configure VAT for new customer sale lines."
      />
      <GlassPanelBody>
        {vatQuery.isPending ? (
          <LoadingState label="Loading VAT settings..." />
        ) : vatQuery.isError ? (
          <ErrorState
            title="Could not load VAT settings"
            description={getErrorMessage(vatQuery.error)}
            onRetry={() => vatQuery.refetch()}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Switch
              checked={form.enabled}
              onChange={(enabled) => setForm((prev) => ({ ...prev, enabled }))}
              label={form.enabled ? 'VAT enabled' : 'VAT disabled'}
              description="When enabled, new dispatch sale lines store VAT as a snapshot. Existing lines are not recalculated."
              disabled={!canEdit || mutation.isPending}
            />
            <Input
              label="VAT rate"
              type="number"
              min="0"
              max="100"
              step="0.0001"
              value={form.rate}
              onChange={(event) => setForm((prev) => ({ ...prev, rate: event.target.value }))}
              error={errors.rate}
              disabled={!canEdit || mutation.isPending}
              rightIcon={Percent}
            />
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-300">Example subtotal</span>
                <span className="font-mono text-ink-100">{formatNumber(preview.subtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-ink-300">VAT</span>
                <span className="font-mono text-ink-100">{formatNumber(preview.vatAmount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                <span className="font-medium text-ink-100">Total</span>
                <span className="font-mono font-medium text-ink-50">{formatNumber(preview.total)}</span>
              </div>
            </div>
            {canEdit ? (
              <div className="flex justify-end">
                <Button type="submit" leftIcon={Save} isLoading={mutation.isPending}>
                  Save VAT
                </Button>
              </div>
            ) : (
              <p className="text-sm text-ink-300">
                You can view VAT settings but need settings.manage to edit.
              </p>
            )}
          </form>
        )}
      </GlassPanelBody>
    </GlassPanel>
  );
}
