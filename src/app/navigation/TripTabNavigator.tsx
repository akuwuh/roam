/**
 * Trip Tab Navigator - Bottom tabs for trip screens
 * Provides easy navigation between Timeline, Chat, and Settings
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, TripTabsParamList } from '../../types';
import { TimelineScreen } from '../../features/timeline';
import { ChatScreen } from '../../features/chat';
import { TripSettingsScreen } from '../../features/trips';

type Props = {
  route: RouteProp<RootStackParamList, 'TripTabs'>;
};

const Tab = createBottomTabNavigator<TripTabsParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Timeline: '📅',
    Chat: '🧠',
    Settings: '⚙️',
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabIconEmoji, focused && styles.tabIconActive]}>
        {icons[label] ?? '•'}
      </Text>
    </View>
  );
}

export function TripTabNavigator({ route }: Props) {
  const { tripId } = route.params;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        initialParams={{ tripId }}
        options={{ tabBarLabel: 'Itinerary' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        initialParams={{ tripId }}
        options={{ tabBarLabel: 'Trip Brain' }}
      />
      <Tab.Screen
        name="Settings"
        component={TripSettingsScreen}
        initialParams={{ tripId }}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    height: 88,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconEmoji: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
});

