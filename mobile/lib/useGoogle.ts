import { useState } from 'react';
import { api, ApiError } from './api';
import { useSession } from './session';

/** Google sign-in/up. New Google accounts must tick the 18+ and terms boxes, then we resend the same token. */
export function useGoogle(onDone: () => void) {
  const { setToken } = useSession();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  const submit = async (idToken: string, consent?: { confirm_adult: boolean; accept_terms: boolean }) => {
    setError('');
    try {
      const r = await api<{ token: string }>('/auth/google', { method: 'POST', body: { id_token: idToken, device_name: 'mobile', ...consent } });
      setToken(r.token); setPending(null); onDone();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && (e.errors.confirm_adult || e.errors.accept_terms) && !consent) setPending(idToken);
      else setError(e instanceof ApiError ? e.first() ?? e.message : 'Google sign-in failed.');
    }
  };
  return { pending, error, setError, start: (t: string) => submit(t), finish: (adult: boolean, terms: boolean) => pending && submit(pending, { confirm_adult: adult, accept_terms: terms }), cancel: () => setPending(null) };
}
