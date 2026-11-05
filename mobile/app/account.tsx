import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConsentChecks from '../components/ConsentChecks';
import GoogleSignIn, { googleConfigured } from '../components/GoogleSignIn';
import { Button, Card, Check, Field, Segmented, st } from '../components/kit';
import TabBar from '../components/TabBar';
import { api, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import { useGoogle } from '../lib/useGoogle';
import { c, touch } from '../lib/theme';

type Me = { name: string | null; username: string | null; phone: string | null; email: string | null; login_methods: { phone: boolean; password: boolean; google: boolean } };

export default function Account() {
  const insets = useSafeAreaInsets();
  const { token, setToken } = useSession();
  const google = useGoogle(() => {});
  const [mode, setMode] = useState<'phone' | 'password'>('phone');
  // phone + code
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [isNew, setIsNew] = useState(false);
  // username + password
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  // signed in
  const [me, setMe] = useState<Me | null>(null);
  const [consents, setConsents] = useState({ marketing_sms: false, marketing_email: false });
  const [deletion, setDeletion] = useState<{ scheduled: boolean; run_after: string | null }>({ scheduled: false, run_after: null });

  const loadMe = () => token && api<Me>('/me', { token }).then(setMe).catch(() => setToken(null));
  useEffect(() => {
    if (!token) return;
    loadMe();
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
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(null); try { await fn(); } catch (e) { setErr(e as ApiError); } setBusy(false); };

  // ---------------- Signed out ----------------
  if (!token) {
    if (google.pending) {
      return (
        <View style={st.screen}>
          {header('Create your account')}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <Text style={st.muted}>This Google account is new to Bemengede. Please confirm:</Text>
            <Card>
              <ConsentChecks adult={adult} terms={terms} setAdult={setAdult} setTerms={setTerms} />
              {google.error ? <Text style={st.error}>{google.error}</Text> : null}
              <Button title="Create account" disabled={!adult || !terms} onPress={() => google.finish(adult, terms)} />
              <Button kind="ghost" big={false} title="Cancel" onPress={google.cancel} />
            </Card>
          </ScrollView>
        </View>
      );
    }
    return (
      <View style={st.screen}>
        {header('Sign in')}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Card>
            <GoogleSignIn onIdToken={google.start} onError={google.setError} />
            {google.error ? <Text style={st.error} accessibilityRole="alert">{google.error}</Text> : null}
            {googleConfigured && <Text style={[st.muted, { textAlign: 'center' }]}>or</Text>}
            <Segmented label="Sign in with" value={mode} onChange={(v) => { setMode(v); setErr(null); }} options={[['phone', 'Phone number'], ['password', 'Username']]} />

            {mode === 'phone' && (stage === 'phone' ? <>
              <Field label="Phone number" hint="We’ll text you a 6-digit code" prefix="+251" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} error={err?.first('phone')} />
              <Button title="Send code" busy={busy} disabled={phone.length < 9} onPress={() => run(async () => {
                const r = await api<{ new_account: boolean }>('/auth/otp', { method: 'POST', body: { phone } }); setIsNew(r.new_account); setStage('code');
              })} />
            </> : <>
              <Field label="6-digit code" hint={`Sent to ${phone}`} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={setCode} error={err?.first('code')} />
              {isNew && <ConsentChecks adult={adult} terms={terms} setAdult={setAdult} setTerms={setTerms} adultError={err?.first('confirm_adult')} termsError={err?.first('accept_terms')} />}
              <Button title={isNew ? 'Create account' : 'Sign in'} busy={busy} disabled={code.length !== 6} onPress={() => run(async () => {
                const r = await api<{ token: string }>('/auth/verify', { method: 'POST', body: { phone, code, confirm_adult: adult, accept_terms: terms, device_name: 'mobile' } }); setToken(r.token);
              })} />
              <Button kind="ghost" big={false} title="Use a different number" onPress={() => setStage('phone')} />
            </>)}

            {mode === 'password' && <>
              <Field label="Username, email or phone" autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" value={login} onChangeText={setLogin} error={err?.first('login')} />
              <Field label="Password" secureTextEntry autoComplete="current-password" textContentType="password" value={password} onChangeText={setPassword} />
              <Button title="Sign in" busy={busy} disabled={!login || !password} onPress={() => run(async () => {
                const r = await api<{ token: string }>('/auth/login', { method: 'POST', body: { login, password, device_name: 'mobile' } }); setToken(r.token);
              })} />
              <Button kind="ghost" big={false} title="Forgot your password?" onPress={() => router.push('/forgot')} />
            </>}
          </Card>
          <Card>
            <Text style={st.body}>New to Bemengede? You can book without an account, or create one to keep all your trips together.</Text>
            <Button kind="ghost" big={false} title="Create an account" onPress={() => router.push('/signup')} />
          </Card>
          {legal}
        </ScrollView>
        <TabBar active="account" />
      </View>
    );
  }

  // ---------------- Signed in ----------------
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
  const who = me?.username ? `@${me.username}` : me?.phone ?? me?.email ?? '';

  return (
    <View style={st.screen}>
      {header('Account')}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={st.h2}>Signed in</Text>
          <Text style={st.body}>{me?.name ? `${me.name} · ` : ''}{who}</Text>
          <Button kind="ghost" big={false} title="Sign out" onPress={() => { api('/auth/logout', { method: 'POST', token }).catch(() => {}); setToken(null); }} />
        </Card>
        {me && <LoginMethods me={me} token={token} reload={loadMe} />}
        <Card>
          <Text style={st.h2} accessibilityRole="header">Messages</Text>
          <Text style={st.muted}>Tickets and trip changes are always sent. Offers only if you switch them on.</Text>
          <Check checked={consents.marketing_sms} disabled={!me?.login_methods.phone} onChange={(v) => setMarketing('marketing_sms', v)}>{`Offers by SMS${me?.login_methods.phone ? '' : ' (add a phone first)'}`}</Check>
          <Check checked={consents.marketing_email} disabled={!me?.email} onChange={(v) => setMarketing('marketing_email', v)}>{`Offers by email${me?.email ? '' : ' (no email on your account)'}`}</Check>
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

/** Add a phone, set or change a username/password, link or unlink Google. */
function LoginMethods({ me, token, reload }: { me: Me; token: string; reload: () => void }) {
  const m = me.login_methods;
  const [open, setOpen] = useState<'phone' | 'password' | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [pw, setPw] = useState({ username: '', current_password: '', password: '', password_confirmation: '' });
  const [err, setErr] = useState<ApiError | null>(null);
  const [msg, setMsg] = useState('');

  const call = async (path: string, method: string, body?: unknown, ok?: string) => {
    setErr(null); setMsg('');
    try { await api(path, { method, body, token }); reload(); if (ok) setMsg(ok); return true; } catch (e) { setErr(e as ApiError); return false; }
  };
  const general = err && !Object.keys(err.errors).length ? err.message : '';
  const row = (title: string, value: string, action: ReactNode) => (
    <View style={[st.row, { minHeight: touch }]}>
      <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: c.ink }}>{title}</Text><Text style={st.muted}>{value}</Text></View>
      {action}
    </View>
  );

  return (
    <Card>
      <Text style={st.h2} accessibilityRole="header">Sign-in methods</Text>
      {msg ? <Text style={[st.body, { color: c.okInk }]} accessibilityLiveRegion="polite">{msg}</Text> : null}
      {general ? <Text style={st.error}>{general}</Text> : null}

      {row('Phone', m.phone ? me.phone ?? '' : 'Not added', <Button kind="ghost" big={false} title={m.phone ? 'Change' : 'Add'} onPress={() => { setOpen(open === 'phone' ? null : 'phone'); setSent(false); }} />)}
      {open === 'phone' && (!sent ? <>
        <Field label="Phone number" prefix="+251" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={err?.first('phone')} />
        <Button big={false} title="Send code" onPress={async () => { if (await call('/me/phone/code', 'POST', { phone })) setSent(true); }} />
      </> : <>
        <Field label="6-digit code" keyboardType="number-pad" autoComplete="sms-otp" maxLength={6} value={code} onChangeText={setCode} error={err?.first('code')} />
        <Button big={false} title="Verify" onPress={async () => { if (await call('/me/phone', 'POST', { phone, code }, 'Phone verified. Bookings made with it now show in My trips.')) setOpen(null); }} />
      </>)}

      {row('Username & password', m.password ? (me.username ? `@${me.username}` : 'Password set') : 'Not set', <Button kind="ghost" big={false} title={m.password ? 'Change' : 'Set up'} onPress={() => setOpen(open === 'password' ? null : 'password')} />)}
      {open === 'password' && <>
        {!me.username && <Field label="Choose a username" autoCapitalize="none" autoCorrect={false} value={pw.username} onChangeText={(v) => setPw({ ...pw, username: v.toLowerCase() })} error={err?.first('username')} />}
        {m.password && <Field label="Current password" secureTextEntry value={pw.current_password} onChangeText={(v) => setPw({ ...pw, current_password: v })} error={err?.first('current_password')} />}
        <Field label="New password" hint="At least 10 characters, with letters and numbers" secureTextEntry textContentType="newPassword" value={pw.password} onChangeText={(v) => setPw({ ...pw, password: v })} error={err?.first('password')} />
        <Field label="Repeat new password" secureTextEntry textContentType="newPassword" value={pw.password_confirmation} onChangeText={(v) => setPw({ ...pw, password_confirmation: v })} />
        <Button big={false} title="Save" onPress={async () => { if (await call('/me/password', 'PUT', { ...pw, username: pw.username || null }, 'Password saved. Other devices were signed out.')) setOpen(null); }} />
      </>}

      {row('Google', m.google ? 'Linked' : googleConfigured ? 'Not linked' : 'Not available in this build',
        m.google ? <Button kind="ghost" big={false} title="Unlink" onPress={() => call('/me/google', 'DELETE', undefined, 'Google unlinked.')} /> : null)}
      {!m.google && <GoogleSignIn label="Link Google" onIdToken={(t) => call('/me/google', 'POST', { id_token: t }, 'Google linked.')} onError={setMsg} />}
    </Card>
  );
}
