/**
 * Timeline Tab Screen - Wrapper for use in bottom tabs
 */

import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TripTabsParamList, RootStackParamList } from '../../../types';
import { TimelineScreen } from './TimelineScreen';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TripTabsParamList, 'Timeline'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function TimelineTabScreen(props: Props) {
  // Pass through to TimelineScreen with compatible props
  return <TimelineScreen {...props as any} />;
}

