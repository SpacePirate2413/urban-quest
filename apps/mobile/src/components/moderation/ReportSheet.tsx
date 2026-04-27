import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '@/src/services/api';
import { Colors, Spacing, Typography } from '@/src/theme/theme';

export type ReportEntityType = 'quest' | 'scene' | 'review' | 'user';
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'sexual_minors'
  | 'hate'
  | 'violence'
  | 'illegal'
  | 'ip'
  | 'scam'
  | 'impersonation'
  | 'other';

interface Props {
  visible: boolean;
  onClose: () => void;
  entityType: ReportEntityType;
  entityId: string;
  /** Short label of what's being reported (shown in the header). */
  entityLabel?: string;
  onSubmitted?: () => void;
}

const REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'sexual_minors', label: 'Sexual content involving a minor', description: 'Reported immediately to law enforcement.' },
  { value: 'harassment', label: 'Harassment or bullying', description: 'Targeted abuse, threats, or doxxing.' },
  { value: 'hate', label: 'Hate speech', description: 'Promoting violence or hatred against a group.' },
  { value: 'violence', label: 'Violence or gore', description: 'Graphic violence not contextually appropriate.' },
  { value: 'illegal', label: 'Illegal activity', description: 'Drugs, weapons, fraud, dangerous directives.' },
  { value: 'ip', label: 'Intellectual property infringement', description: 'Stolen text, images, audio, or video.' },
  { value: 'spam', label: 'Spam or scam', description: 'Repetitive, deceptive, or phishing content.' },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else.' },
  { value: 'other', label: 'Something else', description: 'Tell us more in the details below.' },
];

export function ReportSheet({
  visible,
  onClose,
  entityType,
  entityId,
  entityLabel,
  onSubmitted,
}: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setReason(null);
    setDetails('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Choose a reason', 'Please select what is wrong with this content.');
      return;
    }
    setSubmitting(true);
    try {
      await api.reportContent({
        entityType,
        entityId,
        reason,
        details: details.trim() ? details.trim() : undefined,
      });
      setReason(null);
      setDetails('');
      onSubmitted?.();
      onClose();
      Alert.alert(
        'Report received',
        'Thanks for letting us know. Our moderation team reviews reports within 24 hours.',
      );
    } catch (err: any) {
      Alert.alert('Could not submit report', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={[Typography.headerMedium, styles.title]}>Report content</Text>
          {entityLabel ? (
            <Text style={[Typography.caption, styles.subtitle]} numberOfLines={2}>
              {entityLabel}
            </Text>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: Spacing.lg }}>
            {REASONS.map((r) => {
              const selected = reason === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reason, selected && styles.reasonSelected]}
                  onPress={() => setReason(r.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.body, selected && { color: Colors.textPrimary }]}>{r.label}</Text>
                    <Text style={[Typography.caption, styles.reasonDescription]}>{r.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={[Typography.caption, styles.detailsLabel]}>Additional details (optional)</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Anything else our team should know"
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={1000}
              value={details}
              onChangeText={setDetails}
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSubmit, (!reason || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!reason || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnSubmitText}>Submit report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.hotPink,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  list: {
    marginTop: Spacing.sm,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    minHeight: 44,
  },
  reasonSelected: {
    // Subtle highlight; primary visual is the radio mark.
  },
  reasonDescription: {
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: Colors.accentYellow,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accentYellow,
  },
  detailsLabel: {
    color: Colors.cyan,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  detailsInput: {
    backgroundColor: Colors.primaryBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  btn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: Colors.primaryBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  btnCancelText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  btnSubmit: {
    backgroundColor: Colors.hotPink,
  },
  btnSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
