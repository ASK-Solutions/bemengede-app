import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Chip, Header, st } from '../components/kit';
import { api, etb, time, type Trip } from '../lib/api';
import { c } from '../lib/theme';

type Filter = 'all' | 'cheap' | 'vip' | 'morning';
const FILTERS: [Filter, string][] = [['all', 'All operators'], ['cheap', 'Cheapest first'], ['vip', 'VIP only'], ['morning', 'Before 08:00']];
const dur = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

export default function Results() {
  const p = useLocalSearchParams<{ from: string; to: string; fromName: string; toName: string; date: string; dateLabel: string; passengers: string }>();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    api<{ data: Trip[] }>(`/trips/search?from=${p.from}&to=${p.to}&date=${p.date}&passengers=${p.passengers}`)
      .then((r) => setTrips(r.data)).catch((e) => setErr(e.message));
  }, []); // eslint-disable-line

  const list = useMemo(() => {
    let l = [...(trips ?? [])];
    if (filter === 'vip') l = l.filter((t) => t.bus_class === 'vip');
    if (filter === 'morning') l = l.filter((t) => Number(time(t.departure_at).slice(0, 2)) < 8);
    if (filter === 'cheap') l.sort((a, b) => a.price_per_seat - b.price_per_seat);
    return l;
  }, [trips, filter]);

  return (
    <View style={st.screen}>
      <Header title={`${p.fromName} → ${p.toName}`} sub={`${p.dateLabel} · ${p.passengers} passenger(s)${trips ? ` · ${list.length} buses` : ''}`} />
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: c.line, paddingVertical: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
          {FILTERS.map(([k, l]) => <Chip key={k} label={l} on={filter === k} onPress={() => setFilter(k)} />)}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
        <Text style={st.muted} accessibilityLiveRegion="polite">{err || (!trips ? 'Searching…' : 'Prices are per adult and include the service fee.')}</Text>
        {trips && list.length === 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16 }}><Text style={st.body}>No buses match. Try another filter or date.</Text></View>
        )}
        {list.map((t) => (
          <Pressable key={t.id} accessibilityRole="button"
            accessibilityLabel={`${t.operator.name}, departs ${time(t.departure_at)}, arrives ${time(t.arrival_at)}, ${etb(t.price_per_seat)} per seat, ${t.seats_left} seats left`}
            onPress={() => router.push({ pathname: '/seats/[id]', params: { id: t.id, passengers: p.passengers } })}
            style={({ pressed }) => ({ backgroundColor: '#fff', borderWidth: 1, borderColor: pressed ? c.green : c.line, borderRadius: 16, padding: 14, gap: 12 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={t.operator.name} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: c.ink }}>{t.operator.name}</Text>
                <Text style={st.muted}>{t.bus_class === 'vip' ? 'VIP' : 'Standard'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: c.ink }}>{etb(t.price_per_seat)}</Text>
                <Text style={{ fontSize: 11, color: c.muted }}>per seat, all-in</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>{time(t.departure_at)}</Text>
              <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 11, color: c.muted }}>{dur(t.duration_minutes)}</Text>
                <View style={{ height: 2, alignSelf: 'stretch', backgroundColor: c.line, borderRadius: 1 }} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>{time(t.arrival_at)}</Text>
            </View>
            <View style={st.row}>
              <Text style={{ fontSize: 12, color: c.muted }}>{t.origin.terminal}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: t.seats_left < 10 ? c.seatLow : c.green }}>{t.seats_left} seats left</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
