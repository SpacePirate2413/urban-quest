import { MOCK_SCOUTED_WAYPOINTS } from '@/src/data/mockData';
import { useWriteStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { ScoutedWaypoint } from '@/src/types';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

function WaypointCard({ waypoint, onPress }: { waypoint: ScoutedWaypoint; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.waypointCard} onPress={onPress}>
      {waypoint.photos.length > 0 ? (
        <Image source={{ uri: waypoint.photos[0] }} style={styles.waypointImage} />
      ) : (
        <View style={[styles.waypointImage, styles.noImage]}>
          <Text style={{ fontSize: 24 }}>📍</Text>
        </View>
      )}
      <View style={styles.waypointInfo}>
        <Text style={Typography.headerMedium}>{waypoint.name}</Text>
        {waypoint.notes && (
          <Text style={[Typography.caption, { color: Colors.textSecondary }]} numberOfLines={2}>
            {waypoint.notes}
          </Text>
        )}
        <View style={styles.waypointMeta}>
          {waypoint.photos.length > 0 && <Text style={styles.metaTag}>📷 {waypoint.photos.length}</Text>}
          {waypoint.videos.length > 0 && <Text style={styles.metaTag}>🎥 {waypoint.videos.length}</Text>}
          {waypoint.audioRecordings.length > 0 && <Text style={styles.metaTag}>🎤 {waypoint.audioRecordings.length}</Text>}
        </View>
        <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
          {waypoint.createdAt.toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AddWaypointModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (name: string, notes: string) => void }) {
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

  return (
    <View style={styles.modalOverlay}>
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
              40.7128° N, 74.0060° W
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

        <View style={styles.mediaButtons}>
          <TouchableOpacity style={styles.mediaButton}>
            <Text style={styles.mediaButtonIcon}>📷</Text>
            <Text style={styles.mediaButtonText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Text style={styles.mediaButtonIcon}>🎥</Text>
            <Text style={styles.mediaButtonText}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Text style={styles.mediaButtonIcon}>🎤</Text>
            <Text style={styles.mediaButtonText}>Audio</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Waypoint</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function WriteScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { scoutedWaypoints, addScoutedWaypoint } = useWriteStore();
  
  const allWaypoints = [...MOCK_SCOUTED_WAYPOINTS, ...scoutedWaypoints];

  const handleSaveWaypoint = (name: string, notes: string) => {
    const newWaypoint: ScoutedWaypoint = {
      id: `sw_${Date.now()}`,
      userId: 'u1',
      name,
      notes,
      location: { latitude: 40.7128, longitude: -74.006 },
      photos: [],
      videos: [],
      audioRecordings: [],
      createdAt: new Date(),
    };
    addScoutedWaypoint(newWaypoint);
    setShowAddModal(false);
    Alert.alert('Saved!', 'Waypoint saved to your Creator Station library.');
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
            40.7128° N, 74.0060° W
          </Text>
        </View>
        <TouchableOpacity style={styles.dropPinButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.dropPinIcon}>📍</Text>
          <Text style={styles.dropPinText}>Drop Pin Here</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.savedSection}>
        <Text style={[Typography.headerMedium, { marginBottom: Spacing.md }]}>
          Saved Waypoints ({allWaypoints.length})
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {allWaypoints.map((waypoint) => (
            <WaypointCard
              key={waypoint.id}
              waypoint={waypoint}
              onPress={() => Alert.alert(waypoint.name, waypoint.notes || 'No notes')}
            />
          ))}
          {allWaypoints.length === 0 && (
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
      </View>

      <AddWaypointModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveWaypoint}
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
  waypointMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  metaTag: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    justifyContent: 'center',
    padding: Spacing.lg,
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
  mediaButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  mediaButtonIcon: {
    fontSize: 24,
  },
  mediaButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
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
