import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select
} from '@/components/ui/index.js';
import { COMMISSIONS_PERMISSIONS } from './commissions.config.js';
import { useCommissionRulesList } from './useCommissionsOptions.js';

function emptyForm() {
  return { salesman_target_id: '', commission_rule_id: '' };
}

/**
 * Calculate a new commission entry from a salesman target. The backend has
 * no list endpoint for salesman targets, so this form takes a numeric
 * target ID. The optional rule picker loads only when the user can manage
 * commissions and therefore can read commission-rules.
 */
export function CommissionCalculateModal({ open, onClose }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickRules = hasPermission(COMMISSIONS_PERMISSIONS.manage);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const rulesQuery = useCommissionRulesList(open && canPickRules);
  const rules = rulesQuery.data?.data?.commission_rules || [];

  const mutation = useMutation({
    mutationFn: (payload) => api.commissions.calculations.calculate(payload),
    onSuccess: () => {
      toast.success('Commission calculated');
      queryClient.invalidateQueries({ queryKey: ['commissions', 'calculations'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not calculate commission.'));
    }
  });

  function validate() {
    const next = {};
    const targetId = Number(form.salesman_target_id);
    if (!form.salesman_target_id || Number.isNaN(targetId) || targetId <= 0) {
      next.salesman_target_id = 'Salesman target ID is required.';
    }
    if (form.commission_rule_id && Number.isNaN(Number(form.commission_rule_id))) {
      next.commission_rule_id = 'Commission rule ID must be numeric.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = { salesman_target_id: Number(form.salesman_target_id) };
    if (form.commission_rule_id) {
      payload.commission_rule_id = Number(form.commission_rule_id);
    }
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Calculate commission"
      description="Enter a salesman target ID. Optionally pick a commission rule to override the default rule selection."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="commission-calculate-form" isLoading={mutation.isPending}>
            Calculate
          </Button>
        </>
      }
    >
      <form
        id="commission-calculate-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        <Input
          label="Salesman target ID"
          type="number"
          min="1"
          value={form.salesman_target_id}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, salesman_target_id: event.target.value }))
          }
          error={errors.salesman_target_id}
          required
          description="Numeric only. Pick the target ID from the Locations targets workspace."
        />
        {canPickRules ? (
          <Select
            label="Commission rule"
            value={form.commission_rule_id}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, commission_rule_id: event.target.value }))
            }
            error={errors.commission_rule_id}
            description="Optional. Leave blank to use the default active rule."
          >
            <option value="">Use default rule</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Commission rule ID"
            type="number"
            min="1"
            value={form.commission_rule_id}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, commission_rule_id: event.target.value }))
            }
            error={errors.commission_rule_id}
            description="Optional. Numeric only."
          />
        )}
      </form>
    </Modal>
  );
}
