import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { c, touch } from '../lib/theme';

export function Button({ title, onPress, kind = 'primary', disabled, label }: { title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; label?: string }) {
  const bg = disabled ? c.disabled : kind === 'primary' ? c.green : c.surface;
  const fg = disabled ? c.disabledInk : kind === 'primary' ? '#fff' : kind === 'danger' ? c.danger : c.ink;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label ?? title} accessibilityState={{ disabled: !!disabled }}
      disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: kind === 'primary' ? bg : kind === 'danger' ? c.danger : c.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Input({ label, hint, error, ...p }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label} nativeID={`l-${label}`}>{label}</Text>
      {hint && <Text style={s.hint}>{hint}</Text>}
      <TextInput accessibilityLabel={label} accessibilityHint={hint} placeholderTextColor={c.muted} style={[s.input, error ? { borderColor: c.danger, borderWidth: 2 } : null]} {...p} />
      {error && <Text style={s.error} accessibilityLiveRegion="polite" accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

/** Real checkbox (or radio) semantics; never pre-checked unless the person already chose. */
export function Checkbox({ checked, onChange, children, disabled, radio }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean; radio?: boolean }) {
  return (
    <Pressable
      accessibilityRole={radio ? 'radio' : 'checkbox'} accessibilityState={{ checked, disabled: !!disabled }} disabled={disabled}
      onPress={() => onChange(!checked)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: touch, paddingVertical: 6 }}
    >
      <View style={[s.box, radio && { borderRadius: 12 }, checked && { backgroundColor: c.green, borderColor: c.green }]}>{checked && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}</View>
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text style={s.body}>{children}</Text> : children}</View>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

export const s = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: c.ground, padding: 16, gap: 14 },
  h1: { fontSize: 28, fontWeight: '800', color: c.ink },
  h2: { fontSize: 19, fontWeight: '700', color: c.ink },
  body: { fontSize: 16, color: c.ink, lineHeight: 23 },
  muted: { fontSize: 14, color: c.muted, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '700', color: c.ink },
  hint: { fontSize: 13, color: c.muted },
  error: { fontSize: 14, color: c.danger, fontWeight: '600' },
  input: { minHeight: touch, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: c.ink, backgroundColor: '#fff' },
  btn: { minHeight: touch, borderRadius: 14, borderWidth: 1, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  alert: { backgroundColor: c.warnBg, padding: 12, borderRadius: 12 },
  link: { color: c.green, fontWeight: '700', textDecorationLine: 'underline', fontSize: 15 },
});
