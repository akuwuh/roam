/**
 * Roam - Local-first AI Trip Planner
 * Main App Entry Point
 */

import React, { useState } from 'react';
import { ServiceProvider, NetworkProvider } from './src/app/providers';
import { RootNavigator } from './src/app/navigation';
import { SplashScreen } from './src/features/splash/screens/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <NetworkProvider>
      <ServiceProvider>
        <RootNavigator />
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      </ServiceProvider>
    </NetworkProvider>
  );
}
