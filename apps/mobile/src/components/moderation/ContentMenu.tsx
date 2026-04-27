import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '@/src/services/api';
import { Colors, Spacing, Typography } from '@/src/theme/theme';
import { ReportSheet, ReportEntityType } from './ReportSheet';

interface Props {
  /** Entity for the "Report" action. */
  entityType: ReportEntityType;
  entityId: string;
  entityLabel?: string;
  /** Author of the entity, for the "Block creator" action. Omit if not applicable (e.g. self). */
  authorId?: string;
  authorName?: string;
  /** Called after a successful block so the host screen can navigate away or re-fetch. */
  onBlocked?: () => void;
}

export function ContentMenu({ entityType, entityId, entityLabel, authorId, authorName, onBlocked }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleReport = () => {
    setMenuOpen(false);
    setTimeout(() => setReportOpen(true), 150); // let menu fade out first
  };

  const handleBlock = () => {
    if (!authorId) return;
    setMenuOpen(false);
    Alert.alert(
      `Block ${authorName ?? 'this creator'}?`,
      'You will no longer see content from this creator. They will not be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.blockUser(authorId);
              onBlocked?.();
              Alert.alert('Blocked', `${authorName ?? 'This creator'} has been blocked.`);
            } catch (err: any) {
              Alert.alert('Could not block', err?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setMenuOpen(true)}
        accessibilityLabel="More options"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.triggerIcon}>⋯</Text>
      </TouchableOpacity>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
              <Text style={styles.menuIcon}>🚩</Text>
              <Text style={[Typography.body, styles.menuLabel]}>Report content</Text>
            </TouchableOpacity>
            {authorId ? (
              <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
                <Text style={styles.menuIcon}>🚫</Text>
                <Text style={[Typography.body, styles.menuLabel]}>
                  Block {authorName ? `@${authorName}` : 'creator'}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.menuItem, styles.menuItemCancel]} onPress={() => setMenuOpen(false)}>
              <Text style={[Typography.body, { color: Colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        entityType={entityType}
        entityId={entityId}
        entityLabel={entityLabel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  triggerIcon: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: -4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 44,
  },
  menuItemCancel: {
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabel: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
