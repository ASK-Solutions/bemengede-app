import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, Checkbox, Input, s } from '../../components/ui';
import { api, ApiError, etb, type Booking } from '../../lib/api';
import { useSession } from '../../lib/session';

const METHODS = [['telebirr', 'telebirr', 'Approve in your telebirr app.'], ['chapa', 'Chapa', 'Card, CBE Birr, M-Pesa and more.'], ['transfer', 'Bank or wallet transfer', 'Pay from your bank app, then enter the reference.']] as const;
const BANKS = ['CBE', 'CBE_BIRR', 'TELEBIRR', 'AWASH', 'DASHEN', 'BOA', 'SIINQEE', 'MPESA'];

export default function Pay() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { phones } = useSession();
  const phone = phones[reference] ?? '';
  const [b, setB] = useState<Booking | null>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number][0]>('telebirr');
  const [tx, setTx] = useState<string | null>(null);
  const [bank, setBank] = useState('CBE');
  const [ref, setRef] = useState('');
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => { api<Booking>(`/bookings/${reference}?phone=${encodeURIComponent(phone)}`).then(setB); }, [reference]); // eslint-disable-line
  useEffect(() => {
    if (!b?.expires_at) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(b.expires_at!).getTime() - Date.now()) / 1000)));
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, [b?.expires_at]);

  if (!b) return <Text style={[s.body, { padding: 16 }]}>Loading…</Text>;
  const goTicket = () => router.replace({ pathname: '/booking/[reference]', params: { reference } });

  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ tx_ref: string; checkout_url: string | null; booking: Booking }>(`/bookings/${reference}/pay`, { method: 'POST', body: { method, phone } });
      setB(r.booking);
      if (method === 'transfer') { setTx(r.tx_ref); setBusy(false); return; }
      if (r.checkout_url?.includes('/pay/mock')) {
        await api(`/payments/${r.tx_ref}/mock-complete`, { method: 'POST' }); // test mode only
      } else if (r.checkout_url) {
        await WebBrowser.openAuthSessionAsync(r.checkout_url, 'bemengede://');
      }
      await api(`/payments/${r.tx_ref}?phone=${encodeURIComponent(phone)}`); // server re-checks with the provider
      goTicket();
    } catch (e) { setErr(e as ApiError); setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setErr(null);
    try { await api(`/payments/${tx}/transfer`, { method: 'POST', body: { phone, bank, reference: ref } }); goTicket(); }
    catch (e) { setErr(e as ApiError); setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.h1} accessibilityRole="header">Pay {etb(b.price.total)}</Text>
      <Text style={[s.alert, s.body]} accessibilityLabel={`Seats held for ${Math.ceil(left / 60)} more minutes`}>
        Seats held for {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
      </Text>
      {!tx ? (
        <>
          <Card>
            {METHODS.map(([id, name, desc]) => (
              <Checkbox radio key={id} checked={method === id} onChange={() => setMethod(id)}>
                <Text style={s.body}><Text style={{ fontWeight: '700' }}>{name}</Text>{'\n'}<Text style={s.muted}>{desc}</Text></Text>
              </Checkbox>
            ))}
          </Card>
          <Text style={s.muted}>You pay exactly {etb(b.price.total)}. Confirmed only after the provider confirms it to us.</Text>
          {err && <Text style={s.error} accessibilityRole="alert">{err.first()}</Text>}
          <Button title={method === 'transfer' ? 'Show account details' : 'Pay now'} disabled={busy || left === 0} onPress={start} />
        </>
      ) : (
        <>
          <Card>
            <Text style={s.h2}>1. Send exactly {etb(b.price.total)} to {b.trip.operator.name}</Text>
            {b.transfer_accounts.map((a) => (
              <View key={a.account_number} style={s.row}>
                <Text style={s.body}>{a.bank}: {a.account_number}</Text>
                <Button kind="ghost" title="Copy" label={`Copy ${a.bank} account number`} onPress={() => Clipboard.setStringAsync(a.account_number)} />
              </View>
            ))}
          </Card>
          <Card>
            <Text style={s.h2}>2. Which bank did you pay from?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {BANKS.map((k) => <View key={k} style={{ width: '48%' }}><Checkbox radio checked={bank === k} onChange={() => setBank(k)}>{k.replace('_', ' ')}</Checkbox></View>)}
            </View>
            <Input label="Transaction reference" hint="From your bank receipt, e.g. FT25317XXXXX" autoCapitalize="characters" value={ref} onChangeText={setRef} error={err?.first('reference')} />
          </Card>
          {err && !err.errors.reference && <Text style={s.error}>{err.first()}</Text>}
          <Button title={busy ? 'Checking…' : 'Check my payment'} disabled={busy || ref.length < 6} onPress={verify} />
        </>
      )}
    </ScrollView>
  );
}
