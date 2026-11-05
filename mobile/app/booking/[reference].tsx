import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Icon, st } from '../../components/kit';
import { api, ApiError, day, etb, time, type Booking } from '../../lib/api';
import { useSession } from '../../lib/session';
import { c } from '../../lib/theme';

const STATUS: Record<string, string> = {
  pending_payment: 'Waiting for payment', awaiting_verification: 'Payment being checked by the bus company', confirmed: 'Booking confirmed',
  checked_in: 'Checked in', cancelled: 'Cancelled', expired: 'Expired: payment was not completed in time', refunded: 'Refunded',
};
const PAID_WITH: Record<string, string> = { telebirr: 'telebirr', chapa: 'Chapa', transfer: 'bank transfer', cash: 'cash' };

export default function Ticket() {
  const insets = useSafeAreaInsets();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { phones, token } = useSession();
  const phone = phones[reference] ?? '';
  const [b, setB] = useState<Booking | null>(null);
  const [quote, setQuote] = useState<{ allowed: boolean; refund: number; fee: number; reason?: string } | null>(null);
  const [msg, setMsg] = useState('');
  const load = () => api<Booking>(`/bookings/${reference}?phone=${encodeURIComponent(phone)}`, { token }).then(setB).catch((e: ApiError) => setMsg(e.message));
  useEffect(() => { load(); }, [reference]); // eslint-disable-line

  if (!b) return <View style={[st.screen, { backgroundColor: c.green, padding: 24, paddingTop: insets.top + 24 }]}><Text style={{ color: '#fff' }}>{msg || 'Loading…'}</Text></View>;
  const paid = b.status === 'confirmed' || b.status === 'checked_in';
  const t = b.trip;

  return (
    <View style={[st.screen, { backgroundColor: paid ? c.green : c.deep }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <View style={{ paddingHorizontal: 4, gap: 4 }} accessibilityLiveRegion="polite">
          <Text style={{ color: c.mint, fontWeight: '600', fontSize: 13 }}>{STATUS[b.status] ?? b.status}{paid && b.payment ? ` · paid with ${PAID_WITH[b.payment.provider] ?? b.payment.provider}` : ''}</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 26 }} accessibilityRole="header">{paid ? 'Have a good journey!' : t.origin.city + ' → ' + t.destination.city}</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' }}>
          <View style={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={t.operator.name} />
              <View><Text style={{ fontWeight: '700', color: c.ink }}>{t.operator.name}</Text><Text style={st.muted}>{t.bus_class === 'vip' ? 'VIP' : 'Standard'}</Text></View>
            </View>
            <View style={[st.row, { alignItems: 'flex-end' }]}>
              <View><Text style={st.muted}>{t.origin.city}</Text><Text style={{ fontSize: 26, fontWeight: '800', color: c.ink }}>{time(t.departure_at)}</Text><Text style={{ fontSize: 11, color: c.muted }}>{t.origin.terminal}</Text></View>
              <Icon name="arrow" size={28} color="#9AA59F" />
              <View style={{ alignItems: 'flex-end' }}><Text style={st.muted}>{t.destination.city}</Text><Text style={{ fontSize: 26, fontWeight: '800', color: c.ink }}>{time(t.arrival_at)}</Text><Text style={{ fontSize: 11, color: c.muted }}>{day(t.departure_at)}</Text></View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {[['Seats', b.passengers.map((p) => p.seat_number).join(', ')], ['Passengers', String(b.passengers.length)], [paid ? 'Paid' : 'Total', etb(b.price.total)]].map(([l, v]) => (
                <View key={l} style={{ flex: 1, gap: 2 }}><Text style={st.muted}>{l}</Text><Text style={{ fontWeight: '800', fontSize: 14, color: c.ink }}>{v}</Text></View>
              ))}
            </View>
          </View>

          <View style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.line, padding: 18, gap: 12, alignItems: 'center' }}>
            {paid ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18 }}>
                {b.passengers.map((p) => p.qr && (
                  <View key={p.seat_number} style={{ alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`Boarding QR code for ${p.full_name}, seat ${p.seat_number}`}>
                    <QRCode value={p.qr} size={168} />
                    <Text style={{ fontWeight: '700', color: c.ink }}>{p.full_name} · Seat {p.seat_number}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={[st.body, { textAlign: 'center' }]}>Your QR code appears here once the payment is confirmed.</Text>
            )}
            <Text style={{ fontWeight: '800', fontSize: 20, letterSpacing: 1.5, color: c.ink }}>{b.reference}</Text>
            <Text style={[st.muted, { textAlign: 'center' }]}>Show this at the {t.operator.name} boarding gate. Sent by SMS too.</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            {b.status === 'pending_payment'
              ? <Button kind="outlineLight" title="Continue payment" onPress={() => router.replace({ pathname: '/pay/[reference]', params: { reference } })} />
              : <Button kind="outlineLight" title="Share ticket" onPress={() => Share.share({ message: `Bemengede ticket ${b.reference}: ${t.origin.city} → ${t.destination.city}, ${day(t.departure_at)} ${time(t.departure_at)}, seats ${b.passengers.map((p) => p.seat_number).join(', ')}.` })} />}
          </View>
          <View style={{ flex: 1 }}><Button kind="yellow" title="Book another" onPress={() => router.replace('/')} /></View>
        </View>

        {paid && (
          <Card>
            <Text style={st.h2}>Need to cancel?</Text>
            {!quote && <Button kind="ghost" big={false} title="See what I’d get back" onPress={() => api<typeof quote>(`/bookings/${reference}/cancellation?phone=${encodeURIComponent(phone)}`, { token }).then(setQuote)} />}
            {quote && !quote.allowed ? <Text style={st.body}>{quote.reason}</Text> : null}
            {quote?.allowed ? <>
              <Text style={st.body}>You’d get <Text style={{ fontWeight: '800' }}>{etb(quote.refund)}</Text> back{quote.fee ? ` (${etb(quote.fee)} late fee)` : ''}. The service fee isn’t refunded.</Text>
              {token
                ? <Button kind="danger" big={false} title="Cancel booking" onPress={() => api(`/bookings/${reference}/cancel`, { method: 'POST', token }).then(() => { setMsg('Cancelled. Your refund goes back to the way you paid.'); setQuote(null); load(); }).catch((e: ApiError) => setMsg(e.message))} />
                : <Button kind="ghost" big={false} title="Sign in to cancel" onPress={() => router.push('/account')} />}
            </> : null}
            {msg ? <Text style={st.body} accessibilityLiveRegion="polite">{msg}</Text> : null}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
