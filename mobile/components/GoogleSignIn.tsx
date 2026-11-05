import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { c, touch } from '../lib/theme';

WebBrowser.maybeCompleteAuthSession();

// Expo only inlines literal process.env.EXPO_PUBLIC_* references.
const IDS = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
};
export const googleConfigured = Platform.OS === 'android' ? !!IDS.androidClientId : Platform.OS === 'ios' ? !!IDS.iosClientId : !!IDS.webClientId;

/**
 * "Continue with Google". Returns Google's ID token; our server verifies it.
 * Renders nothing until the client IDs are set (the hook would throw otherwise).
 */
export default function GoogleSignIn(props: { label?: string; onIdToken: (t: string) => void; onError: (m: string) => void }) {
  if (!googleConfigured) return null;
  return <Inner {...props} />;
}

function Inner({ label = 'Continue with Google', onIdToken, onError }: { label?: string; onIdToken: (t: string) => void; onError: (m: string) => void }) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(IDS);

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) onIdToken(response.params.id_token);
    else if (response?.type === 'error') onError('Google sign-in failed. Please try again.');
  }, [response]); // eslint-disable-line

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !request }} disabled={!request} onPress={() => promptAsync()}
      style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: request ? 1 : 0.6 }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={18} height={18} viewBox="0 0 48 48">
          <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z" />
          <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <Path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z" />
          <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6C6.5 42.6 14.6 48 24 48z" />
        </Svg>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: c.ink, minHeight: touch / 2 }}>{label}</Text>
    </Pressable>
  );
}
