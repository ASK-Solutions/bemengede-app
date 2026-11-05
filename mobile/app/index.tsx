import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Icon, Logo, st } from '../components/kit';
import TabBar from '../components/TabBar';
import { api, isoDay } from '../lib/api';
import { ethiopicLabel } from '../lib/ethiopic';
import { c, touch } from '../lib/theme';

type City = { id: number; name_en: string; name_am: string | null };
type Partner = { name: string; slug: string; brand_color: string | null };

const T = {
  en: { h: 'Every intercity bus in Ethiopia, one ticket away.', sub: 'Pay with telebirr, Chapa or bank transfer. Prices include the service fee.', from: 'From', to: 'To', date: 'Travel date', pax: 'Passengers', search: 'Search buses', ops: 'Bus partners', trips: 'My trips', tripsSub: 'Find with reference + phone', checkin: 'Your ticket', checkinSub: 'Show the QR code at boarding' },
  am: { h: 'የኢትዮጵያ የከተማ ለከተማ አውቶቡሶች፣ በአንድ ትኬት።', sub: 'በቴሌብር፣ በቻፓ ወይም በባንክ ዝውውር ይክፈሉ። ዋጋው የአገልግሎት ክፍያን ያካትታል።', from: 'ከ', to: 'ወደ', date: 'የጉዞ ቀን', pax: 'ተሳፋሪዎች', search: 'አውቶቡስ ፈልግ', ops: 'የአውቶቡስ አጋሮች', trips: 'ጉዞዎቼ', tripsSub: 'በማጣቀሻ ቁጥር እና ስልክ ይፈልጉ', checkin: 'ትኬትዎ', checkinSub: 'በመሳፈሪያ ጊዜ QR ኮዱን ያሳዩ' },
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const t = T[lang];
  const [cities, setCities] = useState<City[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [from, setFrom] = useState<City | null>(null);
  const [to, setTo] = useState<City | null>(null);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [dayOffset, setDayOffset] = useState(1);
  const [pax, setPax] = useState(1);

  useEffect(() => {
    api<City[]>('/cities').then((cs) => {
      setCities(cs);
      setFrom(cs.find((x) => x.name_en === 'Addis Ababa') ?? cs[0] ?? null);
      setTo(cs.find((x) => x.name_en === 'Mekelle') ?? cs[1] ?? null);
    }).catch(() => {});
    api<Partner[]>('/partners').then(setPartners).catch(() => {});
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    return {
      i,
      dow: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Africa/Addis_Ababa' }),
      day: d.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Africa/Addis_Ababa' }),
      eth: ethiopicLabel(d),
      full: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Addis_Ababa' }),
    };
  });
  const cityName = (x: City | null) => (x ? (lang === 'am' && x.name_am ? x.name_am : x.name_en) : '…');

  return (
    <View style={st.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <View style={{ backgroundColor: c.green, paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 84, gap: 18 }}>
          <View style={st.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Logo />
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Bemengede</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={lang === 'en' ? 'Switch to Amharic' : 'Switch to English'} onPress={() => setLang(lang === 'en' ? 'am' : 'en')}
              style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{lang === 'en' ? 'EN · አማ' : 'አማ · EN'}</Text>
            </Pressable>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 32 }} accessibilityRole="header">{t.h}</Text>
            <Text style={{ color: c.mint, fontSize: 14, lineHeight: 20 }}>{t.sub}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -64, gap: 18 }}>
          {/* Search card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12, shadowColor: '#14211D', shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 4 }}>
            <View style={{ gap: 8 }}>
              <CityButton label={t.from} value={cityName(from)} onPress={() => setPicking('from')} />
              <CityButton label={t.to} value={cityName(to)} onPress={() => setPicking('to')} />
              <Pressable accessibilityRole="button" accessibilityLabel="Swap origin and destination" onPress={() => { setFrom(to); setTo(from); }}
                style={{ position: 'absolute', right: 14, top: 39, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="swap" color={c.green} size={18} />
              </Pressable>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={st.label}>{t.date}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {days.map((d) => {
                  const on = d.i === dayOffset;
                  return (
                    <Pressable key={d.i} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={d.full} onPress={() => setDayOffset(d.i)}
                      style={{ width: 70, height: 66, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: on ? c.green : '#fff', borderColor: on ? c.green : c.line }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: on ? '#fff' : c.ink }}>{d.i === 0 ? 'Today' : d.dow}</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: on ? '#fff' : c.ink }}>{d.day}</Text>
                      <Text style={{ fontSize: 10, color: on ? '#fff' : c.muted }}>{d.eth}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[st.row, { borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingVertical: 6, paddingLeft: 14, paddingRight: 6 }]}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: c.ink }}>{t.pax}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Stepper sign="−" label="Fewer passengers" onPress={() => setPax(Math.max(1, pax - 1))} disabled={pax <= 1} />
                <Text style={{ fontSize: 16, fontWeight: '800', minWidth: 16, textAlign: 'center', color: c.ink }} accessibilityLabel={`${pax} passengers`} accessibilityLiveRegion="polite">{pax}</Text>
                <Stepper sign="+" label="More passengers" onPress={() => setPax(Math.min(6, pax + 1))} disabled={pax >= 6} />
              </View>
            </View>

            <Button title={t.search} disabled={!from || !to || from.id === to.id}
              onPress={() => router.push({ pathname: '/results', params: { from: from!.id, to: to!.id, fromName: from!.name_en, toName: to!.name_en, date: isoDay(dayOffset), dateLabel: days[dayOffset].full, passengers: pax } })} />
          </View>

          {/* Partners (only companies with a signed agreement are returned by the API) */}
          {partners.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={st.h2} accessibilityRole="header">{t.ops}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {partners.map((p) => (
                  <View key={p.slug} style={{ width: 92, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={p.name}>
                    <Avatar name={p.name} size={56} color={p.brand_color} />
                    <Text style={{ fontSize: 11, fontWeight: '600', textAlign: 'center', color: c.ink }}>{p.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <QuickCard title={t.trips} sub={t.tripsSub} onPress={() => router.push('/trips')} />
            <QuickCard title={t.checkin} sub={t.checkinSub} onPress={() => router.push('/trips')} />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {[['terms', 'Terms'], ['privacy', 'Privacy'], ['refund', 'Refunds']].map(([d, l]) => (
              <Pressable key={d} accessibilityRole="link" onPress={() => router.push(`/legal/${d}`)} style={{ minHeight: touch, justifyContent: 'center' }}>
                <Text style={st.link}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <TabBar active="search" />

      <Modal visible={!!picking} animationType="slide" onRequestClose={() => setPicking(null)}>
        <View style={[st.screen, { paddingTop: insets.top }]}>
          <View style={[st.row, { padding: 16 }]}>
            <Text style={st.big} accessibilityRole="header">{picking === 'from' ? 'Leaving from' : 'Going to'}</Text>
            <Button title="Close" kind="ghost" big={false} onPress={() => setPicking(null)} />
          </View>
          <FlatList
            data={cities.filter((x) => (picking === 'from' ? x.id !== to?.id : x.id !== from?.id))}
            keyExtractor={(x) => String(x.id)}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => { (picking === 'from' ? setFrom : setTo)(item); setPicking(null); }}
                style={{ minHeight: 56, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: c.line, justifyContent: 'center', backgroundColor: '#fff' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>{item.name_en}{item.name_am ? <Text style={{ color: c.muted, fontWeight: '400' }}>  {item.name_am}</Text> : null}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function CityButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Change`} onPress={onPress}
      style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, paddingRight: 64, gap: 2 }}>
      <Text style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>{value}</Text>
    </Pressable>
  );
}

function Stepper({ sign, label, onPress, disabled }: { sign: string; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={{ width: touch, height: touch, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ fontSize: 20, color: c.ink }}>{sign}</Text>
    </Pressable>
  );
}

function QuickCard({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14, gap: 4 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: c.ink }}>{title}</Text>
      <Text style={{ fontSize: 12, color: c.muted }}>{sub}</Text>
    </Pressable>
  );
}
