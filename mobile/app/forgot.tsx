import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Button, Card, Field, Header, st } from '../components/kit';
import { api, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import { c } from '../lib/theme';

export default function Forgot() {
  const { setToken } = useSession();
  const [login, setLogin] = useState('');
  const [sent, setSent] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Header title="Reset your password" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          {!sent ? <>
            <Field label="Username, email or phone" autoCapitalize="none" autoCorrect={false} value={login} onChangeText={setLogin} error={err?.first('login')} />
            <Button title="Send a code" busy={busy} disabled={!login} onPress={async () => {
              setBusy(true); setErr(null);
              try { setSent((await api<{ message: string }>('/auth/password/forgot', { method: 'POST', body: { login } })).message); } catch (e) { setErr(e as ApiError); }
              setBusy(false);
            }} />
          </> : <>
            <Text style={[st.body, { color: c.okInk }]} accessibilityLiveRegion="polite">{sent}</Text>
            <Field label="6-digit code" keyboardType="number-pad" autoComplete="sms-otp" maxLength={6} value={code} onChangeText={setCode} error={err?.first('code')} />
            <Field label="New password" hint="At least 10 characters, with letters and numbers" secureTextEntry textContentType="newPassword" value={pw} onChangeText={setPw} error={err?.first('password')} />
            <Field label="Repeat new password" secureTextEntry textContentType="newPassword" value={pw2} onChangeText={setPw2} />
            <Button title="Set new password" busy={busy} disabled={code.length !== 6} onPress={async () => {
              setBusy(true); setErr(null);
              try {
                const r = await api<{ token: string }>('/auth/password/reset', { method: 'POST', body: { login, code, password: pw, password_confirmation: pw2 } });
                setToken(r.token); router.replace('/account');
              } catch (e) { setErr(e as ApiError); setBusy(false); }
            }} />
            <Text style={st.muted}>You’ll be signed out on your other devices.</Text>
          </>}
        </Card>
      </ScrollView>
    </>
  );
}
