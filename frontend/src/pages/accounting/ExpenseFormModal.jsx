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
  Select,
  Textarea
} from '@/components/ui/index.js';
import {
  ACCOUNTING_PERMISSIONS,
  PAYMENT_METHODS
} from './accounting.config.js';
import {
  useCashAccountsList,
  useExpenseCategoriesList
} from './useAccountingOptions.js';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyForm() {
  return {
    expense_category_id: '',
    expense_date: todayString(),
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    cash_account_id: '',
    description: ''
  };
}

function fromExpense(expense) {
  if (!expense) return emptyForm();
  return {
    expense_category_id: expense.expense_category_id ?? '',
    expense_date: expense.expense_date
      ? String(expense.expense_date).slice(0, 10)
      : todayString(),
    amount: expense.amount ?? '',
    payment_method: expense.payment_method || 'cash',
    reference_number: expense.reference_number || '',
    cash_account_id: expense.cash_account_id ?? '',
    description: expense.description || ''
  };
}

export function ExpenseFormModal({ open, onClose, expense }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickOptions = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const queryClient = useQueryClient();
  const isEdit = Boolean(expense?.id);

  const [form, setForm] = useState(() => fromExpense(expense));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(fromExpense(expense));
    setErrors({});
  }, [open, expense]);

  const categoriesQuery = useExpenseCategoriesList(open && canPickOptions);
  const cashAccountsQuery = useCashAccountsList(open && canPickOptions, { cash_flow_direction: 'outgoing' });

  const categories = categoriesQuery.data?.data?.expense_categories || [];
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.accounting.expenses.update(expense.id, payload)
        : api.accounting.expenses.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Expense updated' : 'Expense recorded');
      queryClient.invalidateQueries({ queryKey: ['accounting', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'expense', expense?.id] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'transactions'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save expense.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const categoryId = Number(form.expense_category_id);
    if (!form.expense_category_id || Number.isNaN(categoryId) || categoryId <= 0) {
      next.expense_category_id = 'Category is required.';
    }
    if (!form.expense_date) next.expense_date = 'Expense date is required.';
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      next.amount = 'Amount must be greater than zero.';
    }
    if (!form.cash_account_id) {
      next.cash_account_id = 'Cash account is required.';
    } else if (Number.isNaN(Number(form.cash_account_id))) {
      next.cash_account_id = 'Cash account ID must be numeric.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      expense_category_id: Number(form.expense_category_id),
      expense_date: form.expense_date,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      reference_number: form.reference_number?.trim() || null,
      cash_account_id: Number(form.cash_account_id),
      description: form.description?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit expense' : 'Record expense'}
      description="Record a business expense and post it to a cash account."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Record expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {canPickOptions ? (
          <Select
            label="Category"
            value={form.expense_category_id}
            onChange={(event) => handleChange('expense_category_id', event.target.value)}
            error={errors.expense_category_id}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Category ID"
            type="number"
            min="1"
            value={form.expense_category_id}
            onChange={(event) => handleChange('expense_category_id', event.target.value)}
            error={errors.expense_category_id}
            required
            description="Numeric only."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Date"
            type="date"
            value={form.expense_date}
            onChange={(event) => handleChange('expense_date', event.target.value)}
            error={errors.expense_date}
            required
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.0001"
            value={form.amount}
            onChange={(event) => handleChange('amount', event.target.value)}
            error={errors.amount}
            required
          />
          <Select
            label="Method"
            value={form.payment_method}
            onChange={(event) => handleChange('payment_method', event.target.value)}
            error={errors.payment_method}
          >
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Reference number"
            value={form.reference_number}
            onChange={(event) => handleChange('reference_number', event.target.value)}
            error={errors.reference_number}
          />
          {canPickOptions ? (
            <Select
              label="Cash account"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              required
            >
              <option value="">Select cash account</option>
              {cashAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name || `Account #${account.id}`}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Cash account ID"
              type="number"
              min="1"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              required
              description="Numeric only."
            />
          )}
        </div>

        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => handleChange('description', event.target.value)}
          rows={3}
        />
      </form>
    </Modal>
  );
}
