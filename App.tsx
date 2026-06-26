import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from '@/navigation/AppNavigator';
import { seedDebugApiConfigIfAvailable } from '@/services/debugApiSeedService';
import {
  getDebugReaderSeedPageIdIfAvailable,
  seedDebugReaderContentIfAvailable,
} from '@/services/debugContentSeedService';

export default function App() {
  const [isSeedReady, setIsSeedReady] = useState(false);
  const [initialReaderPageId, setInitialReaderPageId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      seedDebugApiConfigIfAvailable(),
      seedDebugReaderContentIfAvailable(),
    ])
      .then(() => getDebugReaderSeedPageIdIfAvailable())
      .then(setInitialReaderPageId)
      .catch((error) => {
        console.warn(
          'Debug seed failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      })
      .finally(() => setIsSeedReady(true));
  }, []);

  if (!isSeedReady) return null;

  return (
    <>
      <AppNavigator initialReaderPageId={initialReaderPageId} />
      <StatusBar style="auto" />
    </>
  );
}
