import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui/index.js';
import { STATUSES } from './accounting.config.js';

function emptyForm() {
  return { name: '', description: '', status: 'active' };
}

function fromCategory(category) {
  if (!category) return emptyForm();
  return {
    name: category.name || '',
    description: category.description || '',
    status: category.status || 'active'
  };
}

export function ExpenseCategoryFormModal({ open, onClose, category }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(category?.id);

  const [form, setForm] = useState(() => fromCategory(category));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(fromCategory(category));
    setErrors({});
  }, [open, category]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.accounting.expenseCategories.update(category.id, payload)
        : api.accounting.expenseCategories.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Category updated' : 'Category created');
      queryClient.invalidateQueries({ queryKey: ['accounting', 'expense-categories'] });
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'options', 'expense-categories']
      });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save category.'));
    }
  });

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      description: form.description?.trim() ? form.description.trim() : null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit expense category' : 'New expense category'}
      description="Categorize expenses so reports can summarize spending by area."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="expense-category-form"
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <form id="expense-category-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          error={errors.name}
          required
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
          error={errors.description}
          rows={3}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}
