/**
 * Root Navigator - Main app navigation
 * PRD Section 6.2 - Navigation Updates
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { TripListScreen, TripSettingsScreen } from '../../features/trips';
import { TimelineScreen } from '../../features/timeline';
import { ChatScreen } from '../../features/chat';
import { TripTabNavigator } from './TripTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="TripList" component={TripListScreen} />
        <Stack.Screen name="TripTabs" component={TripTabNavigator} />
        {/* Standalone screens for modals/deep navigation */}
        <Stack.Screen name="Timeline" component={TimelineScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="TripSettings" component={TripSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

