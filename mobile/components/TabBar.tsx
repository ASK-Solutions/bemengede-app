import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './kit';
import { c, touch } from '../lib/theme';

/** Bottom navigation, as in the prototype. */
export default function TabBar({ active }: { active: 'search' | 'trips' | 'account' }) {
  const insets = useSafeAreaInsets();
  const items: [typeof active, string, 'search' | 'ticket' | 'user', string][] = [
    ['search', 'Search', 'search', '/'], ['trips', 'My trips', 'ticket', '/trips'], ['account', 'Account', 'user', '/account'],
  ];
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: c.line, backgroundColor: '#fff', paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 }} accessibilityRole="tablist">
      {items.map(([k, label, icon, href]) => {
        const on = k === active;
        return (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => !on && router.replace(href)}
            style={{ flex: 1, minHeight: touch, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Icon name={icon} color={on ? c.green : c.muted} />
            <Text style={{ fontSize: 11, fontWeight: on ? '700' : '600', color: on ? c.green : c.muted }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
