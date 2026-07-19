/**
 * AUTOVERSE — Chat Screen
 *
 * Individual conversation thread. The listing context header (photo,
 * title, price) is pinned above the messages so neither party ever
 * loses track of which vehicle a conversation is about — critical once
 * a buyer or dealer has several concurrent threads open.
 *
 * REALTIME: live updates come from a Supabase Realtime subscription on
 * `messages`, filtered to this conversation. This works because RLS on
 * `messages` (see db/supabase_migration.sql) restricts what any given
 * connection can see to conversations that user actually participates
 * in — Realtime respects RLS, so the filter here is a performance
 * narrowing, not the security boundary; the security boundary is the
 * RLS policy itself.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import MessageBubble from '../components/MessageBubble';
import { supabase } from '../lib/supabaseClient';
import {
  fetchConversation,
  fetchMessages,
  sendChatMessage,
  markConversationRead,
} from '../services/messagingApi';
import { ConversationDetail, Message } from '../types/messaging.types';
import { dayLabel } from '../utils/formatTime';

interface Props {
  conversationId: string;
  currentUserId: string;
  onOpenListing?: (vehicleId: string) => void;
  onBack?: () => void;
}

function formatNGN(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

function mapRealtimeRow(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

type ListRow = { type: 'date'; label: string } | { type: 'message'; message: Message };

function buildRows(messages: Message[]): ListRow[] {
  const rows: ListRow[] = [];
  let lastLabel: string | null = null;
  for (const message of messages) {
    const label = dayLabel(message.createdAt);
    if (label !== lastLabel) {
      rows.push({ type: 'date', label });
      lastLabel = label;
    }
    rows.push({ type: 'message', message });
  }
  return rows;
}

export default function ChatScreen({ conversationId, currentUserId, onOpenListing, onBack }: Props) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [conversationDetail, messageHistory] = await Promise.all([
        fetchConversation(conversationId),
        fetchMessages(conversationId),
      ]);
      setConversation(conversationDetail);
      setMessages(messageHistory);
      await markConversationRead(conversationId);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates via Supabase Realtime — replaces the earlier polling
  // placeholder. One channel per conversation, torn down on unmount or
  // when the user navigates to a different thread.
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = mapRealtimeRow(payload.new);
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          // If the message arrived from the other participant while the
          // thread is open, mark it read immediately rather than
          // waiting for the next screen focus.
          if (incoming.senderId !== currentUserId) {
            markConversationRead(conversationId).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    setSending(true);
    try {
      const message = await sendChatMessage(conversationId, body);
      setMessages((prev) => [...prev, message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      setDraft(body); // restore draft so the user doesn't lose their message
    } finally {
      setSending(false);
    }
  }, [conversationId, draft]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (error || !conversation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const rows = buildRows(messages);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Listing context header */}
      <Pressable style={styles.header} onPress={() => onOpenListing?.(conversation.vehicle.vehicleId)}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
        )}
        <View style={styles.headerThumbWrap}>
          {conversation.vehicle.primaryImageUrl ? (
            <Image source={{ uri: conversation.vehicle.primaryImageUrl }} style={styles.headerThumb} />
          ) : (
            <View style={styles.headerThumbPlaceholder}>
              <Text style={styles.headerThumbPlaceholderText}>AV</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerVehicleTitle} numberOfLines={1}>{conversation.vehicle.title}</Text>
          <Text style={styles.headerPrice}>{formatNGN(conversation.vehicle.priceNGN)}</Text>
        </View>
        <View style={styles.headerParticipant}>
          <Text style={styles.headerParticipantName} numberOfLines={1}>
            {conversation.otherParticipant.name}
          </Text>
          <Text style={styles.headerParticipantRole}>
            {conversation.otherParticipant.role === 'buyer' ? 'Buyer' : 'Seller'}
          </Text>
        </View>
      </Pressable>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row, i) => (row.type === 'date' ? `date-${row.label}-${i}` : row.message.id)}
        contentContainerStyle={styles.messagesContent}
        renderItem={({ item }) =>
          item.type === 'date' ? (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>{item.label}</Text>
            </View>
          ) : (
            <MessageBubble message={item.message} isMine={item.message.senderId === currentUserId} />
          )
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          disabled={!draft.trim() || sending}
          onPress={handleSend}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { ...typography.body, color: colors.critical, textAlign: 'center', marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryButtonText: { color: colors.background, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: { marginRight: spacing.sm },
  backButtonText: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  headerThumbWrap: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden', marginRight: spacing.sm },
  headerThumb: { width: '100%', height: '100%' },
  headerThumbPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  headerThumbPlaceholderText: { color: colors.goldMuted, fontWeight: '800', fontSize: 10 },
  headerVehicleTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  headerPrice: { ...typography.caption, color: colors.gold, marginTop: 1 },
  headerParticipant: { alignItems: 'flex-end', marginLeft: spacing.sm, maxWidth: 100 },
  headerParticipantName: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  headerParticipantRole: { fontSize: 10, color: colors.textSecondary },

  messagesContent: { paddingVertical: spacing.md },
  dateSeparator: { alignItems: 'center', marginVertical: spacing.sm },
  dateSeparatorText: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.gold,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButtonDisabled: { backgroundColor: colors.goldMuted, opacity: 0.5 },
  sendButtonText: { color: colors.background, fontWeight: '700' },
});
