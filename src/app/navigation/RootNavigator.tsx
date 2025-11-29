/**
 * Root Navigator - Main app navigation
 * Stack navigator wrapping global tabs + trip-specific screens
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { RootTabNavigator } from './RootTabNavigator';
import { TripDetailScreen, TripSettingsScreen } from '../../features/trips';
import { ChatScreen } from '../../features/chat';

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
        <Stack.Screen name="MainTabs" component={RootTabNavigator} />
        <Stack.Screen name="TripDetail" component={TripDetailScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="TripSettings" component={TripSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
