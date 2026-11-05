import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Check, Field, st } from '../components/kit';
import TabBar from '../components/TabBar';
import { api, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import { c, touch } from '../lib/theme';

export default function Account() {
  const insets = useSafeAreaInsets();
  const { token, setToken } = useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [isNew, setIsNew] = useState(false);
  const [adult, setAdult] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ phone: string; name: string | null } | null>(null);
  const [consents, setConsents] = useState({ marketing_sms: false, marketing_email: false });
  const [deletion, setDeletion] = useState<{ scheduled: boolean; run_after: string | null }>({ scheduled: false, run_after: null });

  useEffect(() => {
    if (!token) return;
    api<{ phone: string; name: string | null }>('/me', { token }).then(setMe).catch(() => setToken(null));
    api<typeof consents>('/me/consents', { token }).then(setConsents).catch(() => {});
    api<typeof deletion>('/me/deletion', { token }).then(setDeletion).catch(() => {});
  }, [token]); // eslint-disable-line

  const header = (title: string) => (
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: c.line, paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 14 }}>
      <Text style={st.big} accessibilityRole="header">{title}</Text>
    </View>
  );
  const legal = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {[['terms', 'Terms'], ['privacy', 'Privacy'], ['refund', 'Refunds']].map(([d, l]) => (
        <Pressable key={d} accessibilityRole="link" onPress={() => router.push(`/legal/${d}`)} style={{ minHeight: touch, justifyContent: 'center' }}><Text style={st.link}>{l}</Text></Pressable>
      ))}
    </View>
  );

  if (!token) {
    const send = () => { setBusy(true); api<{ new_account: boolean }>('/auth/otp', { method: 'POST', body: { phone } }).then((r) => { setIsNew(r.new_account); setStage('code'); setErr(null); }).catch(setErr).finally(() => setBusy(false)); };
    const verify = () => { setBusy(true); api<{ token: string }>('/auth/verify', { method: 'POST', body: { phone, code, confirm_adult: adult, device_name: 'mobile' } }).then((r) => setToken(r.token)).catch(setErr).finally(() => setBusy(false)); };
    return (
      <View style={st.screen}>
        {header('Sign in')}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text style={st.muted}>No password. We text you a 6-digit code.</Text>
          <Card>
            {stage === 'phone' ? <>
              <Field label="Phone number" prefix="+251" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} error={err?.first('phone')} />
              <Button title="Send code" busy={busy} disabled={phone.length < 9} onPress={send} />
            </> : <>
              <Field label="6-digit code" keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={setCode} error={err?.first('code')} />
              {isNew && <Check checked={adult} onChange={setAdult}>I am 18 or older. If you are under 18, ask a parent or guardian to book for you.</Check>}
              {err?.first('confirm_adult') ? <Text style={st.error}>{err.first('confirm_adult')}</Text> : null}
              <Button title="Sign in" busy={busy} disabled={code.length !== 6} onPress={verify} />
              <Button kind="ghost" big={false} title="Use a different number" onPress={() => setStage('phone')} />
            </>}
          </Card>
          {legal}
        </ScrollView>
        <TabBar active="account" />
      </View>
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
    <View style={st.screen}>
      {header('Account')}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <Text style={st.h2}>Signed in</Text>
          <Text style={st.body}>{me?.name ? `${me.name} · ` : ''}{me?.phone}</Text>
          <Button kind="ghost" big={false} title="Sign out" onPress={() => { api('/auth/logout', { method: 'POST', token }).catch(() => {}); setToken(null); }} />
        </Card>
        <Card>
          <Text style={st.h2} accessibilityRole="header">Messages</Text>
          <Text style={st.muted}>Tickets and trip changes are always sent. Offers only if you switch them on.</Text>
          <Check checked={consents.marketing_sms} onChange={(v) => setMarketing('marketing_sms', v)}>Offers by SMS</Check>
          <Check checked={consents.marketing_email} onChange={(v) => setMarketing('marketing_email', v)}>Offers by email</Check>
        </Card>
        <Card>
          <Text style={st.h2} accessibilityRole="header">Your data</Text>
          <Button kind="ghost" big={false} title="Export my data" label="Export a copy of my data"
            onPress={() => api('/me/export', { token }).then((d) => Share.share({ title: 'My Bemengede data', message: JSON.stringify(d, null, 2) }))} />
          {deletion.scheduled ? <>
            <Text style={st.body}>Deletion scheduled for {new Date(deletion.run_after!).toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa' })}.</Text>
            <Button kind="ghost" big={false} title="Keep my account" onPress={() => api('/me/deletion/cancel', { method: 'POST', token }).then(() => setDeletion({ scheduled: false, run_after: null }))} />
          </> : <Button kind="danger" big={false} title="Delete my account" onPress={deleteAccount} />}
        </Card>
        {legal}
      </ScrollView>
      <TabBar active="account" />
    </View>
  );
}
