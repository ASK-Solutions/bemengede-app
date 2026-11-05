import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import ConsentChecks from '../components/ConsentChecks';
import GoogleSignIn from '../components/GoogleSignIn';
import { Button, Card, Field, Footer, Header, st } from '../components/kit';
import { api, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import { useGoogle } from '../lib/useGoogle';

export default function SignUp() {
  const { setToken } = useSession();
  const done = () => router.replace('/account');
  const google = useGoogle(done);
  const [f, setF] = useState({ username: '', password: '', password_confirmation: '', name: '', email: '' });
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ token: string }>('/auth/register', { method: 'POST', body: { ...f, username: f.username.trim().toLowerCase(), name: f.name || null, email: f.email || null, accept_terms: terms, confirm_adult: adult, device_name: 'mobile' } });
      setToken(r.token); done();
    } catch (e) { setErr(e as ApiError); setBusy(false); }
  };

  if (google.pending) {
    return (
      <>
        <Header title="Almost done" />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Card>
            <ConsentChecks adult={adult} terms={terms} setAdult={setAdult} setTerms={setTerms} />
            {google.error ? <Text style={st.error}>{google.error}</Text> : null}
            <Button title="Create account with Google" disabled={!adult || !terms} onPress={() => google.finish(adult, terms)} />
          </Card>
        </ScrollView>
      </>
    );
  }

  const general = err && !Object.keys(err.errors).length ? err.message : '';
  return (
    <KeyboardAvoidingView style={st.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Create an account" sub="Keeps all your trips in one place" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <GoogleSignIn label="Sign up with Google" onIdToken={google.start} onError={google.setError} />
          {google.error ? <Text style={st.error}>{google.error}</Text> : null}
          <Button kind="ghost" title="Sign up with your phone number" onPress={() => router.replace('/account')} />
          <Text style={[st.muted, { textAlign: 'center' }]}>or choose a username</Text>
          <Field label="Username" hint="3–30 lowercase letters, numbers, dots or underscores" autoCapitalize="none" autoCorrect={false} textContentType="username" value={f.username} onChangeText={(v) => setF({ ...f, username: v.toLowerCase() })} error={err?.first('username')} />
          <Field label="Password" hint="At least 10 characters, with letters and numbers" secureTextEntry textContentType="newPassword" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} error={err?.first('password')} />
          <Field label="Repeat password" secureTextEntry textContentType="newPassword" value={f.password_confirmation} onChangeText={(v) => setF({ ...f, password_confirmation: v })} />
          <Field label="Name (optional)" autoComplete="name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <Field label="Email (optional)" hint="Lets you reset your password if you forget it" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} error={err?.first('email')} />
          <ConsentChecks adult={adult} terms={terms} setAdult={setAdult} setTerms={setTerms} adultError={err?.first('confirm_adult')} termsError={err?.first('accept_terms')} />
          {general ? <Text style={st.error}>{general}</Text> : null}
          <Text style={st.muted}>Without an email or phone on your account we can’t help you reset a forgotten password. You can add a phone later.</Text>
        </Card>
      </ScrollView>
      <Footer><Button title="Create account" busy={busy} onPress={submit} /></Footer>
    </KeyboardAvoidingView>
  );
}
