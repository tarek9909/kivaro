import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { Modal } from '@/components/ui/Modal.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { Select } from '@/components/ui/Select.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { cn } from '@/lib/cn.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';

function emptyState(roles, defaults) {
  return {
    role_id: defaults?.role_id ?? roles?.[0]?.id ?? '',
    full_name: defaults?.full_name ?? '',
    username: defaults?.username ?? '',
    email: defaults?.email ?? '',
    phone: defaults?.phone ?? '',
    password: '',
    status: defaults?.status ?? 'active'
  };
}

export function UserFormModal({ open, onClose, user, roles = [] }) {
  const isEdit = Boolean(user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyState(roles, user));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(emptyState(roles, user));
      setErrors({});
    }
  }, [open, user, roles]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return api.users.update(user.id, payload);
      }
      return api.users.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'User updated' : 'User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose?.();
    },
    onError: (error) => {
      const fields = mapFieldErrors(error);
      setErrors(fields);
      toast.error(getErrorMessage(error, 'Could not save user.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.role_id) next.role_id = 'Role is required.';
    if (!form.full_name?.trim()) next.full_name = 'Full name is required.';
    if (!isEdit && (!form.password || form.password.length < 8)) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (isEdit && form.password && form.password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Invalid email address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      role_id: Number(form.role_id),
      full_name: form.full_name.trim(),
      username: form.username?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      status: form.status
    };
    if (form.password) payload.password = form.password;
    if (!isEdit && !form.password) {
      // create requires password (validated above) but defensive guard
      return;
    }
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit user' : 'Create user'}
      description={
        isEdit
          ? 'Update profile, role, status, or reset the password.'
          : 'Add a new operator with role-based access.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-form"
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          value={form.full_name}
          onChange={(event) => handleChange('full_name', event.target.value)}
          error={errors.full_name}
          autoComplete="name"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Username"
            value={form.username || ''}
            onChange={(event) => handleChange('username', event.target.value)}
            error={errors.username}
            autoComplete="off"
          />
          <Input
            label="Email"
            type="email"
            value={form.email || ''}
            onChange={(event) => handleChange('email', event.target.value)}
            error={errors.email}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            value={form.phone || ''}
            onChange={(event) => handleChange('phone', event.target.value)}
            error={errors.phone}
            autoComplete="off"
          />
          <div className="space-y-1.5 flex flex-col justify-end">
            <span className="block text-sm font-medium text-ink-300">Status</span>
            <Button
              variant="outline"
              type="button"
              onClick={() => handleChange('status', form.status === 'active' ? 'inactive' : 'active')}
              className={cn(
                "w-full h-10 justify-center transition-all duration-300 font-medium rounded-xl",
                form.status === 'active'
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-white/10 bg-white/5 text-ink-300 hover:bg-white/10"
              )}
            >
              {form.status === 'active' ? 'Active' : 'Inactive'}
            </Button>
          </div>
        </div>
        <Select
          label="Role"
          value={form.role_id}
          onChange={(event) => handleChange('role_id', event.target.value)}
          error={errors.role_id}
        >
          <option value="">Select a role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.display_name || role.name}
            </option>
          ))}
        </Select>
        <Input
          label={isEdit ? 'New password (optional)' : 'Password'}
          type="password"
          value={form.password}
          onChange={(event) => handleChange('password', event.target.value)}
          error={errors.password}
          autoComplete="new-password"
          description={isEdit ? 'Leave blank to keep the current password.' : 'Minimum 8 characters.'}
        />
      </form>
    </Modal>
  );
}
