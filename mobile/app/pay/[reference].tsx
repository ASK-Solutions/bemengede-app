import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Footer, Header, Icon, st } from '../../components/kit';
import { api, ApiError, etb, type Booking } from '../../lib/api';
import { useSession } from '../../lib/session';
import { c } from '../../lib/theme';

type Method = 'telebirr' | 'chapa' | 'transfer';
const METHODS: { id: Method; name: string; desc: string; tag: string }[] = [
  { id: 'telebirr', name: 'telebirr', desc: 'Approve in the telebirr app. Confirmed as soon as telebirr tells us.', tag: 'Wallet' },
  { id: 'chapa', name: 'Chapa', desc: 'Card, CBE Birr, M-Pesa and more on Chapa’s secure page.', tag: 'Checkout' },
  { id: 'transfer', name: 'Bank or wallet transfer', desc: 'Pay from any bank app, then enter the reference. We check it with verify.et.', tag: 'verify.et' },
];
const BANKS: [string, string][] = [['CBE', 'CBE'], ['TELEBIRR', 'telebirr'], ['CBE_BIRR', 'CBE Birr'], ['AWASH', 'Awash'], ['DASHEN', 'Dashen'], ['BOA', 'BOA'], ['MPESA', 'M-Pesa'], ['SIINQEE', 'Siinqee']];
const CHECKS: Record<string, string> = { found: 'Receipt found', amount: 'Amount covers the booking', receiver: 'Paid to the bus company’s account', after_booking: 'Paid after the booking was made', unused: 'Reference not used on any other booking' };

/** Countdown to the REAL hold expiry from the server. */
function useLeft(iso: string | null | undefined) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)));
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, [iso]);
  return left;
}

