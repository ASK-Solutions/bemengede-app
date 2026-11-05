import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, s } from '../components/ui';
import { api, etb, time, type Trip } from '../lib/api';

export default function Results() {
  const p = useLocalSearchParams<{ from: string; to: string; date: string; passengers: string }>();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<{ data: Trip[] }>(`/trips/search?from=${p.from}&to=${p.to}&date=${p.date}&passengers=${p.passengers}`).then((r) => setTrips(r.data)).catch((e) => setErr(e.message));
  }, []); // eslint-disable-line

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.muted} accessibilityLiveRegion="polite">{err || (!trips ? 'Searching…' : `${trips.length} buses on ${p.date}`)}</Text>
      {trips?.length === 0 && <Card><Text style={s.body}>No buses with enough free seats that day. Try another date.</Text></Card>}
      {trips?.map((t) => (
        <Card key={t.id}>
          <Text style={s.h2}>{t.operator.name}</Text>
          <Text style={s.body}>{time(t.departure_at)} {t.origin.terminal} → {time(t.arrival_at)} {t.destination.city}</Text>
          <Text style={s.muted}>{t.seats_left} seats available · {t.bus_class === 'vip' ? 'VIP' : 'Standard'}</Text>
          <View style={s.row}>
            <View>
              <Text style={[s.h2, { fontSize: 22 }]}>{etb(t.price_per_seat)}</Text>
              <Text style={s.muted}>per adult, all-in</Text>
            </View>
            <Button title="Choose seats" label={`Choose seats on ${t.operator.name} at ${time(t.departure_at)}`}
              onPress={() => router.push({ pathname: '/seats/[id]', params: { id: t.id, passengers: p.passengers } })} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
