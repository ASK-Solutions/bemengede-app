import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../lib/session';
import { c } from '../lib/theme';

export default function Root() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: c.deep }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: c.ground } }}>
        <Stack.Screen name="index" options={{ title: 'Bemengede' }} />
        <Stack.Screen name="results" options={{ title: 'Buses' }} />
        <Stack.Screen name="seats/[id]" options={{ title: 'Choose seats' }} />
        <Stack.Screen name="checkout" options={{ title: 'Passengers' }} />
        <Stack.Screen name="pay/[reference]" options={{ title: 'Payment' }} />
        <Stack.Screen name="booking/[reference]" options={{ title: 'Your ticket' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
        <Stack.Screen name="legal/[doc]" options={{ title: 'Policy' }} />
      </Stack>
    </SessionProvider>
  );
}
