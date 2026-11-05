import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../lib/session';
import { c } from '../lib/theme';

export default function Root() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      {/* Every screen draws its own header, matching the prototype. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }} />
    </SessionProvider>
  );
}
