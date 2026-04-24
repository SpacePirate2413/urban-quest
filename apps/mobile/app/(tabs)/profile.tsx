import { useAuthStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const { user, isLoading, isAuthenticated, logout } = useAuthStore();

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
    { icon: '🎨', label: 'Edit Profile', subtitle: 'Avatar & username', route: '/profile/edit' },
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
      </View>

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

      <Text style={[Typography.caption, { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.lg }]}>
        Urban Quest v1.0.0
      </Text>
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
});
