import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button, Card, s } from '../../components/ui';
import { api, ApiError, day, etb, time, type Booking } from '../../lib/api';
import { useSession } from '../../lib/session';

const STATUS: Record<string, string> = {
  pending_payment: 'Waiting for payment', awaiting_verification: 'Payment being checked by the bus company', confirmed: 'Confirmed',
  checked_in: 'Checked in', cancelled: 'Cancelled', expired: 'Expired: payment not completed in time', refunded: 'Refunded',
};

export default function Ticket() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { phones, token } = useSession();
  const phone = phones[reference] ?? '';
  const [b, setB] = useState<Booking | null>(null);
  const [quote, setQuote] = useState<{ allowed: boolean; refund: number; fee: number; reason?: string } | null>(null);
  const [msg, setMsg] = useState('');
  const load = () => api<Booking>(`/bookings/${reference}?phone=${encodeURIComponent(phone)}`, { token }).then(setB);
  useEffect(() => { load(); }, [reference]); // eslint-disable-line
  if (!b) return <Text style={[s.body, { padding: 16 }]}>Loading…</Text>;
  const paid = b.status === 'confirmed' || b.status === 'checked_in';

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={[s.alert, s.body]} accessibilityLiveRegion="polite">{STATUS[b.status] ?? b.status}</Text>
      <Text style={s.h1} accessibilityRole="header">{b.trip.origin.city} → {b.trip.destination.city}</Text>
      <Text style={s.muted}>{b.trip.operator.name} · {day(b.trip.departure_at)} {time(b.trip.departure_at)} · {b.trip.origin.terminal}</Text>
      {b.passengers.map((p) => (
        <Card key={p.seat_number}>
          <Text style={s.h2}>{p.full_name} · Seat {p.seat_number}</Text>
          {p.qr && (
            <View style={{ alignItems: 'center', padding: 8 }} accessible accessibilityLabel={`Boarding QR code for ${p.full_name}, seat ${p.seat_number}`}>
              <QRCode value={p.qr} size={180} />
            </View>
          )}
        </Card>
      ))}
      <Card>
        <Text style={s.h2}>Receipt · {b.reference}</Text>
        <View style={s.row}><Text style={s.body}>Fares</Text><Text style={s.body}>{etb(b.price.subtotal - b.price.discount)}</Text></View>
        <View style={s.row}><Text style={s.body}>Service fee</Text><Text style={s.body}>{etb(b.price.service_fee)}</Text></View>
        <View style={s.row}><Text style={s.h2}>Total</Text><Text style={s.h2}>{etb(b.price.total)}</Text></View>
      </Card>
      {paid && (
        <Card>
          <Text style={s.h2}>Cancel this trip</Text>
          {!quote && <Button kind="ghost" title="See what I’d get back" onPress={() => api<typeof quote>(`/bookings/${reference}/cancellation?phone=${encodeURIComponent(phone)}`, { token }).then(setQuote)} />}
          {quote && !quote.allowed && <Text style={s.body}>{quote.reason}</Text>}
          {quote?.allowed && (
            <>
              <Text style={s.body}>You’d get {etb(quote.refund)} back{quote.fee ? ` (${etb(quote.fee)} late fee)` : ''}. The service fee isn’t refunded.</Text>
              {token
                ? <Button kind="danger" title="Cancel booking" onPress={() => api(`/bookings/${reference}/cancel`, { method: 'POST', token }).then(() => { setMsg('Cancelled. Your refund goes back to the way you paid.'); setQuote(null); load(); }).catch((e: ApiError) => setMsg(e.message))} />
                : <Text style={s.body}>Sign in under Account to cancel.</Text>}
            </>
          )}
        </Card>
      )}
      {msg ? <Text style={s.body} accessibilityLiveRegion="polite">{msg}</Text> : null}
    </ScrollView>
  );
}
