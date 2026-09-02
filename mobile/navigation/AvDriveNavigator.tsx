/**
 * AV Drive — lightweight stack (no react-navigation dependency).
 * Matches the callback-prop style used by existing Autoverse screens.
 *
 * Mount this from your root app / tab when the user opens AV Drive:
 *   <AvDriveNavigator onOpenConversation={(id) => nav to Chat} />
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { getCurrentUserId } from '../services/authStorage';
import AvDriveHomeScreen from '../screens/avDrive/AvDriveHomeScreen';
import AvDriveBookScreen from '../screens/avDrive/AvDriveBookScreen';
import AvDriveAvailabilityScreen from '../screens/avDrive/AvDriveAvailabilityScreen';
import AvDriveJobsScreen from '../screens/avDrive/AvDriveJobsScreen';
import AvDriveJobDetailScreen from '../screens/avDrive/AvDriveJobDetailScreen';

export type AvDriveRoute =
  | { name: 'Home' }
  | { name: 'Book' }
  | { name: 'Availability' }
  | { name: 'Jobs' }
  | { name: 'JobDetail'; jobId: string };

interface Props {
  /** Optional override; otherwise loaded from Supabase session */
  currentUserId?: string | null;
  /** Wire to your existing Chat screen */
  onOpenConversation?: (conversationId: string) => void;
  /** Leave AV Drive (e.g. close modal / pop parent stack) */
  onExit?: () => void;
}

export default function AvDriveNavigator({
  currentUserId: currentUserIdProp,
  onOpenConversation,
  onExit,
}: Props) {
  const [route, setRoute] = useState<AvDriveRoute>({ name: 'Home' });
  const [userId, setUserId] = useState<string | null>(currentUserIdProp ?? null);
  const [booting, setBooting] = useState(currentUserIdProp == null);

  useEffect(() => {
    if (currentUserIdProp != null) {
      setUserId(currentUserIdProp);
      setBooting(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const id = await getCurrentUserId();
      if (!cancelled) {
        setUserId(id);
        setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserIdProp]);

  if (booting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  switch (route.name) {
    case 'Book':
      return (
        <AvDriveBookScreen
          onBooked={(jobId) => setRoute({ name: 'JobDetail', jobId })}
        />
      );
    case 'Availability':
      return (
        <AvDriveAvailabilityScreen onDone={() => setRoute({ name: 'Home' })} />
      );
    case 'Jobs':
      return (
        <AvDriveJobsScreen
          onOpenJob={(jobId) => setRoute({ name: 'JobDetail', jobId })}
        />
      );
    case 'JobDetail':
      return (
        <AvDriveJobDetailScreen
          jobId={route.jobId}
          currentUserId={userId || ''}
          onOpenConversation={onOpenConversation}
          onBack={() => setRoute({ name: 'Home' })}
        />
      );
    case 'Home':
    default:
      return (
        <AvDriveHomeScreen
          onBook={() => setRoute({ name: 'Book' })}
          onEarnSetup={() => setRoute({ name: 'Availability' })}
          onOpenJobs={() => setRoute({ name: 'Jobs' })}
          onOpenJob={(jobId) => setRoute({ name: 'JobDetail', jobId })}
        />
      );
  }
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
