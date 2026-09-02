/**
 * AUTOVERSE — Expo entry
 *
 * Temporary root focused on AV Drive pilot testing.
 * Replace / extend when full marketplace tabs (Search, Sell, Messages, Dealer) are mounted.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native';
import { colors } from './constants/theme';
import AvDriveNavigator from './navigation/AvDriveNavigator';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" />
      <AvDriveNavigator
        onOpenConversation={(conversationId) => {
          // TODO: navigate to ChatScreen with conversationId
          console.log('Open chat', conversationId);
        }}
      />
    </SafeAreaView>
  );
}
