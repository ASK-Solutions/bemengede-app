import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Check, Field, Footer, Header, Segmented, st } from '../components/kit';
import { api, ApiError, etb, type Booking } from '../lib/api';
import { useSession } from '../lib/session';
import { c } from '../lib/theme';

type Cat = 'adult' | 'child' | 'student';

export default function Checkout() {
  const { draft, token, rememberPhone } = useSession();
  const [names, setNames] = useState<string[]>(() => draft?.seats.map(() => '') ?? []);
  const [cats, setCats] = useState<Cat[]>(() => draft?.seats.map(() => 'adult' as Cat) ?? []);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // Required consents start unticked; marketing is separate, optional and unticked.
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [mSms, setMSms] = useState(false);
  const [mEmail, setMEmail] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  if (!draft) return <View style={st.screen}><Header title="Passenger details" /><Text style={[st.body, { padding: 16 }]}>Start by choosing a trip.</Text></View>;

  const t = draft.trip;
  const fare = (k: Cat) => Math.round(t.fare * (100 - (k === 'child' ? 50 : k === 'student' ? 20 : 0)) / 100);
  const fee = t.service_fee_per_seat * draft.seats.length;
  const total = cats.reduce((a, k) => a + fare(k), 0) + fee;

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const b = await api<Booking>('/bookings', {
        method: 'POST', token,
        body: {
          trip_id: t.id, contact_phone: phone, contact_email: email || null, channel: 'mobile',
          passengers: draft.seats.map((seat, i) => ({ seat_number: seat, full_name: names[i], fare_category: cats[i] })),
          accept_terms: terms, booker_is_adult: adult, marketing_sms: mSms, marketing_email: mEmail && !!email,
        },
      });
      rememberPhone(b.reference, phone);
      router.replace({ pathname: '/pay/[reference]', params: { reference: b.reference } });
    } catch (e) { setErr(e as ApiError); setBusy(false); }
  };
  const known = ['contact_phone', 'contact_email', 'accept_terms', 'booker_is_adult'];
  const general = err && !Object.keys(err.errors).some((k) => k.startsWith('passengers') || known.includes(k)) ? err.first() : '';

  return (
    <KeyboardAvoidingView style={st.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Passenger details" sub="No account needed · we’ll text your ticket" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {draft.seats.map((seat, i) => (
          <Card key={seat}>
            <View style={st.row}>
              <Text style={st.h2} accessibilityRole="header">Passenger {i + 1}</Text>
              <View style={{ backgroundColor: c.greenSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: c.green, fontWeight: '700', fontSize: 12 }}>Seat {seat}</Text>
              </View>
            </View>
            <Field label="Full name" hint="As the bus company will check it at boarding" value={names[i]} autoComplete={i === 0 ? 'name' : 'off'}
              onChangeText={(v) => setNames(names.map((n, j) => (j === i ? v : n)))} error={err?.first(`passengers.${i}.full_name`)} />
            <Text style={st.label}>Fare type</Text>
            <Segmented label={`Fare type for passenger ${i + 1}`} value={cats[i]} onChange={(v) => setCats(cats.map((x, j) => (j === i ? v : x)))}
              options={[['adult', 'Adult'], ['child', 'Child −50%'], ['student', 'Student −20%']]} />
          </Card>
        ))}

        <Card>
          <Text style={st.h2} accessibilityRole="header">Contact for this booking</Text>
          <Field label="Phone number" hint="For your ticket SMS and trip updates" prefix="+251" placeholder="9X XXX XXXX" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} error={err?.first('contact_phone')} />
          <Field label="Email (optional)" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} error={err?.first('contact_email')} />
        </Card>

        <Card>
          <Text style={st.h2} accessibilityRole="header">Price</Text>
          {draft.seats.map((seat, i) => <View key={seat} style={st.row}><Text style={st.body}>Seat {seat} · {cats[i]}</Text><Text style={st.body}>{etb(fare(cats[i]))}</Text></View>)}
          <View style={st.row}><Text style={st.body}>Service fee</Text><Text style={st.body}>{etb(fee)}</Text></View>
          <View style={[st.row, { borderTopWidth: 1, borderColor: c.line, paddingTop: 8 }]}><Text style={st.h2}>Total</Text><Text style={st.big}>{etb(total)}</Text></View>
          <Text style={st.muted}>No other charges. {t.operator.name}: free cancellation until {t.operator.free_cancel_hours} h before departure, then a {t.operator.late_cancel_fee_percent}% fee. No refund after departure.</Text>
        </Card>

        <Card>
          <Check checked={adult} onChange={setAdult}>I am 18 or older. Children can travel as passengers on my booking.</Check>
          {err?.first('booker_is_adult') ? <Text style={st.error}>{err.first('booker_is_adult')}</Text> : null}
          <Check checked={terms} onChange={setTerms}>
            <Text style={st.body}>I agree to the <Text style={st.link} onPress={() => router.push('/legal/terms')}>Terms</Text> and have read the <Text style={st.link} onPress={() => router.push('/legal/privacy')}>Privacy Policy</Text>.</Text>
          </Check>
          {err?.first('accept_terms') ? <Text style={st.error}>{err.first('accept_terms')}</Text> : null}
          <Text style={[st.label, { marginTop: 4 }]}>Optional</Text>
          <Check checked={mSms} onChange={setMSms}>Send me occasional offers by SMS. Stop any time.</Check>
          <Check checked={mEmail} onChange={setMEmail} disabled={!email}>{`Send me offers by email${email ? '' : ' (add an email first)'}.`}</Check>
        </Card>
        {general ? <Text style={[st.alert, st.body]} accessibilityRole="alert">{general}</Text> : null}
        {err?.errors.seats ? (
          <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={[st.alert, st.body]}>{err.errors.seats[0]} Tap to choose again.</Text></Pressable>
        ) : null}
      </ScrollView>
      <Footer><Button title={busy ? 'Holding your seats…' : `Continue to payment · ${etb(total)}`} busy={busy} onPress={submit} /></Footer>
    </KeyboardAvoidingView>
  );
}
