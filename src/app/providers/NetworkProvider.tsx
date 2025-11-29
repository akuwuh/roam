/**
 * Network Status Provider - Track online/offline state
 * PRD - Offline capability tracking
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { NetworkStatus } from '../../types';

interface NetworkContextValue {
  status: NetworkStatus;
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({
  status: 'unknown',
  isOnline: false,
});

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}

interface NetworkProviderProps {
  children: React.ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [status, setStatus] = useState<NetworkStatus>('unknown');

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      const newStatus: NetworkStatus = state.isConnected ? 'online' : 'offline';
      setStatus(newStatus);
    });

    // Get initial state
    NetInfo.fetch().then((state) => {
      setStatus(state.isConnected ? 'online' : 'offline');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value: NetworkContextValue = {
    status,
    isOnline: status === 'online',
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

