import { useSubscription } from '@/src/hooks/useSubscription';
import { api } from '@/src/services/api';
import { useAuthStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface AuthoredQuest {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  status?: string;
  coverImage?: string;
  price?: number;
}

export default function ProfileScreen() {
  const { user, isLoading, isAuthenticated, logout, deleteAccount, refreshProfile } =
    useAuthStore();
  const { isPremium } = useSubscription();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [authoredQuests, setAuthoredQuests] = useState<AuthoredQuest[]>([]);

  // Re-pull /users/me + the authored-quests list every time the Profile tab
  // gains focus. This keeps mobile in sync with edits made in the
  // creator-station web app between sessions, without forcing a sign-out /
  // sign-in cycle.
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      let cancelled = false;
      api
        .getMyAuthoredQuests()
        .then((data: any) => {
          if (cancelled) return;
          const list = Array.isArray(data) ? data : data?.quests ?? [];
          setAuthoredQuests(list);
        })
        .catch(() => {
          if (!cancelled) setAuthoredQuests([]);
        });
      return () => {
        cancelled = true;
      };
    }, [refreshProfile]),
  );

  const publishedQuests = authoredQuests.filter((q) => q.status === 'published');
  const genres = (user?.genres ?? '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setDeleteModalVisible(false);
      router.replace('/(auth)/login');
    } catch (err: any) {
      setIsDeleting(false);
      Alert.alert('Could not delete account', err?.message ?? 'Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <View style={[AppStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.cyan} />
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <View style={[AppStyles.container, styles.centered]}>
        <Text style={{ fontSize: 40 }}>👤</Text>
        <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>Not Logged In</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
          Please log in to view your profile.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const menuItems = [
    { icon: '🎮', label: 'My Quests', subtitle: 'Purchased & in-progress', route: '/profile/quests' },
    { icon: '✅', label: 'Completed', subtitle: `${user.completedQuestsCount ?? 0} quests finished`, route: '/profile/completed' },
    { icon: '⭐', label: 'My Reviews', subtitle: `${user.reviewsWritten?.length ?? 0} reviews written`, route: '/profile/reviews' },
    { icon: '💳', label: 'Payment Methods', subtitle: 'Manage cards & wallets', route: '/profile/payments' },
    { icon: '🔔', label: 'Notifications', subtitle: 'Alerts & quiet hours', route: '/profile/notifications' },
    { icon: '📍', label: 'Location Settings', subtitle: 'Permissions & tracking', route: '/profile/location' },
    { icon: '🎨', label: 'Edit Profile', subtitle: 'Name, bio, genres', route: '/profile/edit' },
  ];

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={{ fontSize: 40 }}>👤</Text>
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Text style={styles.editAvatarIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
        <Text style={[Typography.headerLarge, { color: Colors.cyan }]}>{user.username}</Text>
        <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
          Member since {memberSince}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.completedQuestsCount ?? 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.reviewsWritten?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{authoredQuests.length}</Text>
          <Text style={styles.statLabel}>Quests</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{publishedQuests.length}</Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>About</Text>
        <Text
          style={[
            Typography.body,
            { color: user.bio ? Colors.textPrimary : Colors.textSecondary, lineHeight: 20 },
          ]}
        >
          {user.bio || 'No bio yet. Tap "Edit Profile" below to add one.'}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Genres</Text>
        {genres.length > 0 ? (
          <View style={styles.genreRow}>
            {genres.map((g) => (
              <View key={g} style={styles.genreChip}>
                <Text style={styles.genreChipText}>{g}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>
            No genres selected.
          </Text>
        )}
      </View>

      {authoredQuests.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>My Quests</Text>
          {authoredQuests.map((q) => (
            <TouchableOpacity
              key={q.id}
              style={styles.questRow}
              onPress={() => router.push(`/quest/${q.id}` as any)}
              activeOpacity={0.7}
            >
              {q.coverImage ? (
                <Image source={{ uri: q.coverImage }} style={styles.questCover} />
              ) : (
                <View style={[styles.questCover, styles.questCoverPlaceholder]}>
                  <Text style={{ fontSize: 22 }}>🗺️</Text>
                </View>
              )}
              <View style={styles.questMeta}>
                <Text style={[Typography.body, { fontWeight: '600' }]} numberOfLines={1}>
                  {q.title}
                </Text>
                <Text
                  style={[Typography.caption, { color: Colors.textSecondary, marginTop: 2 }]}
                  numberOfLines={1}
                >
                  {q.description || 'No description'}
                </Text>
                <View style={styles.questTagsRow}>
                  <View
                    style={[
                      styles.questStatusBadge,
                      q.status === 'published'
                        ? styles.questStatusPublished
                        : styles.questStatusDraft,
                    ]}
                  >
                    <Text style={styles.questStatusText}>{q.status ?? 'draft'}</Text>
                  </View>
                  {q.genre && (
                    <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                      {q.genre}
                    </Text>
                  )}
                  <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                    {q.price && q.price > 0 ? `$${q.price.toFixed(2)}` : 'Free'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.premiumCard, isPremium && styles.premiumCardActive]}
        onPress={() => router.push('/profile/premium')}
        accessibilityRole="button"
      >
        <Text style={styles.premiumIcon}>⭐</Text>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.body, styles.premiumTitle]}>
            {isPremium ? 'Premium active' : 'Go Premium'}
          </Text>
          <Text style={[Typography.caption, styles.premiumSubtitle]}>
            {isPremium ? 'Ads are off — manage in your device settings' : '$5.99/mo · removes ads'}
          </Text>
        </View>
        <Text style={styles.premiumArrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuText}>
              <Text style={Typography.body}>{item.label}</Text>
              <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                {item.subtitle}
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => setDeleteModalVisible(true)}
        accessibilityLabel="Delete account"
      >
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>

      <Text style={[Typography.caption, { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.lg }]}>
        Urban Quest v1.0.0
      </Text>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[Typography.headerMedium, styles.modalTitle]}>Delete your account?</Text>
            <Text style={[Typography.body, styles.modalBody]}>
              This will permanently delete your Urban Quest account.
            </Text>

            <Text style={[Typography.caption, styles.modalSectionLabel]}>What gets deleted</Text>
            <Text style={[Typography.caption, styles.modalBullet]}>
              • Your profile, sign-in link, and personal info
            </Text>
            <Text style={[Typography.caption, styles.modalBullet]}>
              • Your quest progress, completed quests, saved quests
            </Text>
            <Text style={[Typography.caption, styles.modalBullet]}>
              • Your reviews, ratings, and uploaded media
            </Text>
            <Text style={[Typography.caption, styles.modalBullet]}>
              • Quests you authored that are still in draft
            </Text>

            <Text style={[Typography.caption, styles.modalSectionLabel]}>What may be retained</Text>
            <Text style={[Typography.caption, styles.modalBullet]}>
              • Financial records (purchase history, refunds) for tax compliance — up to 7 years
            </Text>
            <Text style={[Typography.caption, styles.modalBullet]}>
              • Published quests you authored, with your name removed
            </Text>
            <Text style={[Typography.caption, styles.modalBullet]}>
              • Anonymized backups, fully purged within 30 days
            </Text>

            <Text style={[Typography.caption, styles.modalFooter]}>
              This action cannot be undone. Once deleted, your account cannot be restored.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, isDeleting && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.purple,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.surface,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  editAvatarIcon: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.cyan,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.cyan,
    backgroundColor: Colors.cyan + '15',
  },
  genreChipText: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '600',
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  questCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  questCoverPlaceholder: {
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questMeta: {
    flex: 1,
    minWidth: 0,
  },
  questTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  questStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  questStatusPublished: {
    backgroundColor: Colors.neonGreen + '20',
  },
  questStatusDraft: {
    backgroundColor: Colors.textSecondary + '20',
  },
  questStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accentYellow,
    gap: Spacing.md,
  },
  premiumCardActive: {
    borderColor: Colors.cyan,
    backgroundColor: Colors.accentYellow + '15',
  },
  premiumIcon: {
    fontSize: 28,
  },
  premiumTitle: {
    color: Colors.accentYellow,
    fontWeight: '700',
  },
  premiumSubtitle: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  premiumArrow: {
    color: Colors.accentYellow,
    fontSize: 24,
  },
  menuSection: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuArrow: {
    fontSize: 24,
    color: Colors.cyan,
  },
  logoutButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.hotPink,
    alignItems: 'center',
  },
  logoutText: {
    color: Colors.hotPink,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deleteButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  loginButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.cyan,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  loginButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.hotPink,
    marginBottom: Spacing.sm,
  },
  modalBody: {
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalSectionLabel: {
    color: Colors.cyan,
    marginTop: Spacing.sm,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  modalBullet: {
    color: Colors.textSecondary,
    marginBottom: 2,
    lineHeight: 16,
  },
  modalFooter: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.primaryBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  modalBtnCancelText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  modalBtnConfirm: {
    backgroundColor: Colors.hotPink,
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
