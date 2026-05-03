import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Tiny shared module for the scout-mode media pickers. Wrapping expo-image-picker
 * here means the modal code stays focused on layout — permission flow, source
 * choice (camera / library), and result normalization all live here.
 *
 * All `pick*` functions return null when the user cancels or denies permission;
 * callers can early-return without special-casing.
 */

export interface PickedAsset {
  uri: string;
  mimeType: string;
  fileName: string;
}

function showSourceSheet(title: string): Promise<'camera' | 'library' | null> {
  return new Promise((resolve) => {
    Alert.alert(title, undefined, [
      { text: 'Take Photo / Video', onPress: () => resolve('camera') },
      { text: 'Choose from Library', onPress: () => resolve('library') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

async function ensureCameraPermission(): Promise<boolean> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    Alert.alert(
      'Camera permission needed',
      'Enable camera access in Settings to capture media for your waypoints.',
    );
  }
  return granted;
}

async function ensureLibraryPermission(): Promise<boolean> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) {
    Alert.alert(
      'Photo library permission needed',
      'Enable photo library access in Settings to attach existing media.',
    );
  }
  return granted;
}

function normalize(asset: ImagePicker.ImagePickerAsset, fallbackMime: string): PickedAsset {
  // expo-image-picker exposes `mimeType` on newer SDK versions; for older
  // versions / camera captures it may be missing — fall back to the caller's
  // expected type so the upload still passes server-side mime validation.
  return {
    uri: asset.uri,
    mimeType: asset.mimeType || fallbackMime,
    fileName:
      asset.fileName ||
      asset.uri.split('/').pop() ||
      `capture-${Date.now()}.${fallbackMime.includes('jpeg') ? 'jpg' : fallbackMime.split('/').pop()}`,
  };
}

/**
 * Prompt the user (Camera vs Library) and return one or more picked photos.
 * Multiple selection is allowed from the library; camera always returns a
 * single capture. Returns [] on cancel/denial so callers can `if (!picks.length) return`.
 */
export async function pickPhotos(): Promise<PickedAsset[]> {
  const source = await showSourceSheet('Add Photo');
  if (!source) return [];

  if (source === 'camera') {
    if (!(await ensureCameraPermission())) return [];
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return [];
    return [normalize(res.assets[0], 'image/jpeg')];
  }

  if (!(await ensureLibraryPermission())) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsMultipleSelection: true,
    selectionLimit: 10,
  });
  if (res.canceled || !res.assets?.length) return [];
  return res.assets.map((a) => normalize(a, 'image/jpeg'));
}

/**
 * Audio recording sits behind a tiny stateful wrapper because expo-av's
 * Recording API is start → stop → getURI rather than a single picker call.
 * Callers create one with `startRecording()`, then call `stopAndExport()` to
 * finalize and get back a PickedAsset ready for upload.
 *
 * Mime defaults to audio/m4a — expo-av's HIGH_QUALITY preset records m4a on
 * both iOS and Android, which the server's allowed list covers via
 * audio/x-m4a / audio/mp4.
 */
export async function startRecording(): Promise<Audio.Recording | null> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Microphone permission needed',
      'Enable microphone access in Settings to record audio for your waypoints.',
    );
    return null;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  return recording;
}

export async function stopAndExport(recording: Audio.Recording): Promise<PickedAsset | null> {
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    // Already stopped — fine.
  }
  const uri = recording.getURI();
  if (!uri) return null;
  return {
    uri,
    mimeType: 'audio/m4a',
    fileName: `voice-note-${Date.now()}.m4a`,
  };
}

/**
 * Same flow as pickPhotos but for videos. Camera capture goes into video
 * recording mode; library picker filters to videos. Server accepts mp4 / mov /
 * webm — iOS captures land as .mov, Android as .mp4. Library imports could be
 * any of those. The fallback mime ('video/mp4') only kicks in when the picker
 * doesn't expose mimeType, which rarely happens on modern SDKs.
 */
export async function pickVideos(): Promise<PickedAsset[]> {
  const source = await showSourceSheet('Add Video');
  if (!source) return [];

  if (source === 'camera') {
    if (!(await ensureCameraPermission())) return [];
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return [];
    return [normalize(res.assets[0], 'video/mp4')];
  }

  if (!(await ensureLibraryPermission())) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    quality: 0.8,
    allowsMultipleSelection: true,
    selectionLimit: 10,
  });
  if (res.canceled || !res.assets?.length) return [];
  return res.assets.map((a) => normalize(a, 'video/mp4'));
}
