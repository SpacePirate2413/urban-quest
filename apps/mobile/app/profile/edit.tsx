import { useAuthStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Mirror the genre list in apps/creator-station/src/store/useWriterStore.js so
// creators see the same options on web and mobile. Keeping this duplicated
// avoids a cross-app dependency at the cost of needing to update both lists
// when we add a new genre.
const GENRES = [
  'Thriller',
  'Mystery',
  'Adventure',
  'Horror',
  'Romance',
  'Comedy',
  'Sci-Fi',
  'Fantasy',
];

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.username ?? '');
    setBio(user.bio ?? '');
    setSelectedGenres(
      (user.genres ?? '')
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
    );
  }, [user]);

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        genres: selectedGenres.join(', '),
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Please try again.');
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={[AppStyles.container, styles.centered]}>
        <Text style={[Typography.body, { color: Colors.textSecondary }]}>Not signed in.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={AppStyles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={Typography.headerLarge}>Edit Profile</Text>
        </View>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your creator name"
          placeholderTextColor={Colors.textSecondary}
          style={styles.input}
          maxLength={50}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell players about yourself as a quest creator..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={5}
          maxLength={500}
          style={[styles.input, styles.bioInput]}
        />
        <Text style={styles.charCount}>{bio.length} / 500</Text>

        <Text style={styles.label}>Genres</Text>
        <Text style={[Typography.caption, { color: Colors.textSecondary, marginBottom: Spacing.sm }]}>
          Pick the styles you write in.
        </Text>
        <View style={styles.genreRow}>
          {GENRES.map((g) => {
            const selected = selectedGenres.includes(g);
            return (
              <TouchableOpacity
                key={g}
                onPress={() => toggleGenre(g)}
                style={[styles.genreChip, selected && styles.genreChipSelected]}
                activeOpacity={0.7}
              >
                <Text style={[styles.genreChipText, selected && styles.genreChipTextSelected]}>
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.primaryBackground} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} disabled={isSaving}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 60,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  backBtnText: {
    color: Colors.textPrimary,
    fontSize: 28,
    lineHeight: 30,
  },
  label: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  bioInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genreChipSelected: {
    borderColor: Colors.cyan,
    backgroundColor: Colors.cyan + '20',
  },
  genreChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  genreChipTextSelected: {
    color: Colors.cyan,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.cyan,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: Colors.primaryBackground,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cancelBtn: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
