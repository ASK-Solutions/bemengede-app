import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * The only thing the app stores on the device: the sign-in token (in the OS keychain),
 * plus the draft booking in memory. No analytics or advertising SDKs are included.
 */
type Draft = { trip: import('./api').Trip; seats: number[]; passengers: number } | null;
type Ctx = {
  token: string | null; setToken: (t: string | null) => void;
  draft: Draft; setDraft: (d: Draft) => void;
  phones: Record<string, string>; rememberPhone: (ref: string, phone: string) => void;
};
const SessionCtx = createContext<Ctx>(null!);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [phones, setPhones] = useState<Record<string, string>>({});

  useEffect(() => { SecureStore.getItemAsync('token').then(setTokenState); }, []);
  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) SecureStore.setItemAsync('token', t); else SecureStore.deleteItemAsync('token');
  };

  return (
    <SessionCtx.Provider value={{ token, setToken, draft, setDraft, phones, rememberPhone: (r, p) => setPhones((x) => ({ ...x, [r]: p })) }}>
      {children}
    </SessionCtx.Provider>
  );
}
export const useSession = () => useContext(SessionCtx);
