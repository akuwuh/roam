/**
 * Roam - Local-first AI Trip Planner
 * Main App Entry Point
 */

import React from 'react';
import { ServiceProvider, NetworkProvider } from './src/app/providers';
import { RootNavigator } from './src/app/navigation';

export default function App() {
  return (
    <NetworkProvider>
      <ServiceProvider>
        <RootNavigator />
      </ServiceProvider>
    </NetworkProvider>
  );
}
