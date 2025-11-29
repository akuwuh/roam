/**
 * Quick Actions - Horizontal scroll of action chips
 * Pre-defined prompts for common trip assistant actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'optimize',
    icon: '📍',
    label: 'OPTIMIZE ROUTE',
    prompt: 'Can you suggest a more efficient route for my activities today to minimize travel time?',
  },
  {
    id: 'add-stop',
    icon: '+',
    label: 'ADD STOP',
    prompt: 'What nearby attractions or restaurants would you recommend I add to my itinerary?',
  },
  {
    id: 'add-time',
    icon: '🕐',
    label: 'ADD TIME',
    prompt: 'I need more time at my current location. Can you adjust my schedule to give me an extra hour here?',
  },
  {
    id: 'weather',
    icon: '☀️',
    label: 'WEATHER',
    prompt: 'Based on typical weather, what time of day should I visit outdoor attractions?',
  },
  {
    id: 'food',
    icon: '🍴',
    label: 'FIND FOOD',
    prompt: 'Where should I eat lunch near my activities today? Suggest some local restaurants.',
  },
];

interface Props {
  onAction: (prompt: string) => void;
}

export function QuickActions({ onAction }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.chip}
            onPress={() => onAction(action.prompt)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>{action.icon}</Text>
            <Text style={styles.chipLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 6,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.3,
  },
});

