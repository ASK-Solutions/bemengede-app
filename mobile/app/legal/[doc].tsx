import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Header, st } from '../../components/kit';
import { api } from '../../lib/api';
import { c } from '../../lib/theme';

const TITLES: Record<string, string> = { privacy: 'Privacy Policy', terms: 'Terms of Service', refund: 'Refund Policy', cookies: 'Cookie Policy' };

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const [md, setMd] = useState<string | null>(null);
  useEffect(() => { api<{ markdown: string }>(`/legal/${doc}`).then((d) => setMd(d.markdown)).catch(() => setMd('Could not load. Please check your connection.')); }, [doc]);
  return (
    <>
      <Header title={TITLES[doc] ?? 'Policy'} />
      <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16 }}>
        {md === null ? <Text style={st.body}>Loading…</Text> : (
          <Markdown style={{ body: { color: c.ink, fontSize: 16, lineHeight: 24 }, heading1: { fontSize: 26, fontWeight: '800' }, heading2: { fontSize: 19, fontWeight: '700', marginTop: 18 }, link: { color: c.green } }}>{md}</Markdown>
        )}
      </ScrollView>
    </>
  );
}
