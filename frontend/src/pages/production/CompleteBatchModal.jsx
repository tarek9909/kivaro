import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Textarea
} from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';

export function CompleteBatchModal({ open, onClose, batch }) {
  const queryClient = useQueryClient();
  const [producedQuantity, setProducedQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setProducedQuantity('');
    setNotes('');
    setErrors({});
  }, [open, batch?.id]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      api.production.productionBatches.complete(batch.id, payload),
    onSuccess: () => {
      toast.success('Production batch completed');
      queryClient.invalidateQueries({ queryKey: ['production', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'batch', batch.id] });
      queryClient.invalidateQueries({ queryKey: ['production', 'cost-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not complete batch.'));
    }
  });

  function validate() {
    const next = {};
    if (producedQuantity) {
      const value = Number(producedQuantity);
      if (Number.isNaN(value) || value <= 0) {
        next.produced_quantity = 'Produced quantity must be greater than zero.';
      }
    }
    if (notes && notes.length > 2000) next.notes = 'Notes are too long.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {};
    if (producedQuantity) payload.produced_quantity = Number(producedQuantity);
    if (notes?.trim()) payload.notes = notes.trim();
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        batch
          ? `Complete batch ${batch.batch_number || `#${batch.id}`}`
          : 'Complete batch'
      }
      description={
        batch?.packaging_group_id
          ? 'Completing consumes charcoal kg and calculated packaging pieces, then produces the primary container count.'
          : 'Completing a batch consumes components from stock and produces output in base-unit quantities. The unit cost is recorded for cost history.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="complete-batch-form"
            leftIcon={CheckCircle2}
            isLoading={mutation.isPending}
          >
            Complete batch
          </Button>
        </>
      }
    >
      <form id="complete-batch-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {batch && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <p className="text-ink-300">
              {batch.packaging_group_id ? 'Planned charcoal kg' : 'Planned quantity'}{' '}
              <span className="font-mono text-ink-100">
                {formatNumber(batch.planned_quantity, { maximumFractionDigits: 4 })}
                {batch.packaging_group_id ? ' kg' : ''}
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Leave produced quantity blank to use the planned quantity.
            </p>
          </div>
        )}
        <Input
          label={batch?.packaging_group_id ? 'Produced charcoal kg' : 'Produced quantity (base unit)'}
          type="number"
          min="0"
          step="0.0001"
          value={producedQuantity}
          onChange={(event) => setProducedQuantity(event.target.value)}
          error={errors.produced_quantity}
          description="Optional. Defaults to the planned quantity."
        />
        <Textarea
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          error={errors.notes}
          rows={3}
        />
      </form>
    </Modal>
  );
}
