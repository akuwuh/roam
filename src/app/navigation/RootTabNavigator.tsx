/**
 * Root Tab Navigator - Global bottom tabs
 * HOME, TRIPS, EXPLORE, PROFILE
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TripListScreen } from '../../features/trips';

// Placeholder screens for tabs we haven't built yet
function ExploreScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>🌍</Text>
      <Text style={styles.placeholderTitle}>Explore</Text>
      <Text style={styles.placeholderText}>Discover destinations coming soon</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>👤</Text>
      <Text style={styles.placeholderTitle}>Profile</Text>
      <Text style={styles.placeholderText}>Your profile settings coming soon</Text>
    </View>
  );
}

export type RootTabsParamList = {
  Home: undefined;
  Trips: undefined;
  Explore: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabsParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Trips: '📋',
    Explore: '🌍',
    Profile: '👤',
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabIconEmoji, focused && styles.tabIconActive]}>
        {icons[name] ?? '•'}
      </Text>
    </View>
  );
}

export function RootTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Home"
        component={TripListScreen}
        options={{ tabBarLabel: 'HOME' }}
      />
      <Tab.Screen
        name="Trips"
        component={TripListScreen}
        options={{ tabBarLabel: 'TRIPS' }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ tabBarLabel: 'EXPLORE' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'PROFILE' }}
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
    paddingBottom: 24,
    height: 80,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

