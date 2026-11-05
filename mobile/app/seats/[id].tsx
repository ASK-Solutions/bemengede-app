import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, s } from '../../components/ui';
import { api, etb, type Trip } from '../../lib/api';
import { useSession } from '../../lib/session';
import { c } from '../../lib/theme';

export default function Seats() {
  const { id, passengers } = useLocalSearchParams<{ id: string; passengers: string }>();
  const pax = Number(passengers ?? 1);
  const { setDraft } = useSession();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  useEffect(() => { api<Trip>(`/trips/${id}`).then(setTrip); }, [id]);
  if (!trip?.layout) return <Text style={[s.body, { padding: 16 }]}>Loading seats…</Text>;

  const cols = trip.layout.columns;
  const rows: number[][] = [];
  for (let n = 1; n <= trip.seat_count!; n += cols) rows.push(Array.from({ length: Math.min(cols, trip.seat_count! - n + 1) }, (_, i) => n + i));
  const toggle = (n: number) => setSel((x) => (x.includes(n) ? x.filter((y) => y !== n) : x.length >= pax ? [...x.slice(1), n] : [...x, n]));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.screen, { alignItems: 'center' }]}>
        <Text style={s.muted}>Pick {pax} seat{pax > 1 ? 's' : ''}. Front of the bus is at the top.</Text>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((n, i) => {
              const taken = trip.unavailable_seats!.includes(n);
              const on = sel.includes(n);
              return (
                <View key={n} style={{ flexDirection: 'row' }}>
                  {i === trip.layout!.aisle_after && <View style={{ width: 24 }} />}
                  <Pressable
                    accessibilityRole="button" accessibilityLabel={`Seat ${n}${i === 0 || i === cols - 1 ? ', window' : ', aisle'}`}
                    accessibilityState={{ selected: on, disabled: taken }} disabled={taken} onPress={() => toggle(n)}
                    style={{ width: 50, height: 50, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: taken ? c.disabled : on ? c.green : '#fff', borderColor: taken ? c.disabled : on ? c.green : c.border }}>
                    <Text style={{ fontWeight: '700', color: taken ? c.disabledInk : on ? '#fff' : c.ink, textDecorationLine: taken ? 'line-through' : 'none' }}>{n}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: c.line, gap: 8 }}>
        <Text style={s.body} accessibilityLiveRegion="polite">{sel.length ? `Seats ${[...sel].sort((a, b) => a - b).join(', ')}` : 'No seat chosen'} · {etb(trip.price_per_seat * pax)} all-in</Text>
        <Button title="Continue" disabled={sel.length !== pax} onPress={() => { setDraft({ trip, seats: [...sel].sort((a, b) => a - b), passengers: pax }); router.push('/checkout'); }} />
      </View>
    </View>
  );
}
