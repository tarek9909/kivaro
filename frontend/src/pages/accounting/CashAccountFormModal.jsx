import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select
} from '@/components/ui/index.js';
import { CASH_ACCOUNT_TYPES, STATUSES } from './accounting.config.js';

function emptyForm() {
  return {
    account_name: '',
    account_type: 'cash',
    opening_balance: '0',
    status: 'active'
  };
}

function fromAccount(account) {
  if (!account) return emptyForm();
  return {
    account_name: account.account_name || '',
    account_type: account.account_type || 'cash',
    opening_balance:
      account.opening_balance !== undefined && account.opening_balance !== null
        ? String(account.opening_balance)
        : '0',
    status: account.status || 'active'
  };
}

export function CashAccountFormModal({ open, onClose, account }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(account?.id);

  const [form, setForm] = useState(() => fromAccount(account));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(fromAccount(account));
    setErrors({});
  }, [open, account]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.accounting.cashAccounts.update(account.id, payload)
        : api.accounting.cashAccounts.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Cash account updated' : 'Cash account created');
      queryClient.invalidateQueries({ queryKey: ['accounting', 'cash-accounts'] });
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'options', 'cash-accounts']
      });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save cash account.'));
    }
  });

  function validate() {
    const next = {};
    if (!form.account_name?.trim()) next.account_name = 'Name is required.';
    if (!isEdit && (form.opening_balance === '' || Number.isNaN(Number(form.opening_balance))))
      next.opening_balance = 'Opening balance must be a number.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      account_name: form.account_name.trim(),
      account_type: form.account_type,
      status: form.status
    };
    if (!isEdit) {
      payload.opening_balance = Number(form.opening_balance);
    }
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit cash account' : 'New cash account'}
      description="Cash, bank, or wallet accounts where money flows in and out."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="cash-account-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <form id="cash-account-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Account name"
          value={form.account_name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, account_name: event.target.value }))
          }
          error={errors.account_name}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={form.account_type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, account_type: event.target.value }))
            }
          >
            {CASH_ACCOUNT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, status: event.target.value }))
            }
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {!isEdit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Opening balance"
              type="number"
              min="0"
              step="0.0001"
              value={form.opening_balance}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, opening_balance: event.target.value }))
              }
              error={errors.opening_balance}
              description="Current balance starts from this amount and then follows transactions."
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
