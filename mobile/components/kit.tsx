import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { avatarColors, c, touch } from '../lib/theme';

// ---------- Icons (decorative; the button around them carries the label) ----------
type IconName = 'back' | 'swap' | 'search' | 'ticket' | 'qr' | 'user' | 'check' | 'arrow' | 'copy';
export function Icon({ name, size = 20, color = c.ink }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'back' && <Path d="M15 18l-6-6 6-6" {...p} />}
      {name === 'swap' && <Path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" {...p} />}
      {name === 'search' && <><Circle cx="11" cy="11" r="7" {...p} /><Path d="M20 20l-3.5-3.5" {...p} /></>}
      {name === 'ticket' && <Path d="M4 7h16v10H4zM9 7v10" {...p} />}
      {name === 'qr' && <Path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z" {...p} />}
      {name === 'user' && <><Circle cx="12" cy="8" r="4" {...p} /><Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" {...p} /></>}
      {name === 'check' && <Path d="M5 12l5 5L20 7" {...p} strokeWidth={2.5} />}
      {name === 'arrow' && <Path d="M5 12h14M13 6l6 6-6 6" {...p} />}
      {name === 'copy' && <Path d="M9 9h10v10H9zM5 15V5h10" {...p} />}
    </Svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: c.yellow, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontWeight: '800', fontSize: size * 0.5, color: c.ink }}>በ</Text>
    </View>
  );
}

export function initials(name: string) {
  const w = name.replace(/S\.C\.|PLC/g, '').trim().split(/\s+/);
  return (w[0][0] + (w[1] ? w[1][0] : w[0][1] ?? '')).toUpperCase();
}
export function hashIndex(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % avatarColors.length;
}
/** Initials tile for an operator (decorative; the name is always shown next to it). */
export function Avatar({ name, size = 40, color }: { name: string; size?: number; color?: string | null }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color ?? avatarColors[hashIndex(name)], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

// ---------- Layout ----------
/** White screen header with a back button, title and optional subtitle/right badge (as in the prototype). */
export function Header({ title, sub, right, onBack }: { title: string; sub?: string; right?: ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.header, { paddingTop: insets.top + 10 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} style={st.back}>
        <Icon name="back" />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={st.headerTitle} accessibilityRole="header" numberOfLines={2}>{title}</Text>
        {sub ? <Text style={st.headerSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Sticky footer bar for the main action. */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[st.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[st.card, style]}>{children}</View>;
}

// ---------- Controls ----------
export function Button({ title, onPress, kind = 'primary', disabled, busy, label, big = true }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'dark' | 'yellow' | 'outlineLight'; disabled?: boolean; busy?: boolean; label?: string; big?: boolean;
}) {
  const bg = disabled ? c.disabled : { primary: c.green, ghost: c.surface, danger: c.surface, dark: c.ink, yellow: c.yellow, outlineLight: 'transparent' }[kind];
  const fg = disabled ? c.disabledInk : { primary: '#fff', ghost: c.ink, danger: c.danger, dark: '#fff', yellow: c.ink, outlineLight: '#fff' }[kind];
  const bc = disabled ? c.disabled : { primary: c.green, ghost: c.border, danger: c.danger, dark: c.ink, yellow: c.yellow, outlineLight: 'rgba(255,255,255,0.5)' }[kind];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? title} accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy} onPress={onPress}
      style={({ pressed }) => [st.btn, { minHeight: big ? 52 : touch, backgroundColor: bg, borderColor: bc, opacity: pressed ? 0.85 : 1 }]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[st.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ label, on, onPress, a11y }: { label: string; on: boolean; onPress: () => void; a11y?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={a11y ?? label} onPress={onPress}
      style={[st.chip, on ? { backgroundColor: c.ink, borderColor: c.ink } : null]}>
      <Text style={{ color: on ? '#fff' : c.ink, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

/** Two or more equal options in a grey track (One-way / Round trip style). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <View style={st.seg} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(([v, l]) => {
        const on = v === value;
        return (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(v)}
            style={[st.segItem, on ? st.segOn : null]}>
            <Text style={{ fontWeight: on ? '700' : '600', color: on ? c.ink : c.muted, fontSize: 14 }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, hint, error, prefix, ...p }: TextInputProps & { label: string; hint?: string; error?: string; prefix?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={st.label}>{label}</Text>
      {hint ? <Text style={st.hint}>{hint}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {prefix ? <View style={st.prefix}><Text style={{ fontSize: 15, color: c.ink }}>{prefix}</Text></View> : null}
        <TextInput accessibilityLabel={label} accessibilityHint={hint} placeholderTextColor={c.muted}
          style={[st.input, { flex: 1 }, error ? { borderColor: c.danger, borderWidth: 2 } : null]} {...p} />
      </View>
      {error ? <Text style={st.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

/** Real checkbox (or radio) semantics; never pre-checked unless the person already chose. */
export function Check({ checked, onChange, children, disabled, radio }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean; radio?: boolean }) {
  return (
    <Pressable accessibilityRole={radio ? 'radio' : 'checkbox'} accessibilityState={{ checked, disabled: !!disabled }} disabled={disabled}
      onPress={() => onChange(!checked)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: touch, paddingVertical: 6, opacity: disabled ? 0.6 : 1 }}>
      <View style={[st.box, radio ? { borderRadius: 12 } : null, checked ? { backgroundColor: c.green, borderColor: c.green } : null]}>
        {checked ? <Icon name="check" size={14} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text style={st.body}>{children}</Text> : children}</View>
    </Pressable>
  );
}

export function Pill({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  const t = { ok: [c.okBg, c.okInk], warn: [c.warnBg, c.warnInk], bad: [c.badBg, c.badInk], neutral: [c.soft, c.disabledInk] }[tone];
  return <View style={{ backgroundColor: t[0], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' }}><Text style={{ color: t[1], fontWeight: '700', fontSize: 12 }}>{text}</Text></View>;
}

export const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ground },
  body: { fontSize: 15, color: c.ink, lineHeight: 22 },
  muted: { fontSize: 13, color: c.muted, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '700', color: c.muted },
  hint: { fontSize: 12, color: c.muted },
  error: { fontSize: 14, color: c.danger, fontWeight: '600' },
  h2: { fontSize: 17, fontWeight: '800', color: c.ink },
  big: { fontSize: 22, fontWeight: '800', color: c.ink },
  header: { backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
  headerSub: { fontSize: 12, color: c.muted },
  back: { width: touch, height: touch, borderRadius: 12, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' },
  footer: { backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.line, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 14, gap: 10 },
  btn: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, justifyContent: 'center' },
  seg: { flexDirection: 'row', gap: 6, backgroundColor: c.soft, borderRadius: 12, padding: 4 },
  segItem: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: c.surface, shadowColor: '#14211D', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  input: { minHeight: touch, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, color: c.ink, backgroundColor: '#fff' },
  prefix: { minHeight: touch, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  alert: { backgroundColor: c.warnBg, padding: 12, borderRadius: 12 },
  link: { color: c.green, fontWeight: '700', textDecorationLine: 'underline', fontSize: 14 },
});
