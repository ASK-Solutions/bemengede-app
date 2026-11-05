import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Field, Pill, st } from '../components/kit';
import TabBar from '../components/TabBar';
import { api, day, time, type Booking } from '../lib/api';
import { useSession } from '../lib/session';
import { c } from '../lib/theme';

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'neutral'> = { confirmed: 'ok', checked_in: 'ok', pending_payment: 'warn', awaiting_verification: 'warn', cancelled: 'bad', expired: 'neutral', refunded: 'neutral' };

export default function Trips() {
  const insets = useSafeAreaInsets();
  const { token, rememberPhone } = useSession();
  const [mine, setMine] = useState<Booking[] | null>(null);
  const [ref, setRef] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (token) api<Booking[]>('/me/bookings', { token }).then(setMine).catch(() => setMine([])); }, [token]);

  const find = async () => {
    setBusy(true); setErr('');
    const r = ref.trim().toUpperCase();
    try {
      await api(`/bookings/${r}?phone=${encodeURIComponent(phone)}`);
      rememberPhone(r, phone);
      router.push({ pathname: '/booking/[reference]', params: { reference: r } });
    } catch { setErr('We couldn’t find a booking with that reference and phone number.'); }
    setBusy(false);
  };

  return (
    <View style={st.screen}>
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: c.line, paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={st.big} accessibilityRole="header">My trips</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={st.h2}>Find a booking</Text>
          <Field label="Booking reference" hint="Starts with BM-, it’s in your ticket SMS" autoCapitalize="characters" autoCorrect={false} value={ref} onChangeText={setRef} />
          <Field label="Phone number used to book" prefix="+251" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} />
          {err ? <Text style={st.error} accessibilityRole="alert">{err}</Text> : null}
          <Button title="Find booking" busy={busy} disabled={ref.trim().length < 5 || phone.length < 9} onPress={find} />
        </Card>

        {token ? (
          <>
            <Text style={st.h2} accessibilityRole="header">All your bookings</Text>
            {mine?.length === 0 && <Text style={st.muted}>No bookings yet.</Text>}
            {mine?.map((b) => (
              <Pressable key={b.reference} accessibilityRole="button" accessibilityLabel={`${b.trip.origin.city} to ${b.trip.destination.city}, ${day(b.trip.departure_at)}, ${b.status.replace('_', ' ')}`}
                onPress={() => router.push({ pathname: '/booking/[reference]', params: { reference: b.reference } })}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={b.trip.operator.name} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '700', color: c.ink }}>{b.trip.origin.city} → {b.trip.destination.city}</Text>
                  <Text style={st.muted}>{day(b.trip.departure_at)} · {time(b.trip.departure_at)} · {b.reference}</Text>
                </View>
                <Pill text={b.status.replace(/_/g, ' ')} tone={TONE[b.status] ?? 'neutral'} />
              </Pressable>
            ))}
          </>
        ) : (
          <Card>
            <Text style={st.body}>Sign in with your phone to see every booking made with your number.</Text>
            <Button kind="ghost" big={false} title="Sign in" onPress={() => router.replace('/account')} />
          </Card>
        )}
      </ScrollView>
      <TabBar active="trips" />
    </View>
  );
}
