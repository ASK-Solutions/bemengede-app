import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, s } from '../components/ui';
import { api, isoDay } from '../lib/api';
import { c, touch } from '../lib/theme';

type City = { id: number; name_en: string };

function Chip({ label, on, onPress, a11y }: { label: string; on: boolean; onPress: () => void; a11y?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={a11y ?? label} onPress={onPress}
      style={{ minHeight: touch, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, justifyContent: 'center', backgroundColor: on ? c.ink : '#fff', borderColor: on ? c.ink : c.border }}>
      <Text style={{ color: on ? '#fff' : c.ink, fontWeight: '600', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  const [cities, setCities] = useState<City[]>([]);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const [dayOffset, setDayOffset] = useState(1);
  const [pax, setPax] = useState(1);

  useEffect(() => {
    api<City[]>('/cities').then((cs) => {
      setCities(cs);
      setFrom(cs.find((x) => x.name_en === 'Addis Ababa')?.id ?? 0);
      setTo(cs.find((x) => x.name_en === 'Mekelle')?.id ?? 0);
    }).catch(() => {});
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => i);
  const label = (i: number) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(Date.now() + i * 86400000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'Africa/Addis_Ababa' }));

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ backgroundColor: c.deep, borderRadius: 20, padding: 20, gap: 8 }}>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800' }} accessibilityRole="header">Where to?</Text>
        <Text style={{ color: c.mint, fontSize: 16 }}>Prices include the service fee. Nothing is added at checkout.</Text>
      </View>

      <Card>
        <Text style={s.h2} accessibilityRole="header">From</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cities.map((x) => <Chip key={x.id} label={x.name_en} on={from === x.id} onPress={() => setFrom(x.id)} a11y={`From ${x.name_en}`} />)}
        </View>
        <Text style={s.h2} accessibilityRole="header">To</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cities.filter((x) => x.id !== from).map((x) => <Chip key={x.id} label={x.name_en} on={to === x.id} onPress={() => setTo(x.id)} a11y={`To ${x.name_en}`} />)}
        </View>
        <Text style={s.h2} accessibilityRole="header">When</Text>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {days.map((i) => <Chip key={i} label={label(i)} on={dayOffset === i} onPress={() => setDayOffset(i)} />)}
        </ScrollView>
        <View style={s.row}>
          <Text style={s.h2}>Passengers</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Button kind="ghost" title="−" label="Fewer passengers" onPress={() => setPax(Math.max(1, pax - 1))} />
            <Text style={[s.h2, { minWidth: 20, textAlign: 'center' }]} accessibilityLabel={`${pax} passengers`}>{pax}</Text>
            <Button kind="ghost" title="+" label="More passengers" onPress={() => setPax(Math.min(6, pax + 1))} />
          </View>
        </View>
        <Button title="Find buses" disabled={!from || !to || from === to}
          onPress={() => router.push({ pathname: '/results', params: { from, to, date: isoDay(dayOffset), passengers: pax } })} />
      </Card>

      <View style={{ gap: 10 }}>
        <Link href="/account" style={s.link}>My account and trips</Link>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <Link href="/legal/terms" style={s.link}>Terms</Link>
          <Link href="/legal/privacy" style={s.link}>Privacy</Link>
          <Link href="/legal/refund" style={s.link}>Refunds</Link>
        </View>
      </View>
    </ScrollView>
  );
}
