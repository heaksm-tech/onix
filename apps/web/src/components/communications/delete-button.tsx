'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ApiError, apiFetch } from '@/lib/api';

/**
 * Deletes one communication, after asking through the app's `ConfirmDialog`.
 *
 * The record is soft-deleted by the API, so this hides it from every list
 * without losing what happened — which is what the prompt's second sentence
 * promises, and why it does not claim the record is destroyed.
 */
export function DeleteCommunication({
  id,
  companyName,
  redirectTo,
  size = 'sm',
}: {
  id: string;
  companyName: string;
  /** Where to go afterwards. Omitted on the list, which simply reloads. */
  redirectTo?: Route;
  size?: 'md' | 'sm';
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function remove() {
    setError(undefined);
    setDeleting(true);

    try {
      await apiFetch(`/communications/${id}`, { method: 'DELETE' });

      setAsking(false);
      if (redirectTo) router.push(redirectTo);
      // Refreshes the server-rendered list either way: after a push it is the
      // page being navigated to that must not show the deleted row.
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Δεν ήταν δυνατή η διαγραφή της επικοινωνίας.',
      );
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="danger"
        size={size}
        onClick={() => {
          setError(undefined);
          setAsking(true);
        }}
        aria-label={`Διαγραφή επικοινωνίας με ${companyName}`}
      >
        Διαγραφή
      </Button>
      <ConfirmDialog
        open={asking}
        tone="danger"
        title="Διαγραφή επικοινωνίας;"
        description={`Η καταγραφή της επικοινωνίας με «${companyName}» θα αφαιρεθεί από τη λίστα και από την αναφορά του Dashboard.`}
        confirmLabel="Διαγραφή"
        busyLabel="Διαγραφή…"
        busy={deleting}
        error={error}
        onConfirm={() => void remove()}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
