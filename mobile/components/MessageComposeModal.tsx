/**
 * AUTOVERSE — MessageComposeModal
 *
 * The buyer's entry point into a conversation about a specific
 * listing. Submitting here creates an `inquiry` row scoped to
 * (vehicleId, dealerId, buyerId) — the same record already rendered
 * on the Dealer Dashboard's Recent Inquiries feed, so there is exactly
 * one thread identity between buyer and dealer from first contact.
 *
 * This is intentionally a single-message "first contact" form, not a
 * full chat UI — threaded real-time messaging (read receipts, typing
 * indicators, push) is the next vertical slice; this modal is the
 * seed that thread will be built on.
 */

import React, { useState, useCallback } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { sendInquiry } from '../services/buyerApi';

interface Props {
  visible: boolean;
  vehicleId: string;
  vehicleLabel: string;
  onClose: () => void;
  onSent?: (conversationId: string) => void;
}

export default function MessageComposeModal({ visible, vehicleId, vehicleLabel, onClose, onSent }: Props) {
  const [message, setMessage] = useState(`Hi, is the ${vehicleLabel} still available?`);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !buyerName.trim() || !buyerPhone.trim()) {
      Alert.alert('Missing info', 'Please add your name, phone number, and a message.');
      return;
    }
    setSending(true);
    try {
      const result = await sendInquiry(vehicleId, { message: message.trim(), buyerName: buyerName.trim(), buyerPhone: buyerPhone.trim() });
      onSent?.(result.conversationId);
      onClose();
    } catch (err: any) {
      Alert.alert('Could not send message', err.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  }, [vehicleId, message, buyerName, buyerPhone, onClose, onSent]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Message about this vehicle</Text>
          <Text style={styles.subtitle}>{vehicleLabel}</Text>

          <Text style={styles.fieldLabel}>Your name</Text>
          <TextInput
            style={styles.input}
            value={buyerName}
            onChangeText={setBuyerName}
            placeholder="Full name"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.fieldLabel}>Phone number</Text>
          <TextInput
            style={styles.input}
            value={buyerPhone}
            onChangeText={setBuyerPhone}
            placeholder="080..."
            keyboardType="phone-pad"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.textSecondary}
          />

          <View style={styles.actionRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.sendButton} disabled={sending} onPress={handleSend}>
              {sending ? <ActivityIndicator color={colors.background} /> : <Text style={styles.sendButtonText}>Send</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.gold, marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  cancelButtonText: { color: colors.textSecondary, fontWeight: '600' },
  sendButton: { flex: 1, backgroundColor: colors.gold, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  sendButtonText: { color: colors.background, fontWeight: '700' },
});
