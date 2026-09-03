import { StatusBar } from 'expo-status-bar';
import { QuoteDraftScreen } from './src/features/quotes/QuoteDraftScreen';

export default function App() {
  return (
    <>
      <QuoteDraftScreen />
      <StatusBar style="dark" />
    </>
  );
}
