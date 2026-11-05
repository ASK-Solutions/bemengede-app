import { router } from 'expo-router';
import { Text } from 'react-native';
import { Check, st } from './kit';

/** The two boxes every new account must tick. Never pre-ticked. */
export default function ConsentChecks({ adult, terms, setAdult, setTerms, adultError, termsError }: {
  adult: boolean; terms: boolean; setAdult: (v: boolean) => void; setTerms: (v: boolean) => void; adultError?: string; termsError?: string;
}) {
  return (
    <>
      <Check checked={adult} onChange={setAdult}>I am 18 or older. If you are under 18, ask a parent or guardian to book for you.</Check>
      {adultError ? <Text style={st.error}>{adultError}</Text> : null}
      <Check checked={terms} onChange={setTerms}>
        <Text style={st.body}>I agree to the <Text style={st.link} onPress={() => router.push('/legal/terms')}>Terms</Text> and have read the <Text style={st.link} onPress={() => router.push('/legal/privacy')}>Privacy Policy</Text>.</Text>
      </Check>
      {termsError ? <Text style={st.error}>{termsError}</Text> : null}
    </>
  );
}
