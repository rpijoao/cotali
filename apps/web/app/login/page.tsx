'use client';

import { useEffect, useState } from 'react';
import { authClient, recordMarketingConsent } from '../../lib/auth-client';

const PENDING_SOCIAL_CONSENT_KEY = 'cotali.pending-marketing-consent';
const appleLoginEnabled = process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === 'true';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('oauth') !== 'complete')
      return;

    const pendingConsent = window.sessionStorage.getItem(
      PENDING_SOCIAL_CONSENT_KEY,
    );
    if (pendingConsent === null) return;

    setBusy(true);
    void (async () => {
      try {
        await recordMarketingConsent(pendingConsent === 'true');
        window.sessionStorage.removeItem(PENDING_SOCIAL_CONSENT_KEY);
        window.location.replace('/');
      } catch (caught) {
        setError(
          readError(
            caught,
            'Não foi possível salvar sua preferência de comunicação.',
          ),
        );
        setBusy(false);
      }
    })();
  }, []);

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

  async function signInWithCode() {
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: otp.trim(),
      });
      if (result.error)
        throw new Error(result.error.message ?? 'Código inválido.');
      await completeLogin();
    } catch (caught) {
      setError(readError(caught, 'Não foi possível validar o código.'));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithSocial(provider: 'apple' | 'google') {
    setBusy(true);
    setError(null);
    window.sessionStorage.setItem(
      PENDING_SOCIAL_CONSENT_KEY,
      String(marketingConsent),
    );
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: '/login?oauth=complete',
      });
      if (result.error)
        throw new Error(result.error.message ?? 'Não foi possível entrar.');
      await completeLogin();
    } catch (caught) {
      window.sessionStorage.removeItem(PENDING_SOCIAL_CONSENT_KEY);
      setError(readError(caught, 'Não foi possível entrar com este provedor.'));
    } finally {
      setBusy(false);
    }
  }

  async function completeLogin() {
    await recordMarketingConsent(marketingConsent);
    window.sessionStorage.removeItem(PENDING_SOCIAL_CONSENT_KEY);
    window.location.assign('/');
  }

  return (
    <main className="min-h-screen bg-cotali-sky px-5 py-10 text-cotali-blue">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[560px] items-center">
        <div className="w-full rounded-[28px] bg-cotali-white p-7 shadow-sm sm:p-10">
          <a
            className="text-xs font-bold uppercase tracking-[0.18em] text-cotali-blue/60"
            href="/"
          >
            Cotali
          </a>
          <h1 className="mt-8 font-cotali-display text-4xl font-semibold tracking-[-0.07em] leading-[0.98] sm:text-5xl">
            Entre para criar seu próximo orçamento.
          </h1>
          <p className="mt-5 text-sm leading-6 text-cotali-blue/65">
            Use seu email ou continue com Google. Você não precisa criar uma
            senha.
          </p>

          <label
            className="mt-8 block text-xs font-bold uppercase tracking-[0.08em] text-cotali-blue/70"
            htmlFor="email"
          >
            Seu email
          </label>
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-cotali-blue/20 bg-cotali-white px-4 py-3 text-sm outline-none transition focus:border-cotali-blue"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
            type="email"
            value={email}
          />

          {codeSent ? (
            <>
              <label
                className="mt-5 block text-xs font-bold uppercase tracking-[0.08em] text-cotali-blue/70"
                htmlFor="otp"
              >
                Código de 6 dígitos
              </label>
              <input
                autoComplete="one-time-code"
                className="mt-2 w-full rounded-xl border border-cotali-blue/20 bg-cotali-white px-4 py-3 text-sm tracking-[0.3em] outline-none transition focus:border-cotali-blue"
                id="otp"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="000000"
                value={otp}
              />
            </>
          ) : null}

          <button
            className="mt-5 w-full rounded-xl bg-cotali-blue px-4 py-3 text-sm font-bold text-cotali-white transition hover:bg-cotali-navy disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || email.trim() === ''}
            onClick={codeSent ? signInWithCode : sendCode}
            type="button"
          >
            {codeSent ? 'Entrar com código' : 'Receber código por email'}
          </button>

          {codeSent ? (
            <button
              className="mt-3 w-full text-center text-xs font-bold text-cotali-blue"
              disabled={busy}
              onClick={sendCode}
              type="button"
            >
              Enviar outro código
            </button>
          ) : null}

          <div className="my-6 flex items-center gap-3 text-xs text-cotali-blue/45">
            <span className="h-px flex-1 bg-cotali-blue/15" />
            <span>ou</span>
            <span className="h-px flex-1 bg-cotali-blue/15" />
          </div>
          <div
            className={
              appleLoginEnabled ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'
            }
          >
            <button
              className="rounded-xl border border-cotali-blue/20 px-4 py-3 text-sm font-bold transition hover:border-cotali-blue disabled:opacity-50"
              disabled={busy}
              onClick={() => signInWithSocial('google')}
              type="button"
            >
              Google
            </button>
            {appleLoginEnabled ? (
              <button
                className="rounded-xl border border-cotali-blue/20 px-4 py-3 text-sm font-bold transition hover:border-cotali-blue disabled:opacity-50"
                disabled={busy}
                onClick={() => signInWithSocial('apple')}
                type="button"
              >
                Apple
              </button>
            ) : null}
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-xs leading-5 text-cotali-blue/65">
            <input
              checked={marketingConsent}
              className="mt-1 size-4 accent-cotali-blue"
              onChange={(event) => setMarketingConsent(event.target.checked)}
              type="checkbox"
            />
            <span>Quero receber dicas e novidades do Cotali por email.</span>
          </label>
          {error ? (
            <p aria-live="polite" className="mt-5 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <p className="mt-6 text-center text-[11px] leading-5 text-cotali-blue/45">
            Ao continuar, você concorda com os termos e a política de
            privacidade do Cotali.
          </p>
        </div>
      </section>
    </main>
  );
}

function readError(value: unknown, fallback: string): string {
  return value instanceof Error && value.message ? value.message : fallback;
}
