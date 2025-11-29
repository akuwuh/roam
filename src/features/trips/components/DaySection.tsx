/**
 * Day Section - Collapsible day with activities
 * Shows day header with items or "EMPTY" placeholder
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { TimelineDay } from '../../timeline/hooks/useTimeline';
import { formatTime } from '../../../domain/services';

interface Props {
  day: TimelineDay;
  onAddActivity: () => void;
  onDeleteItem: (itemId: string) => void;
}

export function DaySection({ day, onAddActivity, onDeleteItem }: Props) {
  const hasItems = day.items.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dayTitle}>DAY {day.dayPlan.dayNumber}</Text>
      </View>

      <View style={styles.content}>
        {hasItems ? (
          day.items.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.activityItem}
              onLongPress={() => onDeleteItem(item.id)}
            >
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>
                  {formatTime(item.startDateTime)}
                </Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityType}>{item.type}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyText}>EMPTY</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={onAddActivity}>
          <Text style={styles.addButtonText}>+ Add Activity</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  header: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  content: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  emptyContent: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CCCCCC',
    letterSpacing: 1,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timeColumn: {
    width: 50,
    marginRight: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 12,
    color: '#999999',
    textTransform: 'capitalize',
  },
  addButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
});

