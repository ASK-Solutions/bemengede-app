// Extends app.json. Release builds block http:// by default, so allow it only while the API itself is
// plain http (local testing); an https production URL keeps it blocked. Re-run `npx expo prebuild` after changing.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...config.plugins,
    ['expo-build-properties', {
      android: {
        usesCleartextTraffic: (process.env.EXPO_PUBLIC_API_URL ?? '').startsWith('http://'),
        buildToolsVersion: '35.0.0',
      },
    }],
  ],
});
