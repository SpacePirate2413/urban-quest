import { api } from '@/src/services/api';
import { useLocationStore, useWriteStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { ScoutedWaypoint } from '@/src/types';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Media capture (photo / video / audio) was removed from this screen on
// 2026-04-29 — see tracker entry F3. The Prisma columns + the
// /scouted-waypoints/:id/upload endpoint are intentionally left in place so
// the feature can be re-enabled without a schema migration.

function WaypointCard({ waypoint, onPress }: { waypoint: ScoutedWaypoint; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.waypointCard} onPress={onPress}>
      <View style={[styles.waypointImage, styles.noImage]}>
        <Text style={{ fontSize: 24 }}>📍</Text>
      </View>
      <View style={styles.waypointInfo}>
        <Text style={Typography.headerMedium}>{waypoint.name}</Text>
        {waypoint.notes && (
          <Text style={[Typography.caption, { color: Colors.textSecondary }]} numberOfLines={2}>
            {waypoint.notes}
          </Text>
        )}
        <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
          {new Date(waypoint.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AddWaypointModal({ visible, onClose, onSave, currentLocation }: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, notes: string) => void;
  currentLocation: { latitude: number; longitude: number } | null;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  if (!visible) return null;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for this waypoint');
      return;
    }
    onSave(name, notes);
    setName('');
    setNotes('');
  };

  const handleClose = () => {
    setName('');
    setNotes('');
    onClose();
  };

  const lat = currentLocation?.latitude ?? 0;
  const lng = currentLocation?.longitude ?? 0;

  return (
    <View style={styles.modalOverlay}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.lg }}>
        <View style={styles.modalContent}>
          <Text style={Typography.headerMedium}>New Waypoint</Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
            Save this location for your stories
          </Text>

          <View style={styles.locationPreview}>
            <Text style={{ fontSize: 30 }}>📍</Text>
            <View style={styles.locationInfo}>
              <Text style={Typography.body}>Current Location</Text>
              <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                {currentLocation
                  ? `${lat.toFixed(4)}° N, ${Math.abs(lng).toFixed(4)}° W`
                  : 'Location unavailable'}
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Waypoint name"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notes (optional)"
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Waypoint</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function WriteScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoadingWaypoints, setIsLoadingWaypoints] = useState(true);
  const { scoutedWaypoints, addScoutedWaypoint } = useWriteStore();
  const { currentLocation } = useLocationStore();

  useEffect(() => {
    setIsLoadingWaypoints(true);
    api.getMyScoutedWaypoints()
      .then((data: any[]) => {
        const waypoints: ScoutedWaypoint[] = data.map((wp: any) => ({
          id: wp.id,
          userId: wp.userId,
          name: wp.name,
          notes: wp.notes,
          location: { latitude: wp.lat ?? 0, longitude: wp.lng ?? 0 },
          photos: wp.photos || [],
          videos: wp.videos || [],
          audioRecordings: wp.audioRecordings || [],
          createdAt: new Date(wp.createdAt),
        }));
        // Replace local state with API data
        useWriteStore.setState({ scoutedWaypoints: waypoints });
      })
      .catch(() => {
        // Keep whatever local state we have
      })
      .finally(() => setIsLoadingWaypoints(false));
  }, []);

  const handleSaveWaypoint = async (name: string, notes: string) => {
    const lat = currentLocation?.latitude ?? 0;
    const lng = currentLocation?.longitude ?? 0;

    try {
      const result = await api.addScoutedWaypoint({ name, notes, lat, lng });
      const newWaypoint: ScoutedWaypoint = {
        id: result.id || `sw_${Date.now()}`,
        userId: result.userId || '',
        name,
        notes,
        location: { latitude: lat, longitude: lng },
        // Media columns kept on the model for forward compatibility (see
        // tracker entry F3); always empty as far as this screen knows.
        photos: [],
        videos: [],
        audioRecordings: [],
        createdAt: new Date(),
      };
      addScoutedWaypoint(newWaypoint);
      setShowAddModal(false);
      Alert.alert('Saved!', 'Waypoint saved.');
    } catch {
      const newWaypoint: ScoutedWaypoint = {
        id: `sw_${Date.now()}`,
        userId: '',
        name,
        notes,
        location: { latitude: lat, longitude: lng },
        photos: [],
        videos: [],
        audioRecordings: [],
        createdAt: new Date(),
      };
      addScoutedWaypoint(newWaypoint);
      setShowAddModal(false);
      Alert.alert('Saved Locally', 'Waypoint saved locally. It will sync when connected.');
    }
  };

  const handleDeleteWaypoint = (waypoint: ScoutedWaypoint) => {
    Alert.alert(
      'Delete Waypoint',
      `Delete "${waypoint.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteScoutedWaypoint(waypoint.id);
            } catch {
              // Continue with local delete even if API fails
            }
            useWriteStore.getState().deleteScoutedWaypoint(waypoint.id);
          },
        },
      ]
    );
  };

  return (
    <View style={AppStyles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: Colors.neonGreen, letterSpacing: 1 }}>SCOUT</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: Colors.cyan, letterSpacing: 1 }}>MODE</Text>
        </View>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
          Save locations for your stories
        </Text>
      </View>

      <View style={styles.mapSection}>
        <View style={styles.mapPlaceholder}>
          <Text style={{ fontSize: 40 }}>🗺️</Text>
          <Text style={[Typography.body, { marginTop: Spacing.md }]}>Your Location</Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            {currentLocation
              ? `${currentLocation.latitude.toFixed(4)}° N, ${Math.abs(currentLocation.longitude).toFixed(4)}° W`
              : 'Location not available'}
          </Text>
        </View>
        <TouchableOpacity style={styles.dropPinButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.dropPinIcon}>📍</Text>
          <Text style={styles.dropPinText}>Drop Pin Here</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.savedSection}>
        <Text style={[Typography.headerMedium, { marginBottom: Spacing.md }]}>
          Saved Waypoints ({scoutedWaypoints.length})
        </Text>
        {isLoadingWaypoints ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
              Loading waypoints...
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {scoutedWaypoints.map((waypoint) => (
              <WaypointCard
                key={waypoint.id}
                waypoint={waypoint}
                onPress={() => {
                  const mediaInfo = [
                    waypoint.photos.length > 0 ? `📷 ${waypoint.photos.length} photo(s)` : null,
                    waypoint.videos.length > 0 ? `🎥 ${waypoint.videos.length} video(s)` : null,
                    waypoint.audioRecordings.length > 0 ? `🎤 ${waypoint.audioRecordings.length} audio` : null,
                  ].filter(Boolean).join('\n');
                  const body = [waypoint.notes, mediaInfo].filter(Boolean).join('\n\n') || 'No notes';
                  Alert.alert(waypoint.name, body, [
                    { text: 'OK', style: 'default' },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeleteWaypoint(waypoint) },
                  ]);
                }}
              />
            ))}
            {scoutedWaypoints.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>📍</Text>
                <Text style={[Typography.body, { marginTop: Spacing.md, textAlign: 'center' }]}>
                  No waypoints saved yet
                </Text>
                <Text style={[Typography.caption, { color: Colors.textSecondary, textAlign: 'center' }]}>
                  Drop a pin to save locations for your quests
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <AddWaypointModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveWaypoint}
        currentLocation={currentLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.lg,
    paddingTop: 60,
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mapSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dropPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neonGreen,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.neonGreen,
  },
  dropPinIcon: {
    fontSize: 20,
  },
  dropPinText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  savedSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  waypointCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  waypointImage: {
    width: 80,
    height: 80,
  },
  noImage: {
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waypointInfo: {
    flex: 1,
    padding: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,22,40,0.95)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  locationInfo: {
    flex: 1,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
    marginTop: Spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.neonGreen,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neonGreen,
  },
  saveButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
