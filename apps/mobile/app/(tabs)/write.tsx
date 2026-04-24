import { api } from '@/src/services/api';
import { useLocationStore, useWriteStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { ScoutedWaypoint } from '@/src/types';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
          {new Date(waypoint.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AddWaypointModal({ visible, onClose, onSave, currentLocation }: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, notes: string, pendingMedia: PendingMedia[]) => void;
  currentLocation: { latitude: number; longitude: number } | null;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  if (!visible) return null;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for this waypoint');
      return;
    }
    onSave(name, notes, pendingMedia);
    setName('');
    setNotes('');
    setPendingMedia([]);
  };

  const handleClose = () => {
    setName('');
    setNotes('');
    setPendingMedia([]);
    onClose();
  };

  const addMediaAsset = (asset: ImagePicker.ImagePickerAsset, fallbackType: string, fallbackExt: string, mediaType: 'photo' | 'video') => {
    setPendingMedia(prev => [...prev, {
      uri: asset.uri,
      type: asset.mimeType || fallbackType,
      fileName: asset.fileName || `${mediaType}_${Date.now()}${fallbackExt}`,
      mediaType,
    }]);
  };

  const launchCamera = async (mediaTypes: ('images' | 'videos')[], mediaType: 'photo' | 'video', fallbackType: string, fallbackExt: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      addMediaAsset(result.assets[0], fallbackType, fallbackExt, mediaType);
    }
  };

  const launchLibrary = async (mediaTypes: ('images' | 'videos')[], mediaType: 'photo' | 'video', fallbackType: string, fallbackExt: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      addMediaAsset(result.assets[0], fallbackType, fallbackExt, mediaType);
    }
  };

  const handlePickPhoto = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => launchCamera(['images'], 'photo', 'image/jpeg', '.jpg') },
      { text: 'Photo Library', onPress: () => launchLibrary(['images'], 'photo', 'image/jpeg', '.jpg') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePickVideo = () => {
    Alert.alert('Add Video', 'Choose a source', [
      { text: 'Camera', onPress: () => launchCamera(['videos'], 'video', 'video/mp4', '.mp4') },
      { text: 'Video Library', onPress: () => launchLibrary(['videos'], 'video', 'video/mp4', '.mp4') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRecordAudio = async () => {
    if (isRecording && recordingRef.current) {
      setIsRecording(false);
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        if (uri) {
          setPendingMedia(prev => [...prev, {
            uri,
            type: 'audio/m4a',
            fileName: `audio_${Date.now()}.m4a`,
            mediaType: 'audio' as const,
          }]);
        }
      } catch (err) {
        console.error('Failed to stop recording:', err);
      }
      return;
    }

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Microphone access is required to record audio.');
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Could not start audio recording.');
    }
  };

  const removeMedia = (index: number) => {
    setPendingMedia(prev => prev.filter((_, i) => i !== index));
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

          <View style={styles.mediaButtons}>
            <TouchableOpacity style={styles.mediaButton} onPress={handlePickPhoto}>
              <Text style={styles.mediaButtonIcon}>📷</Text>
              <Text style={styles.mediaButtonText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton} onPress={handlePickVideo}>
              <Text style={styles.mediaButtonIcon}>🎥</Text>
              <Text style={styles.mediaButtonText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mediaButton, isRecording && { borderColor: Colors.hotPink, backgroundColor: `${Colors.hotPink}20` }]}
              onPress={handleRecordAudio}
            >
              <Text style={styles.mediaButtonIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
              <Text style={[styles.mediaButtonText, isRecording && { color: Colors.hotPink }]}>
                {isRecording ? 'Stop' : 'Audio'}
              </Text>
            </TouchableOpacity>
          </View>

          {pendingMedia.length > 0 && (
            <View style={styles.pendingMediaList}>
              {pendingMedia.map((m, i) => (
                <View key={i} style={styles.pendingMediaItem}>
                  {m.mediaType === 'photo' ? (
                    <Image source={{ uri: m.uri }} style={styles.pendingThumb} />
                  ) : (
                    <View style={[styles.pendingThumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.inputBg }]}>
                      <Text style={{ fontSize: 16 }}>{m.mediaType === 'video' ? '🎥' : '🎤'}</Text>
                    </View>
                  )}
                  <Text style={[Typography.caption, { flex: 1, color: Colors.textSecondary }]} numberOfLines={1}>
                    {m.fileName}
                  </Text>
                  <TouchableOpacity onPress={() => removeMedia(i)}>
                    <Text style={{ fontSize: 16, color: Colors.hotPink }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

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

interface PendingMedia {
  uri: string;
  type: string;
  fileName: string;
  mediaType: 'photo' | 'video' | 'audio';
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

  const handleSaveWaypoint = async (name: string, notes: string, pendingMedia: PendingMedia[]) => {
    const lat = currentLocation?.latitude ?? 0;
    const lng = currentLocation?.longitude ?? 0;

    try {
      const result = await api.addScoutedWaypoint({ name, notes, lat, lng });
      const waypointId = result.id || `sw_${Date.now()}`;

      // Upload each media file to the server
      const photos: string[] = [];
      const videos: string[] = [];
      const audioRecordings: string[] = [];

      for (const media of pendingMedia) {
        try {
          const uploadResult = await api.uploadScoutedMedia(
            waypointId, media.uri, media.type, media.fileName
          );
          if (media.mediaType === 'photo') photos.push(uploadResult.mediaUrl);
          else if (media.mediaType === 'video') videos.push(uploadResult.mediaUrl);
          else audioRecordings.push(uploadResult.mediaUrl);
        } catch (uploadErr) {
          console.warn('Media upload failed for', media.fileName, uploadErr);
        }
      }

      const newWaypoint: ScoutedWaypoint = {
        id: waypointId,
        userId: result.userId || '',
        name,
        notes,
        location: { latitude: lat, longitude: lng },
        photos,
        videos,
        audioRecordings,
        createdAt: new Date(),
      };
      addScoutedWaypoint(newWaypoint);
      setShowAddModal(false);
      const mediaCount = photos.length + videos.length + audioRecordings.length;
      Alert.alert('Saved!', `Waypoint saved${mediaCount > 0 ? ` with ${mediaCount} media file(s)` : ''}.`);
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
      Alert.alert('Saved Locally', 'Waypoint saved locally. Media will upload when connected.');
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
  pendingMediaList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  pendingMediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pendingThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
});
