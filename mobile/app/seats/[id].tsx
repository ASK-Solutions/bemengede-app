import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Footer, Header, st } from '../../components/kit';
import { api, day, etb, time, type Trip } from '../../lib/api';
import { useSession } from '../../lib/session';
import { c } from '../../lib/theme';

export default function Seats() {
  const { id, passengers } = useLocalSearchParams<{ id: string; passengers: string }>();
  const pax = Number(passengers ?? 1);
  const { setDraft } = useSession();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  useEffect(() => { api<Trip>(`/trips/${id}`).then(setTrip); }, [id]);

  if (!trip?.layout) return <View style={st.screen}><Header title="Choose seats" /><Text style={[st.body, { padding: 16 }]}>Loading seats…</Text></View>;

  const cols = trip.layout.columns;
  const rows: number[][] = [];
  for (let n = 1; n <= trip.seat_count!; n += cols) rows.push(Array.from({ length: Math.min(cols, trip.seat_count! - n + 1) }, (_, i) => n + i));
  const toggle = (n: number) => setSel((x) => (x.includes(n) ? x.filter((y) => y !== n) : x.length >= pax ? [...x.slice(1), n] : [...x, n]));
  const sorted = [...sel].sort((a, b) => a - b);
  const done = sel.length === pax;

  return (
    <View style={st.screen}>
      <Header title={`Choose ${pax} seat${pax > 1 ? 's' : ''}`} sub={`${trip.operator.name} · ${time(trip.departure_at)} · ${day(trip.departure_at)}`} />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 16 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Legend label="Free" style={{ borderWidth: 1.5, borderColor: '#9AA59F', backgroundColor: '#fff' }} />
          <Legend label="Yours" style={{ backgroundColor: c.green }} />
          <Legend label="Taken" style={{ backgroundColor: c.disabled }} />
        </View>
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: c.line, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 18, gap: 8 }}
          accessibilityLabel="Seat map. Front of the bus is at the top.">
          <View style={[st.row, { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: c.line, paddingBottom: 8, marginBottom: 4 }]} accessibilityElementsHidden>
            <Text style={{ fontSize: 11, color: c.muted, fontWeight: '600' }}>Door</Text>
            <Text style={{ fontSize: 11, color: c.muted, fontWeight: '600' }}>Driver</Text>
          </View>
          {rows.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {row.map((n, i) => {
                const taken = trip.unavailable_seats!.includes(n);
                const on = sel.includes(n);
                return (
                  <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {i === trip.layout!.aisle_after && <Text style={{ width: 30, textAlign: 'center', fontSize: 10, color: '#6B7570' }} accessibilityElementsHidden>{r + 1}</Text>}
                    <Pressable
                      accessibilityRole="button" accessibilityLabel={`Seat ${n}, ${i === 0 || i === cols - 1 ? 'window' : 'aisle'}${taken ? ', taken' : ''}`}
                      accessibilityState={{ selected: on, disabled: taken }} disabled={taken} onPress={() => toggle(n)}
                      style={{ width: 48, height: 48, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: taken ? c.disabled : on ? c.green : '#fff', borderColor: taken ? c.disabled : on ? c.green : '#9AA59F' }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: taken ? c.disabledInk : on ? '#fff' : c.ink, textDecorationLine: taken ? 'line-through' : 'none' }}>{n}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        {/* No countdown here: the hold only starts when you continue, so a timer now would be fake. */}
        <Text style={[st.muted, { textAlign: 'center' }]}>Your seats are held for 10 minutes once you continue to passenger details.</Text>
      </ScrollView>
      <Footer>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }} accessible accessibilityLiveRegion="polite">
            <Text style={st.muted}>Seats {sorted.length ? sorted.join(', ') : '—'}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: c.ink }}>{etb(trip.price_per_seat * pax)}</Text>
          </View>
          <View style={{ minWidth: 140 }}>
            <Button title="Continue" disabled={!done} onPress={() => { setDraft({ trip, seats: sorted, passengers: pax }); router.push('/checkout'); }} />
          </View>
        </View>
      </Footer>
    </View>
  );
}

function Legend({ label, style }: { label: string; style: object }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={[{ width: 14, height: 14, borderRadius: 4 }, style]} />
      <Text style={{ fontSize: 12, color: c.muted }}>{label}</Text>
    </View>
  );
}