export default function Pay() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { phones } = useSession();
  const phone = phones[reference] ?? '';
  const [b, setB] = useState<Booking | null>(null);
  const [method, setMethod] = useState<Method>('telebirr');
  const [stage, setStage] = useState<'choose' | 'mock' | 'transfer'>('choose');
  const [tx, setTx] = useState<string | null>(null);
  const [bank, setBank] = useState('CBE');
  const [ref, setRef] = useState('');
  const [result, setResult] = useState<{ decision: string; checks: Record<string, boolean> } | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const left = useLeft(b?.expires_at);

  useEffect(() => { api<Booking>(`/bookings/${reference}?phone=${encodeURIComponent(phone)}`).then(setB).catch(setErr); }, [reference]); // eslint-disable-line

  const goTicket = () => router.replace({ pathname: '/booking/[reference]', params: { reference } });
  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  const hold = <View style={{ backgroundColor: c.warnBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }} accessible accessibilityLabel={`Seats held for ${Math.ceil(left / 60)} more minutes`}><Text style={{ color: c.warnInk, fontWeight: '700', fontSize: 12 }}>Held {mmss}</Text></View>;

  if (!b) return <View style={st.screen}><Header title="Payment" /><Text style={[st.body, { padding: 16 }]}>{err?.message ?? 'Loading…'}</Text></View>;
  const mName = METHODS.find((m) => m.id === method)!.name;

  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ tx_ref: string; checkout_url: string | null; booking: Booking }>(`/bookings/${reference}/pay`, { method: 'POST', body: { method, phone } });
      setB(r.booking); setTx(r.tx_ref); setBusy(false);
      if (method === 'transfer') return setStage('transfer');
      if (r.checkout_url?.includes('/pay/mock')) return setStage('mock'); // test mode only
      if (r.checkout_url) await WebBrowser.openAuthSessionAsync(r.checkout_url, 'bemengede://');
      await api(`/payments/${r.tx_ref}?phone=${encodeURIComponent(phone)}`); // the server re-checks with the provider
      goTicket();
    } catch (e) { setErr(e as ApiError); setBusy(false); }
  };
  const mockPay = async () => {
    setBusy(true);
    try { await api(`/payments/${tx}/mock-complete`, { method: 'POST' }); goTicket(); } catch (e) { setErr(e as ApiError); setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ decision: string; checks: Record<string, boolean> }>(`/payments/${tx}/transfer`, { method: 'POST', body: { phone, bank, reference: ref } });
      setResult(r); setBusy(false);
    } catch (e) { setErr(e as ApiError); setBusy(false); }
  };

  // ---------- Simulated provider page (PAYMENTS_MODE=mock only) ----------
  if (stage === 'mock') {
    return (
      <View style={[st.screen, { backgroundColor: c.soft }]}>
        <Header title={`${mName} checkout`} sub="Test mode: no real money moves" onBack={() => setStage('choose')} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 22, gap: 12, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#9AA59F' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1, color: c.muted }}>SIMULATED PROVIDER SCREEN</Text>
            <Text style={st.muted}>Paying Bemengede · {b.trip.operator.name}</Text>
            <Text style={{ fontSize: 32, fontWeight: '800', color: c.ink }}>{etb(b.price.total)}</Text>
            <Text style={st.muted}>Booking {b.reference}</Text>
          </View>
          <Card>
            <Text style={st.h2}>What happens next</Text>
            {[`You approve in ${mName}.`, `${mName} tells Bemengede.`, `Bemengede re-checks the payment with ${mName}.`, 'Your seats are confirmed and the ticket is sent by SMS.'].map((s, i) => (
              <Text key={i} style={st.body}>{i + 1}. {s}</Text>
            ))}
          </Card>
        </ScrollView>
        <Footer><Button kind="dark" title="Simulate successful payment" busy={busy} onPress={mockPay} /></Footer>
      </View>
    );
  }

  // ---------- Bank / wallet transfer checked with verify.et ----------
  if (stage === 'transfer') {
    const ok = result?.decision === 'auto_approved';
    return (
      <View style={st.screen}>
        <Header title="Pay by transfer" sub="Receipt checked by verify.et" right={hold} onBack={() => setStage('choose')} />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={st.h2}>1 · Send exactly {etb(b.price.total)} to {b.trip.operator.name}</Text>
            {b.transfer_accounts.map((a) => (
              <View key={a.bank + a.account_number} style={[st.row, { backgroundColor: c.ground, borderRadius: 10, padding: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={st.muted}>{a.bank} · {a.account_name}</Text>
                  <Text style={{ fontWeight: '800', fontSize: 16, letterSpacing: 0.5, color: c.ink }}>{a.account_number}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${a.bank} account number`} onPress={() => Clipboard.setStringAsync(a.account_number)}
                  style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.border, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="copy" size={16} /><Text style={{ fontWeight: '700', fontSize: 13, color: c.ink }}>Copy</Text>
                </Pressable>
              </View>
            ))}
            <Text style={st.muted}>Put <Text style={{ fontWeight: '800', color: c.ink }}>{b.reference}</Text> in the remark if your bank allows it.</Text>
          </Card>
          <Card>
            <Text style={st.h2}>2 · Which bank or wallet did you use?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {BANKS.map(([k, l]) => <Chip key={k} label={l} on={bank === k} onPress={() => setBank(k)} />)}
            </View>
            <Field label="3 · Transaction reference" hint="From your bank receipt, e.g. FT25317XXXXX" autoCapitalize="characters" autoCorrect={false} value={ref} onChangeText={setRef} error={err?.first('reference')} />
          </Card>
          {busy && <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><ActivityIndicator color={c.green} /><Text style={st.body}>Checking with verify.et…</Text></Card>}
          {result && (
            <View style={{ backgroundColor: ok ? c.okBg : c.warnBg, borderRadius: 16, padding: 14, gap: 8 }} accessibilityLiveRegion="polite">
              <Text style={{ fontWeight: '800', fontSize: 15, color: ok ? c.okInk : c.warnInk }}>{ok ? 'Payment verified' : 'The bus company will check this payment'}</Text>
              {Object.entries(result.checks).map(([k, pass]) => (
                <View key={k} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Text style={{ width: 18, fontWeight: '800', color: pass ? c.green : c.danger }} accessibilityLabel={pass ? 'Passed' : 'Did not pass'}>{pass ? '✓' : '!'}</Text>
                  <Text style={st.body}>{CHECKS[k] ?? k}</Text>
                </View>
              ))}
              {!ok && <Text style={st.muted}>Your seats stay held. We’ll text you as soon as they decide.</Text>}
            </View>
          )}
          {err && !err.errors.reference ? <Text style={st.error}>{err.first()}</Text> : null}
        </ScrollView>
        <Footer>
          {result ? <Button title={ok ? 'View my ticket' : 'View my booking'} onPress={goTicket} />
            : <Button title="Verify my payment" busy={busy} disabled={ref.trim().length < 6} onPress={verify} />}
        </Footer>
      </View>
    );
  }

  // ---------- Choose a method ----------
  return (
    <View style={st.screen}>
      <Header title="Payment" right={hold} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <View style={st.row}><Text style={st.muted}>{b.passengers.length} × seat · {b.trip.operator.name}</Text><Text style={st.body}>{etb(b.price.subtotal - b.price.discount)}</Text></View>
          <View style={st.row}><Text style={st.muted}>Service fee</Text><Text style={st.body}>{etb(b.price.service_fee)}</Text></View>
          <View style={[st.row, { borderTopWidth: 1, borderColor: c.line, paddingTop: 8 }]}><Text style={st.h2}>Total</Text><Text style={st.big}>{etb(b.price.total)}</Text></View>
        </Card>
        <Text style={[st.h2, { marginTop: 4 }]} accessibilityRole="header">Pay with</Text>
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {METHODS.map((m) => {
            const on = method === m.id;
            return (
              <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${m.name}. ${m.desc}`} onPress={() => setMethod(m.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: on ? 2 : 1, borderColor: on ? c.green : c.line, margin: on ? 0 : 1 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 2, borderColor: on ? c.green : '#9AA59F' }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: c.ink }}>{m.name}</Text>
                  <Text style={st.muted}>{m.desc}</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}><Text style={{ fontSize: 11, fontWeight: '700', color: c.muted }}>{m.tag}</Text></View>
              </Pressable>
            );
          })}
        </View>
        <Text style={st.muted}>Your booking is confirmed only after Bemengede checks the payment with the provider, server to server.</Text>
        {err ? <Text style={st.error} accessibilityRole="alert">{err.first()}</Text> : null}
        {left === 0 && b.expires_at ? <Text style={[st.alert, st.body]}>Your seat hold has ended. Go back and choose seats again.</Text> : null}
      </ScrollView>
      <Footer>
        <Button title={method === 'transfer' ? `Continue · ${etb(b.price.total)}` : `Pay ${etb(b.price.total)} with ${mName}`} busy={busy} disabled={left === 0} onPress={start} />
      </Footer>
    </View>
  );
}
