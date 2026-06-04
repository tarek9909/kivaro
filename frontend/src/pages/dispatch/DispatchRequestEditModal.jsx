import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Textarea } from '@/components/ui/index.js';

function toDateInputValue(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Header-only edit for a dispatch request. Only request_date and notes
 * are editable, and only while the request is still draft.
 */
export function DispatchRequestEditModal({ open, onClose, dispatchRequest }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    request_date: toDateInputValue(dispatchRequest?.request_date),
    notes: dispatchRequest?.notes ?? ''
  });
  const [errors, setErrors] = useState({});
  const editAllowed = dispatchRequest?.status === 'draft';

  useEffect(() => {
    if (!open) return;
    setForm({
      request_date: toDateInputValue(dispatchRequest?.request_date),
      notes: dispatchRequest?.notes ?? ''
    });
    setErrors({});
  }, [open, dispatchRequest]);

  const mutation = useMutation({
    mutationFn: (payload) => api.dispatch.requests.update(dispatchRequest.id, payload),
    onSuccess: () => {
      toast.success('Dispatch request updated');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequest.id] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not update dispatch request.'));
    }
  });

  function handleSubmit(event) {
    event.preventDefault();
    if (!editAllowed) return;
    const next = {};
    if (form.request_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.request_date)) {
      next.request_date = 'Request date must be a valid date.';
    }
    if (form.notes && form.notes.length > 2000) next.notes = 'Notes are too long.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const payload = {};
    if (form.request_date) payload.request_date = form.request_date;
    payload.notes = form.notes?.trim() ? form.notes.trim() : null;
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        dispatchRequest
          ? `Edit ${dispatchRequest.dispatch_number || `request #${dispatchRequest.id}`}`
          : 'Edit dispatch request'
      }
      description="Update the request date and notes. Salesman, warehouse, customers, and items stay locked."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="dispatch-edit-form"
            isLoading={mutation.isPending}
            disabled={!editAllowed}
          >
            Save changes
          </Button>
        </>
      }
    >
      {!editAllowed ? (
        <p className="text-sm text-ink-300">
          Only draft dispatch requests can be edited. This request is locked at its
          current stage.
        </p>
      ) : (
        <form id="dispatch-edit-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Request date"
            type="date"
            value={form.request_date}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, request_date: event.target.value }))
            }
            error={errors.request_date}
          />
          <Textarea
            label="Notes"
            value={form.notes || ''}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            error={errors.notes}
            rows={4}
          />
        </form>
      )}
    </Modal>
  );
}
