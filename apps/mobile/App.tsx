import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import type { QuoteDetails } from '@cotali/contracts';
import { LoginScreen } from './src/auth/LoginScreen';
import { authClient } from './src/auth/auth-client';
import { HomeScreen } from './src/features/home/HomeScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';
import { QuoteDetailScreen } from './src/features/quotes/QuoteDetailScreen';
import { QuoteDraftScreen } from './src/features/quotes/QuoteDraftScreen';

export default function App() {
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<
    | { kind: 'detail'; quoteId: string }
    | { kind: 'draft'; mode: 'new' | 'resume' }
    | { kind: 'edit'; quote: QuoteDetails }
    | { kind: 'profile' }
    | { kind: 'home' }
  >({ kind: 'home' });

  useEffect(() => {
    void authClient
      .getSession()
      .then((result) => {
        setSessionReady(Boolean(result.data?.user));
      })
      .catch(() => {
        setSessionReady(false);
      });
  }, []);

  if (sessionReady === null) return <StatusBar style="dark" />;
  if (!sessionReady) {
    return (
      <>
        <LoginScreen onAuthenticated={() => setSessionReady(true)} />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <>
      {screen.kind === 'home' ? (
        <HomeScreen
          onContinueDraft={() => setScreen({ kind: 'draft', mode: 'resume' })}
          onCreateQuote={() => setScreen({ kind: 'draft', mode: 'new' })}
          onOpenQuote={(quoteId) => setScreen({ kind: 'detail', quoteId })}
          onOpenProfile={() => setScreen({ kind: 'profile' })}
        />
      ) : screen.kind === 'draft' ? (
        <QuoteDraftScreen
          onBackToHome={() => setScreen({ kind: 'home' })}
          onSaved={() => setScreen({ kind: 'home' })}
          startFresh={screen.mode === 'new'}
        />
      ) : screen.kind === 'edit' ? (
        <QuoteDraftScreen
          editingQuote={screen.quote}
          onBackToHome={() =>
            setScreen({ kind: 'detail', quoteId: screen.quote.id })
          }
          onSaved={() =>
            setScreen({ kind: 'detail', quoteId: screen.quote.id })
          }
        />
      ) : screen.kind === 'profile' ? (
        <ProfileScreen
          onBack={() => setScreen({ kind: 'home' })}
          onSignOut={async () => {
            const result = await authClient.signOut();
            if (result.error)
              throw new Error('Não foi possível sair da conta.');
            setSessionReady(false);
          }}
        />
      ) : (
        <QuoteDetailScreen
          onBack={() => setScreen({ kind: 'home' })}
          onEdit={(quote) => setScreen({ kind: 'edit', quote })}
          quoteId={screen.quoteId}
        />
      )}
      <StatusBar style="dark" />
    </>
  );
}
