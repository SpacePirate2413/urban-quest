import { CATEGORIES } from '@/src/data/mockData';
import { useLocationStore, useQuestStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { Difficulty, FilterOptions, LocationCoords, Quest } from '@/src/types';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import RealMapView, { Marker, Region } from 'react-native-maps';

// Haversine — duplicated from quest/play.tsx because the player tab and
// the play screen don't share a utils file yet. Cheap and self-contained.
function haversineMeters(a: LocationCoords, b: LocationCoords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

type Suggestion = { key: string; label: string; sublabel?: string; lat: number; lng: number };

/**
 * Hits OpenStreetMap Nominatim's `/search` endpoint to suggest places as
 * the user types. Returns up to 5 matches. No API key, but Nominatim asks
 * for low-volume use and a real User-Agent — fine for an in-app search.
 * If we ever rate-limit-out we'll swap to a paid provider.
 */
async function fetchSuggestions(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  if (query.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((d: any, i: number): Suggestion | null => {
      const lat = parseFloat(d.lat);
      const lng = parseFloat(d.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const parts = String(d.display_name ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      return {
        key: String(d.place_id ?? `${i}-${lat},${lng}`),
        label: parts[0] || String(d.display_name ?? 'Unnamed'),
        sublabel: parts.slice(1, 4).join(', ') || undefined,
        lat,
        lng,
      };
    })
    .filter((s): s is Suggestion => s !== null);
}

/**
 * Renders 5 stars filled in proportion to the average rating. `New` is shown
 * when the quest has no reviews yet so the player isn't misled into thinking
 * the quest scored zero.
 */
function StarRow({ averageRating, reviewCount }: { averageRating?: number; reviewCount?: number }) {
  if (!averageRating || !reviewCount) {
    return <Text style={[Typography.caption, { color: Colors.textSecondary }]}>New</Text>;
  }
  const filled = Math.round(averageRating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 12, opacity: i <= filled ? 1 : 0.25 }}>
          ⭐
        </Text>
      ))}
      <Text style={[Typography.caption, { color: Colors.textSecondary, marginLeft: 4 }]}>
        ({reviewCount})
      </Text>
    </View>
  );
}

