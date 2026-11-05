const env = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing ${name}. Copy mobile/.env.example to mobile/.env and restart Expo.`);
  return value;
};

// Expo only inlines literal `process.env.EXPO_PUBLIC_*` references, so each is read by full name.
export const API_URL = env('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL);
export const WEB_URL = env('EXPO_PUBLIC_WEB_URL', process.env.EXPO_PUBLIC_WEB_URL);

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) { super(message); }
  first(field?: string) { return field ? this.errors[field]?.[0] : Object.values(this.errors)[0]?.[0] ?? this.message; }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'X-Client': 'mobile',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message ?? 'Something went wrong.', res.status, data.errors ?? {});
  return data as T;
}

export const etb = (s: number) => 'ETB ' + (s / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const TZ = 'Africa/Addis_Ababa';
export const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
export const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
export const isoDay = (offset: number) => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', { timeZone: TZ });

export type Trip = {
  id: number; operator: { name: string; free_cancel_hours: number; late_cancel_fee_percent: number };
  origin: { city: string; terminal: string }; destination: { city: string; terminal: string };
  departure_at: string; arrival_at: string; duration_minutes: number; bus_class: string; seats_left: number;
  fare: number; service_fee_per_seat: number; price_per_seat: number;
  layout?: { columns: number; aisle_after: number }; seat_count?: number; unavailable_seats?: number[];
};
export type Booking = {
  reference: string; status: string; trip: Trip; expires_at: string | null; refund_amount: number | null;
  passengers: { full_name: string; seat_number: number; fare_category: string; fare: number; qr: string | null }[];
  price: { subtotal: number; discount: number; service_fee: number; total: number };
  payment: { provider: string; status: string; tx_ref: string; checkout_url: string | null } | null;
  transfer_accounts: { bank: string; account_name: string; account_number: string }[];
};
