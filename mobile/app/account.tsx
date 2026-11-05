import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, Text } from 'react-native';
import { Button, Card, Checkbox, Input, s } from '../components/ui';
import { api, ApiError, day, type Booking } from '../lib/api';
import { useSession } from '../lib/session';

export default function Account() {
  const { token, setToken } = useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [isNew, setIsNew] = useState(false);
  const [adult, setAdult] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [mine, setMine] = useState<Booking[]>([]);
  const [consents, setConsents] = useState({ marketing_sms: false, marketing_email: false });
  const [deletion, setDeletion] = useState<{ scheduled: boolean; run_after: string | null }>({ scheduled: false, run_after: null });

  useEffect(() => {
    if (!token) return;
    api<Booking[]>('/me/bookings', { token }).then(setMine).catch(() => setToken(null));
    api<typeof consents>('/me/consents', { token }).then(setConsents).catch(() => {});
    api<typeof deletion>('/me/deletion', { token }).then(setDeletion).catch(() => {});
  }, [token]); // eslint-disable-line

  if (!token) {
    return (
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        <Text style={s.h1} accessibilityRole="header">Sign in</Text>
        <Text style={s.muted}>No password. We text you a 6-digit code.</Text>
        <Card>
          {stage === 'phone' ? (
            <>
              <Input label="Mobile number" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} error={err?.first('phone')} />
              <Button title="Send code" onPress={() => api<{ new_account: boolean }>('/auth/otp', { method: 'POST', body: { phone } }).then((r) => { setIsNew(r.new_account); setStage('code'); setErr(null); }).catch(setErr)} />
            </>
          ) : (
            <>
              <Input label="6-digit code" keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={setCode} error={err?.first('code')} />
              {isNew && <Checkbox checked={adult} onChange={setAdult}>I am 18 or older. If you are under 18, ask a parent or guardian to book for you.</Checkbox>}
              {err?.first('confirm_adult') && <Text style={s.error}>{err.first('confirm_adult')}</Text>}
              <Button title="Sign in" disabled={code.length !== 6} onPress={() => api<{ token: string }>('/auth/verify', { method: 'POST', body: { phone, code, confirm_adult: adult, device_name: 'mobile' } }).then((r) => setToken(r.token)).catch(setErr)} />
            </>
          )}
        </Card>
        <Link href="/legal/privacy" style={s.link}>How we use your number</Link>
      </ScrollView>
    );
  }

  const setMarketing = (key: 'marketing_sms' | 'marketing_email', v: boolean) =>
    api<typeof consents>('/me/consents', { method: 'PUT', token, body: { [key]: v } }).then(setConsents).catch((e: ApiError) => Alert.alert('Not saved', e.message));

  // Required by Apple and Google: account deletion inside the app.
  const deleteAccount = () => Alert.alert(
    'Delete your account?',
    'Your name, phone, email and passenger names are removed after a short waiting period, and you can cancel before then. Payment amounts are kept without your details, as the law requires.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => api<{ message: string; run_after: string }>('/me', { method: 'DELETE', token })
        .then((r) => { setDeletion({ scheduled: true, run_after: r.run_after }); Alert.alert('Deletion scheduled', r.message); })
        .catch((e: ApiError) => Alert.alert('Can’t delete yet', e.first())) },
    ],
  );

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.h1} accessibilityRole="header">Your trips</Text>
      {mine.length === 0 && <Text style={s.muted}>No bookings yet.</Text>}
      {mine.map((b) => (
        <Card key={b.reference}>
          <Text style={s.h2}>{b.trip.origin.city} → {b.trip.destination.city}</Text>
          <Text style={s.muted}>{day(b.trip.departure_at)} · {b.trip.operator.name} · {b.status.replace('_', ' ')}</Text>
          <Button kind="ghost" title={`Open ${b.reference}`} onPress={() => { router.push({ pathname: '/booking/[reference]', params: { reference: b.reference } }); }} />
        </Card>
      ))}

      <Card>
        <Text style={s.h2} accessibilityRole="header">Messages</Text>
        <Text style={s.muted}>Tickets and trip changes are always sent. Offers only if you switch them on.</Text>
        <Checkbox checked={consents.marketing_sms} onChange={(v) => setMarketing('marketing_sms', v)}>Offers by SMS</Checkbox>
        <Checkbox checked={consents.marketing_email} onChange={(v) => setMarketing('marketing_email', v)}>Offers by email</Checkbox>
      </Card>

      <Card>
        <Text style={s.h2} accessibilityRole="header">Your data</Text>
        <Button kind="ghost" title="Export my data" onPress={() => api('/me/export', { token }).then((d) => Share.share({ title: 'My Bemengede data', message: JSON.stringify(d, null, 2) }))} label="Export a copy of my data" />
        {deletion.scheduled ? (
          <>
            <Text style={s.body}>Deletion scheduled for {new Date(deletion.run_after!).toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa' })}.</Text>
            <Button kind="ghost" title="Keep my account" onPress={() => api('/me/deletion/cancel', { method: 'POST', token }).then(() => setDeletion({ scheduled: false, run_after: null }))} />
          </>
        ) : <Button kind="danger" title="Delete my account" onPress={deleteAccount} />}
        <Button kind="ghost" title="Sign out" onPress={() => { api('/auth/logout', { method: 'POST', token }).catch(() => {}); setToken(null); }} />
      </Card>
    </ScrollView>
  );
}
