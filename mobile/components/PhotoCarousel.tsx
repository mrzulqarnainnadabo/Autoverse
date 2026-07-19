import React, { useState, useCallback } from 'react';
import { View, Image, StyleSheet, FlatList, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, Text } from 'react-native';
import { colors, spacing } from '../constants/theme';

interface Props {
  photos: { url: string }[];
}

export default function PhotoCarousel({ photos }: Props) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      setActiveIndex(index);
    },
    [width]
  );

  if (photos.length === 0) {
    return (
      <View style={[styles.placeholder, { width, height: width * 0.7 }]}>
        <Text style={styles.placeholderText}>AV</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, i) => `${item.url}-${i}`}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image source={{ uri: item.url }} style={{ width, height: width * 0.7 }} resizeMode="cover" />
        )}
      />
      <View style={styles.dotsRow}>
        {photos.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>{activeIndex + 1} / {photos.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.goldMuted, fontWeight: '800', fontSize: 32, letterSpacing: 3 },
  dotsRow: {
    position: 'absolute', bottom: spacing.sm, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: colors.gold, width: 16 },
  counterBadge: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    backgroundColor: 'rgba(10,10,10,0.7)', borderRadius: 12,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  counterText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
});
