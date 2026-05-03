import { pickPhotos, type PickedAsset } from '@/src/lib/mediaPicker';
import { fullMediaUrl } from '@/src/lib/mediaUrl';
import { api } from '@/src/services/api';
import { useLocationStore, useWriteStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { ScoutedWaypoint } from '@/src/types';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

// Media capture (photo / video / audio) was removed from this screen on
// 2026-04-29 — see tracker entry F3. The Prisma columns + the
// /scouted-waypoints/:id/upload endpoint are intentionally left in place so
// the feature can be re-enabled without a schema migration.

function WaypointCard({ waypoint, onPress }: { waypoint: ScoutedWaypoint; onPress: () => void }) {
  // Use the first photo as the card thumbnail when present — much more
  // recognizable than the generic 📍 placeholder when scrolling a long list.
  const firstPhoto = waypoint.photos?.[0];
  const thumbUri = fullMediaUrl(firstPhoto);
  const mediaCount =
    (waypoint.photos?.length || 0) +
    (waypoint.videos?.length || 0) +
    (waypoint.audioRecordings?.length || 0);

  return (
    <TouchableOpacity style={styles.waypointCard} onPress={onPress}>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.waypointImage} />
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
        <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
          {new Date(waypoint.createdAt).toLocaleDateString()}
          {mediaCount > 0 ? ` · 📎 ${mediaCount}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Horizontal row of media thumbnails with a "+ Add Photo" button. Used inside
 * both AddWaypointModal (staged URIs from local picker) and EditWaypointModal
 * (already-uploaded server URLs). Caller passes uris + the add handler.
 */
function PhotoStrip({ uris, onAdd, busy }: { uris: string[]; onAdd: () => void; busy?: boolean }) {
  return (
    <View>
      <Text style={[Typography.caption, { color: Colors.textSecondary, marginBottom: Spacing.xs }]}>
        Photos
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {uris.map((uri, i) => (
          <Image key={`${uri}-${i}`} source={{ uri }} style={styles.mediaThumb} />
        ))}
        <TouchableOpacity
          style={styles.addMediaButton}
          onPress={onAdd}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={Colors.cyan} />
          ) : (
            <>
              <Text style={{ fontSize: 22, color: Colors.cyan }}>＋</Text>
              <Text style={[Typography.caption, { color: Colors.cyan }]}>Photo</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type PinCoord = { latitude: number; longitude: number };

// Edit modal for an existing scouted waypoint. Same shape as AddWaypointModal
// but pre-filled and operates on a specific waypoint id. Supports name + notes
// edits today; lat/lng moves are deferred until we add a draggable pin UI.
// Photos can be added directly here (waypoint already exists) — the upload
// fires immediately and the parent passes the new url back via onPhotoAdded.
function EditWaypointModal({ waypoint, onClose, onSave, onPhotoAdded }: {
  waypoint: ScoutedWaypoint | null;
  onClose: () => void;
  onSave: (waypointId: string, name: string, notes: string) => void;
  onPhotoAdded: (waypointId: string, mediaUrl: string) => void;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (waypoint) {
      setName(waypoint.name);
      setNotes(waypoint.notes ?? '');
    }
  }, [waypoint]);

  if (!waypoint) return null;

  const photoUris = (waypoint.photos || []).map((p) => fullMediaUrl(p)!).filter(Boolean);

  const handleAddPhoto = async () => {
    const picks = await pickPhotos();
    if (!picks.length) return;
    setUploadingPhoto(true);
    try {
      for (const pick of picks) {
        const result = await api.uploadScoutedMedia(
          waypoint.id, pick.uri, pick.mimeType, pick.fileName,
        );
        // Server returns { mediaUrl, field, waypoint } — use mediaUrl so we
        // append even if the server's full waypoint payload races other edits.
        if (result?.mediaUrl) onPhotoAdded(waypoint.id, result.mediaUrl);
      }
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not attach photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for this waypoint');
      return;
    }
    onSave(waypoint.id, name, notes);
  };

  return (
    <View style={styles.modalOverlay}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.lg }}>
        <View style={styles.modalContent}>
          <Text style={Typography.headerMedium}>Edit Waypoint</Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
            Changes sync to the creator station automatically
          </Text>

          <View style={styles.locationPreview}>
            <Text style={{ fontSize: 30 }}>📍</Text>
            <View style={styles.locationInfo}>
              <Text style={Typography.body}>Pin Location</Text>
              <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                {waypoint.location.latitude.toFixed(4)}°, {waypoint.location.longitude.toFixed(4)}°
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

          <PhotoStrip uris={photoUris} onAdd={handleAddPhoto} busy={uploadingPhoto} />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AddWaypointModal({ visible, onClose, onSave, pinLocation }: {
  visible: boolean;
  onClose: () => void;
  // Staged photos picked before the waypoint exists on the server; the parent
  // POSTs the waypoint and then uploads each one to the new id.
  onSave: (name: string, notes: string, stagedPhotos: PickedAsset[]) => void;
  pinLocation: PinCoord | null;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [stagedPhotos, setStagedPhotos] = useState<PickedAsset[]>([]);

  if (!visible) return null;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for this waypoint');
      return;
    }
    onSave(name, notes, stagedPhotos);
    setName('');
    setNotes('');
    setStagedPhotos([]);
  };

  const handleClose = () => {
    setName('');
    setNotes('');
    setStagedPhotos([]);
    onClose();
  };

  const handleAddPhoto = async () => {
    const picks = await pickPhotos();
    if (picks.length) setStagedPhotos((prev) => [...prev, ...picks]);
  };

  const lat = pinLocation?.latitude ?? 0;
  const lng = pinLocation?.longitude ?? 0;

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
              <Text style={Typography.body}>Pin Location</Text>
              <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                {pinLocation
                  ? `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`
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

          <PhotoStrip uris={stagedPhotos.map((p) => p.uri)} onAdd={handleAddPhoto} />

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const { scoutedWaypoints, addScoutedWaypoint, updateScoutedWaypoint } = useWriteStore();
  const [editingWaypoint, setEditingWaypoint] = useState<ScoutedWaypoint | null>(null);
  const { currentLocation } = useLocationStore();

  // The map can wander away from the player's current location (search,
  // pan, zoom). Track the last region we know so the "Drop Pin Here" button
  // pins at whatever the map is currently showing — that's how a creator
  // pins remote locations they're planning a quest in.
  const mapRef = useRef<MapView>(null);
  const [mapCenter, setMapCenter] = useState<PinCoord | null>(null);

  // Initial region — falls back to the continental US center until we know
  // the user's GPS or they search for somewhere.
  const initialRegion: Region = useMemo(() => {
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return { latitude: 39.5, longitude: -98.35, latitudeDelta: 30, longitudeDelta: 30 };
  }, [currentLocation]);

  // Auto-center on the player once we get the first GPS fix. Only fires the
  // first time `currentLocation` becomes non-null so we don't fight the
  // user's panning afterward.
  const recenteredOnceRef = useRef(false);
  useEffect(() => {
    if (currentLocation && !recenteredOnceRef.current && mapRef.current) {
      recenteredOnceRef.current = true;
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500,
      );
    }
  }, [currentLocation]);

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
        useWriteStore.setState({ scoutedWaypoints: waypoints });
      })
      .catch(() => {
        // Keep whatever local state we have
      })
      .finally(() => setIsLoadingWaypoints(false));
  }, []);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;
    Keyboard.dismiss();
    setSearchBusy(true);
    try {
      // expo-location's geocoder uses the OS geocoder (Apple Maps on iOS,
      // Google Geocoder on Android) — both respect the OS-level user privacy
      // settings and need no API keys. Limit ourselves to one match.
      const results = await Location.geocodeAsync(query);
      if (!results.length) {
        Alert.alert('Not found', `Couldn't find "${query}". Try a more specific address or city.`);
        return;
      }
      const { latitude, longitude } = results[0];
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        600,
      );
      setMapCenter({ latitude, longitude });
    } catch (err: any) {
      Alert.alert('Search failed', err?.message ?? 'Could not look up that location.');
    } finally {
      setSearchBusy(false);
    }
  }, [searchQuery]);

  const handleSaveWaypoint = async (name: string, notes: string, stagedPhotos: PickedAsset[]) => {
    // Pin lands at the map's current center, not GPS. That's how the user
    // scouts a city they're planning a future trip to.
    const target = mapCenter ?? currentLocation;
    const lat = target?.latitude ?? 0;
    const lng = target?.longitude ?? 0;

    try {
      const result = await api.addScoutedWaypoint({ name, notes, lat, lng });

      // Now that the waypoint exists server-side, upload each photo the user
      // staged in the modal. Best-effort per file — one failure shouldn't lose
      // the others; we report after the loop with whichever succeeded.
      const uploadedPhotos: string[] = [];
      const failedPhotos: string[] = [];
      for (const photo of stagedPhotos) {
        try {
          const r = await api.uploadScoutedMedia(result.id, photo.uri, photo.mimeType, photo.fileName);
          if (r?.mediaUrl) uploadedPhotos.push(r.mediaUrl);
        } catch (err: any) {
          failedPhotos.push(photo.fileName);
          console.warn('Photo upload failed:', photo.fileName, err?.message);
        }
      }

      const newWaypoint: ScoutedWaypoint = {
        id: result.id,
        userId: result.userId || '',
        name,
        notes,
        location: { latitude: lat, longitude: lng },
        photos: uploadedPhotos,
        videos: [],
        audioRecordings: [],
        createdAt: new Date(),
      };
      addScoutedWaypoint(newWaypoint);
      setShowAddModal(false);
      if (failedPhotos.length) {
        Alert.alert(
          'Saved with errors',
          `Waypoint saved, but ${failedPhotos.length} photo(s) failed to upload:\n${failedPhotos.join('\n')}`,
        );
      } else {
        Alert.alert('Saved!', 'Waypoint saved.');
      }
    } catch {
      // Local-only fallback when the API is unreachable. Photos can't be
      // uploaded here, but we keep the picked URIs so the user sees them in
      // the saved-list and we can resync later.
      const newWaypoint: ScoutedWaypoint = {
        id: `sw_${Date.now()}`,
        userId: '',
        name,
        notes,
        location: { latitude: lat, longitude: lng },
        photos: stagedPhotos.map((p) => p.uri),
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

  const pinTarget = mapCenter ?? currentLocation;

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

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search a city, address, or landmark…"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchBusy ? (
            <ActivityIndicator size="small" color={Colors.cyan} />
          ) : searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.mapSection}>
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
            onRegionChangeComplete={(r) =>
              setMapCenter({ latitude: r.latitude, longitude: r.longitude })
            }
          >
            {scoutedWaypoints.map((wp) => (
              <Marker
                key={wp.id}
                coordinate={{ latitude: wp.location.latitude, longitude: wp.location.longitude }}
                title={wp.name}
                description={wp.notes ?? undefined}
                pinColor={Colors.neonGreen}
              />
            ))}
          </MapView>

          {/* Crosshair so the user knows exactly where the pin will drop. */}
          <View pointerEvents="none" style={styles.crosshair}>
            <Text style={styles.crosshairText}>＋</Text>
          </View>

          <View pointerEvents="none" style={styles.coordPill}>
            <Text style={[Typography.caption, { color: Colors.textPrimary }]}>
              {pinTarget
                ? `${pinTarget.latitude.toFixed(4)}°, ${pinTarget.longitude.toFixed(4)}°`
                : 'Locating…'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.dropPinButton}
          onPress={() => setShowAddModal(true)}
          disabled={!pinTarget}
        >
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
                  // Offer "Show on map" so the user can fly the camera to a
                  // saved pin without scrolling away.
                  Alert.alert(waypoint.name, waypoint.notes || 'No notes', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Edit',
                      onPress: () => setEditingWaypoint(waypoint),
                    },
                    {
                      text: 'Show on Map',
                      onPress: () =>
                        mapRef.current?.animateToRegion(
                          {
                            latitude: waypoint.location.latitude,
                            longitude: waypoint.location.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                          },
                          500,
                        ),
                    },
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
        pinLocation={pinTarget}
      />

      {/* Edit modal — pre-filled, PATCHes the saved waypoint and updates the
          local store. The store row is what the FlatList reads from, so the
          rename appears immediately without a refetch. */}
      <EditWaypointModal
        waypoint={editingWaypoint}
        onClose={() => setEditingWaypoint(null)}
        onSave={async (waypointId, name, notes) => {
          try {
            await api.updateScoutedWaypoint(waypointId, { name, notes });
            updateScoutedWaypoint(waypointId, { name, notes });
            setEditingWaypoint(null);
          } catch (err: any) {
            Alert.alert('Save failed', err?.message || 'Could not update waypoint');
          }
        }}
        onPhotoAdded={(waypointId, mediaUrl) => {
          // Append to local state + bump the editingWaypoint reference so the
          // PhotoStrip rerenders the new thumbnail without closing the modal.
          const current = useWriteStore.getState().scoutedWaypoints.find((w) => w.id === waypointId);
          const nextPhotos = [...(current?.photos || []), mediaUrl];
          updateScoutedWaypoint(waypointId, { photos: nextPhotos });
          setEditingWaypoint((wp) => (wp && wp.id === waypointId ? { ...wp, photos: nextPhotos } : wp));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  searchClear: { color: Colors.textSecondary, fontSize: 16, paddingHorizontal: 4 },
  mapSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  mapWrap: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  crosshair: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairText: {
    fontSize: 28,
    color: Colors.neonGreen,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  coordPill: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(10,22,40,0.85)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
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
  dropPinIcon: { fontSize: 20 },
  dropPinText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  savedSection: { flex: 1, paddingHorizontal: Spacing.lg },
  waypointCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  waypointImage: { width: 80, height: 80 },
  noImage: {
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: Spacing.sm,
    backgroundColor: Colors.inputBg,
  },
  addMediaButton: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.cyan,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
  },
  waypointInfo: { flex: 1, padding: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
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
  locationInfo: { flex: 1 },
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
  textArea: { height: 80, textAlignVertical: 'top' },
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
