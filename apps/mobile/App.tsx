import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { HomeScreen } from './src/features/home/HomeScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';
import { QuoteDetailScreen } from './src/features/quotes/QuoteDetailScreen';
import { QuoteDraftScreen } from './src/features/quotes/QuoteDraftScreen';

export default function App() {
  const [screen, setScreen] = useState<
    | { kind: 'detail'; quoteId: string }
    | { kind: 'draft'; mode: 'new' | 'resume' }
    | { kind: 'profile' }
    | { kind: 'home' }
  >({ kind: 'home' });

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
      ) : screen.kind === 'profile' ? (
        <ProfileScreen onBack={() => setScreen({ kind: 'home' })} />
      ) : (
        <QuoteDetailScreen
          onBack={() => setScreen({ kind: 'home' })}
          quoteId={screen.quoteId}
        />
      )}
      <StatusBar style="dark" />
    </>
  );
}
