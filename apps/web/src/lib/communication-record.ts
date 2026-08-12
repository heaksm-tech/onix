import { notFound } from 'next/navigation';

import { ApiError } from './api';
import type { CommunicationDetail } from './communications';
import { apiFetchAsUser } from './server-api';

/**
 * The one record behind the detail screen and the edit screen.
 *
 * A record that is gone — or never existed — renders the 404 page, the same
 * answer an unknown URL gets; anything else (the API being unreachable) comes
 * back as `null` for the caller to say so in place. Server-only, through
 * `apiFetchAsUser`.
 */
export async function loadCommunication(id: string): Promise<CommunicationDetail | null> {
  try {
    const { communication } = await apiFetchAsUser<{ communication: CommunicationDetail }>(
      `/communications/${id}`,
    );
    return communication;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) notFound();
    return null;
  }
}
