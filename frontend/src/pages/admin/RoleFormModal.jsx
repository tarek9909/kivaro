import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { Modal } from '@/components/ui/Modal.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { Select } from '@/components/ui/Select.jsx';
import { Textarea } from '@/components/ui/Textarea.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';

function emptyState(role) {
  return {
    name: role?.name ?? '',
    display_name: role?.display_name ?? '',
    description: role?.description ?? '',
    status: role?.status ?? 'active'
  };
}

export function RoleFormModal({ open, onClose, role }) {
  const isEdit = Boolean(role);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyState(role));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(emptyState(role));
      setErrors({});
    }
  }, [open, role]);

  const mutation = useMutation({
    mutationFn: (payload) => {
      if (isEdit) return api.roles.update(role.id, payload);
      return api.roles.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Role updated' : 'Role created');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save role.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Internal name is required.';
    if (!form.display_name?.trim()) next.display_name = 'Display name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      display_name: form.display_name.trim(),
      description: form.description?.trim() || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit role' : 'Create role'}
      description={
        isEdit ? 'Adjust the role profile.' : 'Define a new role. Assign permissions afterwards.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="role-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save role' : 'Create role'}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Internal name"
            description="Lowercase identifier used in code and audit logs."
            value={form.name}
            onChange={(event) => handleChange('name', event.target.value)}
            error={errors.name}
            disabled={isEdit && role?.is_system_role}
          />
          <Input
            label="Display name"
            value={form.display_name}
            onChange={(event) => handleChange('display_name', event.target.value)}
            error={errors.display_name}
          />
        </div>
        <Textarea
          label="Description"
          value={form.description || ''}
          onChange={(event) => handleChange('description', event.target.value)}
          error={errors.description}
          rows={3}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(event) => handleChange('status', event.target.value)}
          error={errors.status}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </form>
    </Modal>
  );
}
