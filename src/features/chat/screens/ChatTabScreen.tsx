/**
 * Chat Tab Screen - Wrapper for use in bottom tabs
 */

import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TripTabsParamList, RootStackParamList } from '../../../types';
import { ChatScreen } from './ChatScreen';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TripTabsParamList, 'Chat'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ChatTabScreen(props: Props) {
  // Pass through to ChatScreen with compatible props
  return <ChatScreen {...props as any} />;
}

