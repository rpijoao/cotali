import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { HomeScreen } from './src/features/home/HomeScreen';
import { QuoteDetailScreen } from './src/features/quotes/QuoteDetailScreen';
import { QuoteDraftScreen } from './src/features/quotes/QuoteDraftScreen';

export default function App() {
  const [screen, setScreen] = useState<
    | { kind: 'detail'; quoteId: string }
    | { kind: 'draft'; mode: 'new' | 'resume' }
    | { kind: 'home' }
  >({ kind: 'home' });

  return (
    <>
      {screen.kind === 'home' ? (
        <HomeScreen
          onContinueDraft={() => setScreen({ kind: 'draft', mode: 'resume' })}
          onCreateQuote={() => setScreen({ kind: 'draft', mode: 'new' })}
          onOpenQuote={(quoteId) => setScreen({ kind: 'detail', quoteId })}
        />
      ) : screen.kind === 'draft' ? (
        <QuoteDraftScreen
          onBackToHome={() => setScreen({ kind: 'home' })}
          onSaved={() => setScreen({ kind: 'home' })}
          startFresh={screen.mode === 'new'}
        />
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
