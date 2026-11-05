import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, Checkbox, Input, s } from '../components/ui';
import { api, ApiError, etb, type Booking } from '../lib/api';
import { useSession } from '../lib/session';
import { c } from '../lib/theme';

type Cat = 'adult' | 'child' | 'student';
const CATS: [Cat, string][] = [['adult', 'Adult'], ['child', 'Child under 12 (−50%)'], ['student', 'Student (−20%)']];

export default function Checkout() {
  const { draft, token, rememberPhone } = useSession();
  const [names, setNames] = useState<string[]>(() => draft?.seats.map(() => '') ?? []);
  const [cats, setCats] = useState<Cat[]>(() => draft?.seats.map(() => 'adult' as Cat) ?? []);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [mSms, setMSms] = useState(false);
  const [mEmail, setMEmail] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  if (!draft) return <Text style={[s.body, { padding: 16 }]}>Start by choosing a trip.</Text>;

  const t = draft.trip;
  const fare = (cat: Cat) => Math.round(t.fare * (100 - (cat === 'child' ? 50 : cat === 'student' ? 20 : 0)) / 100);
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

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.muted}>We only ask for what goes on the ticket and the boarding list.</Text>
      {draft.seats.map((seat, i) => (
        <Card key={seat}>
          <Text style={s.h2} accessibilityRole="header">Passenger {i + 1} · Seat {seat}</Text>
          <Input label="Full name" hint="As the bus company will check it" value={names[i]} autoComplete="name"
            onChangeText={(v) => setNames(names.map((n, j) => (j === i ? v : n)))} error={err?.first(`passengers.${i}.full_name`)} />
          <View style={{ gap: 4 }} accessibilityRole="radiogroup" accessibilityLabel="Fare type">
            {CATS.map(([k, l]) => (
              <Checkbox radio key={k} checked={cats[i] === k} onChange={() => setCats(cats.map((x, j) => (j === i ? k : x)))}>{l}</Checkbox>
            ))}
          </View>
        </Card>
      ))}

      <Card>
        <Text style={s.h2} accessibilityRole="header">Ticket goes to</Text>
        <Input label="Mobile number" hint="e.g. 0911 234 567" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} error={err?.first('contact_phone')} />
        <Input label="Email (optional)" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} error={err?.first('contact_email')} />
      </Card>

      <Card>
        <Text style={s.h2} accessibilityRole="header">Price</Text>
        {draft.seats.map((seat, i) => <View key={seat} style={s.row}><Text style={s.body}>Seat {seat} · {cats[i]}</Text><Text style={s.body}>{etb(fare(cats[i]))}</Text></View>)}
        <View style={s.row}><Text style={s.body}>Service fee</Text><Text style={s.body}>{etb(fee)}</Text></View>
        <View style={[s.row, { borderTopWidth: 1, borderColor: c.line, paddingTop: 8 }]}><Text style={s.h2}>Total</Text><Text style={[s.h2, { fontSize: 22 }]}>{etb(total)}</Text></View>
        <Text style={s.muted}>No other charges. Free cancellation until {t.operator.free_cancel_hours} h before departure, then a {t.operator.late_cancel_fee_percent}% fee.</Text>
      </Card>

      <Card>
        <Checkbox checked={adult} onChange={setAdult}>I am 18 or older. Children can travel as passengers on my booking.</Checkbox>
        {err?.first('booker_is_adult') && <Text style={s.error}>{err.first('booker_is_adult')}</Text>}
        <Checkbox checked={terms} onChange={setTerms}>
          <Text style={s.body}>I agree to the <Link href="/legal/terms" style={s.link}>Terms</Link> and have read the <Link href="/legal/privacy" style={s.link}>Privacy Policy</Link>.</Text>
        </Checkbox>
        {err?.first('accept_terms') && <Text style={s.error}>{err.first('accept_terms')}</Text>}
        <Text style={[s.label, { marginTop: 6 }]}>Optional</Text>
        <Checkbox checked={mSms} onChange={setMSms}>Send me occasional offers by SMS. Stop any time.</Checkbox>
        <Checkbox checked={mEmail} onChange={setMEmail} disabled={!email}>Send me offers by email.</Checkbox>
      </Card>

      {err && !Object.keys(err.errors).some((k) => k.startsWith('passengers') || ['contact_phone', 'contact_email', 'accept_terms', 'booker_is_adult'].includes(k)) && (
        <Text style={[s.alert, s.body]} accessibilityRole="alert">{err.first()}</Text>
      )}
      <Button title={busy ? 'Holding your seats…' : `Continue to payment · ${etb(total)}`} disabled={busy} onPress={submit} />
    </ScrollView>
  );
}
