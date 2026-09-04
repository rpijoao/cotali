import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { HomeScreen } from './src/features/home/HomeScreen';
import { QuoteDraftScreen } from './src/features/quotes/QuoteDraftScreen';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'new' | 'resume'>('home');

  return (
    <>
      {screen === 'home' ? (
        <HomeScreen
          onContinueDraft={() => setScreen('resume')}
          onCreateQuote={() => setScreen('new')}
        />
      ) : (
        <QuoteDraftScreen
          onBackToHome={() => setScreen('home')}
          onSaved={() => setScreen('home')}
          startFresh={screen === 'new'}
        />
      )}
      <StatusBar style="dark" />
    </>
  );
}
