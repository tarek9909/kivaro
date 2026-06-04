import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { Modal } from '@/components/ui/Modal.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { Select } from '@/components/ui/Select.jsx';
import { Textarea } from '@/components/ui/Textarea.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';

const TYPES = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' }
];

function emptyForm() {
  return {
    user_id: '',
    title: '',
    message: '',
    notification_type: 'info',
    reference_type: '',
    reference_id: ''
  };
}

export function NotificationFormModal({ open, onClose }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickUserFromList = hasPermission('users.view');

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
    setUserSearch('');
  }, [open]);

  const debouncedUserSearch = useDebouncedValue(userSearch, 250);

  const usersQuery = useQuery({
    queryKey: ['users', { notificationPicker: true, search: debouncedUserSearch }],
    queryFn: () =>
      api.users.list({
        limit: 25,
        page: 1,
        status: 'active',
        ...(debouncedUserSearch ? { search: debouncedUserSearch } : {})
      }),
    enabled: open && canPickUserFromList,
    staleTime: 30_000
  });

  const userOptions = useMemo(() => {
    const list = usersQuery.data?.data?.users || [];
    return list.map((u) => ({
      id: u.id,
      label: `${u.full_name}${u.username ? ` (${u.username})` : ''}${
        u.role_display_name ? ` - ${u.role_display_name}` : ''
      }`
    }));
  }, [usersQuery.data]);

  const mutation = useMutation({
    mutationFn: (payload) => api.notifications.create(payload),
    onSuccess: () => {
      toast.success('Notification sent');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not send notification.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.title?.trim()) next.title = 'Title is required.';
    if (!form.message?.trim()) next.message = 'Message is required.';
    const userIdNum = Number(form.user_id);
    if (!form.user_id || Number.isNaN(userIdNum) || userIdNum <= 0) {
      next.user_id = 'Target user is required. Notifications are scoped per user.';
    }
    if (form.reference_id && Number.isNaN(Number(form.reference_id))) {
      next.reference_id = 'Reference ID must be a positive number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      user_id: Number(form.user_id),
      title: form.title.trim(),
      message: form.message.trim(),
      notification_type: form.notification_type,
      reference_type: form.reference_type?.trim() || null,
      reference_id: form.reference_id ? Number(form.reference_id) : null
    });
  }

  const showUserPicker = canPickUserFromList;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Send notification"
      description="Notifications are delivered to a single target user. The recipient will see this entry in their inbox."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="notification-form"
            leftIcon={Send}
            isLoading={mutation.isPending}
          >
            Send
          </Button>
        </>
      }
    >
      <form id="notification-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {showUserPicker ? (
          <div className="space-y-2">
            <Input
              label="Find a user"
              placeholder="Search by name, username, email, or phone"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              description="Filters the active users list below."
            />
            <Select
              label="Target user"
              value={form.user_id}
              onChange={(event) => handleChange('user_id', event.target.value)}
              error={errors.user_id}
              disabled={usersQuery.isPending}
            >
              <option value="">
                {usersQuery.isPending ? 'Loading users...' : 'Select a user'}
              </option>
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            {usersQuery.isError && (
              <p className="text-xs text-rose-300">
                Could not load users. {getErrorMessage(usersQuery.error)}
              </p>
            )}
          </div>
        ) : (
          <Input
            label="Target user ID"
            type="number"
            min="1"
            value={form.user_id}
            onChange={(event) => handleChange('user_id', event.target.value)}
            error={errors.user_id}
            description="Required. Enter the numeric ID of the user that will receive this notification."
            required
          />
        )}

        <Select
          label="Type"
          value={form.notification_type}
          onChange={(event) => handleChange('notification_type', event.target.value)}
          error={errors.notification_type}
        >
          {TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Input
          label="Title"
          value={form.title}
          onChange={(event) => handleChange('title', event.target.value)}
          error={errors.title}
        />
        <Textarea
          label="Message"
          value={form.message}
          onChange={(event) => handleChange('message', event.target.value)}
          error={errors.message}
          rows={4}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Reference type"
            value={form.reference_type}
            onChange={(event) => handleChange('reference_type', event.target.value)}
            error={errors.reference_type}
            placeholder="e.g. dispatch_request"
          />
          <Input
            label="Reference ID"
            type="number"
            value={form.reference_id}
            onChange={(event) => handleChange('reference_id', event.target.value)}
            error={errors.reference_id}
          />
        </div>
      </form>
    </Modal>
  );
}