function QuestCard({ quest, onPress }: { quest: Quest; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.questCard} onPress={onPress}>
      {quest.coverImageUrl ? (
        <Image source={{ uri: quest.coverImageUrl }} style={styles.questImage} />
      ) : (
        <View style={[styles.questImage, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 30 }}>🖼️</Text>
        </View>
      )}
      <View style={styles.questInfo}>
        <View style={styles.questHeader}>
          <Text style={Typography.headerMedium} numberOfLines={1}>{quest.title}</Text>
          {quest.isFree && (
            <View style={styles.freeTag}>
              <Text style={styles.freeTagText}>FREE w/ ADS</Text>
            </View>
          )}
        </View>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]} numberOfLines={1}>
          {quest.tagline}
        </Text>
        <View style={styles.questMeta}>
          <Text style={styles.star}>⭐ {quest.averageRating?.toFixed(1) || 'New'}</Text>
          <Text style={[Typography.caption, { color: Colors.accentCyan }]}>{quest.difficulty}</Text>
          <Text style={Typography.caption}>{quest.estimatedDurationMinutes} min</Text>
        </View>
        <View style={styles.questFooter}>
          <View style={styles.creatorInfo}>
            <Image source={{ uri: quest.authorAvatarUrl }} style={styles.creatorAvatar} />
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>{quest.authorUsername}</Text>
          </View>
          {!quest.isFree && (
            <Text style={[Typography.headerMedium, { color: Colors.accentYellow }]}>${quest.price.toFixed(2)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Real map showing every quest's first waypoint as a tappable marker. The
 * map auto-centers on the player's current location; if location permission
 * is denied or hasn't loaded yet, it falls back to the centroid of the
 * available quests, then to a sensible default.
 */
function QuestsMap({
  quests,
  onQuestPress,
  onFilterPress,
  activeFiltersCount,
  addressLocation,
}: {
  quests: Quest[];
  onQuestPress: (quest: Quest) => void;
  onFilterPress: () => void;
  activeFiltersCount: number;
  /** When set, the map flies here and stays put (instead of recentering on the user). */
  addressLocation: LocationCoords | null;
}) {
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const { currentLocation } = useLocationStore();
  const mapRef = useRef<RealMapView>(null);

  // A quest is mappable if its first waypoint actually has coords. Quests
  // missing coords (older test data) get filtered out of the map view but
  // still appear in the list view.
  const mappableQuests = useMemo(
    () =>
      quests.filter(
        (q) =>
          q.firstWaypointLocation &&
          Number.isFinite(q.firstWaypointLocation.latitude) &&
          Number.isFinite(q.firstWaypointLocation.longitude) &&
          !(q.firstWaypointLocation.latitude === 0 && q.firstWaypointLocation.longitude === 0),
      ),
    [quests],
  );

  const initialRegion: Region = useMemo(() => {
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (mappableQuests.length) {
      const first = mappableQuests[0].firstWaypointLocation;
      return {
        latitude: first.latitude,
        longitude: first.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }
    // Default: continental US center. Only matters before the first GPS fix
    // and when there are zero mappable quests, which is mostly empty-state.
    return { latitude: 39.5, longitude: -98.35, latitudeDelta: 30, longitudeDelta: 30 };
  }, [currentLocation, mappableQuests]);

  // Recenter on the user once we get the first GPS fix (initial region is
  // captured at mount time and won't update otherwise). If the user has
  // searched an address, that takes priority over GPS recentering.
  useEffect(() => {
    if (addressLocation) return;
    if (currentLocation && mapRef.current) {
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
    // Recenter once on the first non-null location. We don't want to fight
    // the user every time they pan after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation == null]);

  // Fly the map to a searched address whenever the user runs the address
  // search bar — this is what lets a player browse quests in another city.
  useEffect(() => {
    if (addressLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: addressLocation.latitude,
          longitude: addressLocation.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        },
        600,
      );
    }
  }, [addressLocation]);

  return (
    <View style={styles.mapContainer}>
      <RealMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {mappableQuests.map((quest) => (
          <Marker
            key={quest.id}
            coordinate={quest.firstWaypointLocation}
            title={quest.title}
            description={quest.tagline}
            pinColor={selectedQuest?.id === quest.id ? Colors.accentYellow : Colors.cyan}
            onPress={() => setSelectedQuest(quest)}
          />
        ))}
      </RealMapView>

      <TouchableOpacity style={styles.filterIconButton} onPress={onFilterPress}>
        <Text style={styles.filterIcon}>🎚️</Text>
        {activeFiltersCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Locate-me — bottom-left corner. Pans the map back to the player's
          GPS location. Lifts above the quest preview card when one is
          showing so it never gets covered. Greyed out (and Alerts) when
          location permission isn't granted yet. */}
      <TouchableOpacity
        style={[styles.locateIconButton, selectedQuest ? { bottom: 110 } : null]}
        onPress={() => {
          if (!currentLocation) {
            Alert.alert('Location unavailable', 'Grant location access to use this button.');
            return;
          }
          mapRef.current?.animateToRegion(
            {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            },
            500,
          );
        }}
      >
        <Text style={[styles.locateIcon, !currentLocation && { opacity: 0.4 }]}>📍</Text>
      </TouchableOpacity>

      <View style={styles.mapCountPill} pointerEvents="none">
        <Text style={[Typography.caption, { color: Colors.textPrimary }]}>
          {mappableQuests.length} quest{mappableQuests.length === 1 ? '' : 's'} nearby
        </Text>
      </View>

      {selectedQuest && (
        <TouchableOpacity style={styles.mapPreviewCard} onPress={() => onQuestPress(selectedQuest)}>
          {selectedQuest.coverImageUrl ? (
            <Image source={{ uri: selectedQuest.coverImageUrl }} style={styles.previewImage} />
          ) : (
            <View style={[styles.previewImage, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 20 }}>🖼️</Text>
            </View>
          )}
          <View style={styles.previewInfo}>
            <Text style={Typography.headerMedium} numberOfLines={1}>{selectedQuest.title}</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]} numberOfLines={1}>{selectedQuest.tagline}</Text>
            <View style={styles.previewMeta}>
              <StarRow averageRating={selectedQuest.averageRating} reviewCount={selectedQuest.reviewCount} />
              <Text style={[Typography.headerMedium, { color: Colors.accentYellow }]}>
                {selectedQuest.isFree ? 'Free' : `$${selectedQuest.price.toFixed(2)}`}
              </Text>
            </View>
          </View>
          <Text style={styles.previewArrow}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FilterModal({ visible, onClose, filters, onFilterChange }: { visible: boolean; onClose: () => void; filters: FilterOptions; onFilterChange: (f: FilterOptions) => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.filterModalHeader}>
            <Text style={Typography.headerLarge}>FILTERS</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
            <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>Price</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'free', label: 'Free' },
                { key: 'under5', label: 'Under $5' },
                { key: 'under10', label: 'Under $10' },
                { key: 'over10', label: '$10+' },
              ].map((price) => (
                <TouchableOpacity
                  key={price.key}
                  style={[styles.filterOption, filters.priceRange === price.key && styles.filterOptionActive]}
                  onPress={() => onFilterChange({ ...filters, priceRange: filters.priceRange === price.key ? undefined : price.key as any })}
                >
                  <Text style={[styles.filterOptionText, filters.priceRange === price.key && styles.filterOptionTextActive]}>{price.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[Typography.headerMedium, { marginTop: Spacing.lg }]}>Difficulty</Text>
            <View style={styles.filterOptions}>
              {Object.values(Difficulty).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[styles.filterOption, filters.difficulty === diff && styles.filterOptionActive]}
                  onPress={() => onFilterChange({ ...filters, difficulty: filters.difficulty === diff ? undefined : diff })}
                >
                  <Text style={[styles.filterOptionText, filters.difficulty === diff && styles.filterOptionTextActive]}>{diff}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[Typography.headerMedium, { marginTop: Spacing.lg }]}>Category</Text>
            <View style={styles.filterOptions}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterOption, filters.category === cat && styles.filterOptionActive]}
                  onPress={() => onFilterChange({ ...filters, category: filters.category === cat ? undefined : cat })}
                >
                  <Text style={[styles.filterOptionText, filters.category === cat && styles.filterOptionTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[Typography.headerMedium, { marginTop: Spacing.lg }]}>Minimum Rating</Text>
            <View style={styles.filterOptions}>
              {[3, 4, 4.5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[styles.filterOption, filters.minRating === rating && styles.filterOptionActive]}
                  onPress={() => onFilterChange({ ...filters, minRating: filters.minRating === rating ? undefined : rating })}
                >
                  <Text style={[styles.filterOptionText, filters.minRating === rating && styles.filterOptionTextActive]}>⭐ {rating}+</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterModalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={() => onFilterChange({})}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PlayScreen() {
  const { viewMode, setViewMode, filters, setFilters, quests, loadQuests, selectQuest, isLoading } = useQuestStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Address-search state. When `addressLocation` is set, the map flies
  // there and the list re-sorts by distance from there — this is how a
  // player browses quests in a city they aren't currently in.
  const [addressQuery, setAddressQuery] = useState('');
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [addressLocation, setAddressLocation] = useState<LocationCoords | null>(null);

  // Autocomplete suggestions powered by Nominatim. The dropdown shows the
  // top results as the user types, debounced 350 ms. `suggestionsOpen`
  // gates visibility — picking, submitting, or clearing closes the dropdown.
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  useEffect(() => {
    loadQuests().catch(() => setLoadError(true));
  }, []);

  // Debounced suggestions fetch — kicks 350ms after the user stops typing
  // and only when the query is at least 3 characters. Aborts the previous
  // request if a new keystroke lands while one is in flight.
  useEffect(() => {
    const q = addressQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const items = await fetchSuggestions(q, ctrl.signal);
        if (!ctrl.signal.aborted) setSuggestions(items);
      } catch {
        // network failure / aborted — leave previous list intact, the user
        // will still feel the input is responsive.
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [addressQuery]);

  const pickSuggestion = useCallback((s: Suggestion) => {
    setAddressLocation({ latitude: s.lat, longitude: s.lng });
    setAddressLabel(s.label);
    setAddressQuery(s.label);
    setSuggestions([]);
    setSuggestionsOpen(false);
    Keyboard.dismiss();
  }, []);

  const handleAddressSearch = useCallback(async () => {
    const q = addressQuery.trim();
    if (!q) return;
    Keyboard.dismiss();
    setSuggestionsOpen(false);
    // Prefer the top autocomplete result if we have one — that's what the
    // user has been seeing in the dropdown, so submit feels obvious.
    if (suggestions.length > 0) {
      pickSuggestion(suggestions[0]);
      return;
    }
    setAddressBusy(true);
    try {
      // Fallback to the OS-native geocoder if Nominatim hasn't caught up
      // (typed-and-hit-return faster than the debounce, network blip, etc).
      const results = await Location.geocodeAsync(q);
      if (!results.length) {
        Alert.alert('Not found', `Couldn't find "${q}". Try a more specific address or city.`);
        return;
      }
      setAddressLocation({ latitude: results[0].latitude, longitude: results[0].longitude });
      setAddressLabel(q);
    } catch (err: any) {
      Alert.alert('Search failed', err?.message ?? 'Could not look up that location.');
    } finally {
      setAddressBusy(false);
    }
  }, [addressQuery, suggestions, pickSuggestion]);

  const clearAddressSearch = () => {
    setAddressQuery('');
    setAddressLabel('');
    setAddressLocation(null);
    setSuggestions([]);
    setSuggestionsOpen(false);
    Keyboard.dismiss();
  };

  const activeFiltersCount = [filters.priceRange, filters.difficulty, filters.category, filters.minRating].filter(Boolean).length;

  const filteredQuests = useMemo(() => {
    const filtered = quests.filter((quest) => {
      if (searchQuery && !quest.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filters.priceRange === 'free' && !quest.isFree) return false;
      if (filters.priceRange === 'under5' && quest.price >= 5) return false;
      if (filters.priceRange === 'under10' && quest.price >= 10) return false;
      if (filters.priceRange === 'over10' && quest.price < 10) return false;
      if (filters.difficulty && quest.difficulty !== filters.difficulty) return false;
      if (filters.category && quest.category !== filters.category) return false;
      if (filters.minRating && (quest.averageRating || 0) < filters.minRating) return false;
      return true;
    });
    // When an address has been searched, sort closest-to-that-address first
    // so the player's reason for searching (find quests in city X) is
    // honored without hard-filtering quests they might still want to see.
    if (addressLocation) {
      return filtered
        .map((q) => ({
          q,
          dist:
            q.firstWaypointLocation && Number.isFinite(q.firstWaypointLocation.latitude)
              ? haversineMeters(addressLocation, q.firstWaypointLocation)
              : Number.POSITIVE_INFINITY,
        }))
        .sort((a, b) => a.dist - b.dist)
        .map((entry) => entry.q);
    }
    return filtered;
  }, [quests, searchQuery, filters, addressLocation]);

  const handleQuestPress = (quest: Quest) => {
    selectQuest(quest);
    router.push(`/quest/${quest.id}`);
  };

  return (
    <View style={AppStyles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleCyan}>URBAN</Text>
          <Text style={styles.titleGreen}>QUEST</Text>
        </View>
      </View>

      {/* Address search — applies to both Map and List views. The map
           flies to the searched location; the list sorts by distance
           from it. Lets a player browse quests in a city they aren't
           currently in (e.g. planning a trip). */}
      <View style={styles.addressSearchRow}>
        <View style={styles.addressSearchBox}>
          <Text style={styles.addressSearchIcon}>🌎</Text>
          <TextInput
            style={styles.addressSearchInput}
            placeholder="Search a city, address, or landmark…"
            placeholderTextColor={Colors.textSecondary}
            value={addressQuery}
            onChangeText={(text) => {
              setAddressQuery(text);
              // Reopen the dropdown the moment the user starts editing
              // again after picking or dismissing a previous suggestion.
              if (!suggestionsOpen) setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onSubmitEditing={handleAddressSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {addressBusy ? (
            <ActivityIndicator size="small" color={Colors.cyan} />
          ) : addressQuery ? (
            <TouchableOpacity onPress={() => setAddressQuery('')}>
              <Text style={styles.addressClear}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Autocomplete dropdown. Sits absolutely under the search box so
            it overlays the content below without pushing the map down. */}
        {suggestionsOpen && suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.suggestionRow}
                onPress={() => pickSuggestion(s)}
              >
                <Text style={styles.suggestionLabel} numberOfLines={1}>📍 {s.label}</Text>
                {s.sublabel ? (
                  <Text style={styles.suggestionSublabel} numberOfLines={1}>
                    {s.sublabel}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {addressLocation && (
        <View style={styles.addressActiveChip}>
          <Text style={styles.addressActiveText} numberOfLines={1}>
            📍 Showing quests near {addressLabel}
          </Text>
          <TouchableOpacity onPress={clearAddressSearch} style={styles.addressActiveClear}>
            <Text style={styles.addressActiveClearText}>Clear ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.viewToggle}>
        <TouchableOpacity style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]} onPress={() => setViewMode('map')}>
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>🗺️ Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]} onPress={() => setViewMode('list')}>
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>📋 List</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.cyan} />
          <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
            Loading quests...
          </Text>
        </View>
      ) : loadError ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>Could Not Load Quests</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { setLoadError(false); loadQuests().catch(() => setLoadError(true)); }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredQuests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>No Quests Available</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
            {quests.length === 0
              ? 'No quests have been published yet. Check back soon!'
              : 'No quests match your filters. Try adjusting them.'}
          </Text>
          {activeFiltersCount > 0 && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setFilters({})}
            >
              <Text style={styles.retryButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : viewMode === 'map' ? (
        <QuestsMap
          quests={filteredQuests}
          onQuestPress={handleQuestPress}
          onFilterPress={() => setShowFilters(true)}
          activeFiltersCount={activeFiltersCount}
          addressLocation={addressLocation}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.listHeader}>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search quests..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity style={styles.listFilterButton} onPress={() => setShowFilters(true)}>
              <Text style={styles.filterIcon}>🎚️</Text>
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredQuests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <QuestCard quest={item} onPress={() => handleQuestPress(item)} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <FilterModal 
        visible={showFilters} 
        onClose={() => setShowFilters(false)} 
        filters={filters} 
        onFilterChange={setFilters} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.sm, alignItems: 'center' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titleCyan: { fontFamily: 'System', fontSize: 28, fontWeight: '900', color: Colors.cyan, letterSpacing: 1 },
  titleGreen: { fontFamily: 'System', fontSize: 28, fontWeight: '900', color: Colors.neonGreen, letterSpacing: 1 },
  badge: { backgroundColor: Colors.hotPink, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 6, marginLeft: Spacing.sm },
  badgeText: { color: Colors.textPrimary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  // `position: relative` + `zIndex` so the absolutely-positioned suggestions
  // dropdown layers over the Map/List toggle and the map below.
  addressSearchRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm, position: 'relative', zIndex: 20 },
  addressSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 8, paddingHorizontal: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, gap: Spacing.sm },
  addressSearchIcon: { fontSize: 16 },
  addressSearchInput: { flex: 1, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: 15 },
  addressClear: { color: Colors.textSecondary, fontSize: 16, paddingHorizontal: 4 },
  suggestionsBox: {
    position: 'absolute',
    top: '100%',
    left: Spacing.lg,
    right: Spacing.lg,
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  suggestionRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionLabel: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  suggestionSublabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  addressActiveChip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: Colors.cyan + '20', borderColor: Colors.cyan, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  addressActiveText: { flex: 1, color: Colors.cyan, fontSize: 13, fontWeight: '600' },
  addressActiveClear: { paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  addressActiveClearText: { color: Colors.cyan, fontSize: 12, fontWeight: '700' },
  viewToggle: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: Colors.surface, borderRadius: 12, padding: 4, borderWidth: 1.5, borderColor: Colors.border },
  toggleButton: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: 10 },
  toggleButtonActive: { backgroundColor: Colors.cyan },
  toggleText: { color: Colors.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: Colors.primaryBackground },
  mapContainer: { flex: 1, margin: Spacing.md, marginTop: 0, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterIconButton: { position: 'absolute', top: Spacing.md, right: Spacing.md, width: 50, height: 50, backgroundColor: Colors.inputBg, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  locateIconButton: { position: 'absolute', bottom: Spacing.md, left: Spacing.md, width: 50, height: 50, backgroundColor: Colors.inputBg, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.cyan },
  locateIcon: { fontSize: 24 },
  mapCountPill: { position: 'absolute', top: Spacing.md, left: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.inputBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border },
  filterIcon: { fontSize: 24 },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.hotPink, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700' },
  mapPreviewCard: { position: 'absolute', bottom: Spacing.md, left: Spacing.sm, right: Spacing.sm, backgroundColor: Colors.surface, borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.cyan },
  previewImage: { width: 70, height: 70, borderRadius: 8 },
  previewInfo: { flex: 1, marginLeft: Spacing.md },
  previewMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs, alignItems: 'center' },
  previewArrow: { fontSize: 28, color: Colors.cyan },
  star: { fontSize: 14 },
  listHeader: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 8, paddingHorizontal: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: { flex: 1, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: 16 },
  listFilterButton: { width: 50, height: 50, backgroundColor: Colors.surface, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  listContent: { padding: Spacing.lg, paddingTop: Spacing.sm },
  questCard: { backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden', marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  questImage: { width: '100%', height: 140 },
  questInfo: { padding: Spacing.md },
  questHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  freeTag: { backgroundColor: Colors.neonGreen, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 4 },
  freeTagText: { color: Colors.primaryBackground, fontSize: 10, fontWeight: '700' },
  questMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, alignItems: 'center' },
  questFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  creatorAvatar: { width: 24, height: 24, borderRadius: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,22,40,0.95)', justifyContent: 'flex-end' },
  filterModal: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderWidth: 1.5, borderColor: Colors.border, borderBottomWidth: 0 },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1.5, borderBottomColor: Colors.border },
  closeButton: { fontSize: 24, color: Colors.textSecondary },
  filterModalContent: { padding: Spacing.lg },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  filterOption: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.inputBg, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border },
  filterOptionActive: { backgroundColor: Colors.cyan, borderColor: Colors.cyan },
  filterOptionText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  filterOptionTextActive: { color: Colors.primaryBackground },
  filterModalFooter: { flexDirection: 'row', padding: Spacing.lg, paddingBottom: 34, gap: Spacing.md, borderTopWidth: 1.5, borderTopColor: Colors.border },
  clearButton: { flex: 1, padding: Spacing.md, borderRadius: 8, alignItems: 'center', borderWidth: 2, borderColor: Colors.hotPink },
  clearButtonText: { color: Colors.hotPink, fontWeight: '700', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
  applyButton: { flex: 2, backgroundColor: Colors.cyan, padding: Spacing.md, borderRadius: 8, alignItems: 'center', borderWidth: 2, borderColor: Colors.cyan },
  applyButtonText: { color: Colors.primaryBackground, fontWeight: '700', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  retryButton: { marginTop: Spacing.lg, backgroundColor: Colors.cyan, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: 8 },
  retryButtonText: { color: Colors.primaryBackground, fontWeight: '700', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
});
