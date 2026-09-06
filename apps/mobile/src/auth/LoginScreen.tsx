import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authClient } from './auth-client';
import { authenticatedFetch } from './api-client';

export function LoginScreen(props: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'sign-in',
      });
      if (result.error)
        throw new Error(
          result.error.message ?? 'Não foi possível enviar o código.',
        );
      setCodeSent(true);
    } catch (caught) {
      setError(readError(caught, 'Não foi possível enviar o código.'));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: otp.trim(),
      });
      if (result.error)
        throw new Error(result.error.message ?? 'Código inválido.');
      await finishAuthentication();
    } catch (caught) {
      setError(readError(caught, 'Não foi possível validar o código.'));
    } finally {
      setBusy(false);
    }
  }

  async function signInSocial(provider: 'apple' | 'google') {
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: '/',
      });
      if (result.error)
        throw new Error(result.error.message ?? 'Não foi possível entrar.');
      await finishAuthentication();
    } catch (caught) {
      setError(readError(caught, 'Não foi possível entrar com este provedor.'));
    } finally {
      setBusy(false);
    }
  }

  async function finishAuthentication() {
    const response = await authenticatedFetch(
      '/v1/privacy/consents/marketing-email',
      {
        body: JSON.stringify({ channel: 'mobile', granted: marketingConsent }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      },
    );
    if (!response.ok)
      throw new Error(
        'Não foi possível salvar sua preferência de comunicação.',
      );
    props.onAuthenticated();
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>COT||||ALI</Text>
        <Text style={styles.title}>
          Entre para criar seu próximo orçamento.
        </Text>
        <Text style={styles.subtitle}>
          Use seu email ou continue com Google ou Apple. Você não precisa criar
          uma senha.
        </Text>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="seu@email.com"
          style={styles.input}
          value={email}
        />

        {codeSent ? (
          <TextInput
            autoComplete="one-time-code"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setOtp}
            placeholder="Código de 6 dígitos"
            style={styles.input}
            value={otp}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy || email.trim() === ''}
          onPress={codeSent ? verifyCode : sendCode}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            (busy || email.trim() === '') && styles.disabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {codeSent ? 'Entrar com código' : 'Receber código por email'}
            </Text>
          )}
        </Pressable>

        {codeSent ? (
          <Pressable
            disabled={busy}
            onPress={sendCode}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Enviar outro código</Text>
          </Pressable>
        ) : null}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.line} />
        </View>

        <Pressable
          disabled={busy}
          onPress={() => signInSocial('google')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Continuar com Google</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => signInSocial('apple')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Continuar com Apple</Text>
        </Pressable>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: marketingConsent }}
          onPress={() => setMarketingConsent((current) => !current)}
          style={styles.checkboxRow}
        >
          <View
            style={[
              styles.checkbox,
              marketingConsent && styles.checkboxChecked,
            ]}
          >
            {marketingConsent ? (
              <Text style={styles.checkboxMark}>✓</Text>
            ) : null}
          </View>
          <Text style={styles.checkboxText}>
            Quero receber dicas e novidades do Cotali por email.
          </Text>
        </Pressable>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Text style={styles.legal}>
          Ao continuar, você concorda com os termos e a política de privacidade
          do Cotali.
        </Text>
      </View>
    </View>
  );
}

function readError(value: unknown, fallback: string): string {
  return value instanceof Error && value.message ? value.message : fallback;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f7f8fa',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 24,
  },
  eyebrow: {
    color: '#52627a',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: { color: '#172033', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#5d6a7d', fontSize: 15, lineHeight: 22 },
  input: {
    borderColor: '#d6dbe3',
    borderRadius: 12,
    borderWidth: 1,
    color: '#172033',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#172033',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#d6dbe3',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#172033', fontSize: 15, fontWeight: '700' },
  linkButton: { alignItems: 'center', padding: 4 },
  linkText: { color: '#315f9e', fontSize: 14, fontWeight: '700' },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginVertical: 2,
  },
  line: { backgroundColor: '#e5e7eb', flex: 1, height: 1 },
  dividerText: { color: '#8490a1', fontSize: 13 },
  error: { color: '#b42318', fontSize: 14, lineHeight: 20 },
  legal: {
    color: '#8490a1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    textAlign: 'center',
  },
  checkboxRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#b8c1cd',
    borderRadius: 5,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxChecked: { backgroundColor: '#172033', borderColor: '#172033' },
  checkboxMark: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  checkboxText: { color: '#5d6a7d', flex: 1, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
});
