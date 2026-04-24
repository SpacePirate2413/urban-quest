import { CATEGORIES } from '@/src/data/mockData';
import { useQuestStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { Difficulty, FilterOptions, Quest } from '@/src/types';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

function QuestCard({ quest, onPress }: { quest: Quest; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.questCard} onPress={onPress}>
      <Image source={{ uri: quest.coverImageUrl }} style={styles.questImage} />
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

function MapView({ quests, onQuestPress, onFilterPress, activeFiltersCount }: { quests: Quest[]; onQuestPress: (quest: Quest) => void; onFilterPress: () => void; activeFiltersCount: number }) {
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Text style={{ fontSize: 60 }}>🗺️</Text>
        <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>Quests Near You</Text>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
          {quests.length} quests available
        </Text>
        <View style={styles.mapPins}>
          {quests.slice(0, 8).map((quest, index) => (
            <TouchableOpacity
              key={quest.id}
              style={[
                styles.mapPin,
                { 
                  left: 40 + (index % 4) * 70, 
                  top: 60 + Math.floor(index / 4) * 100 + (index % 2 === 0 ? 0 : 40) 
                },
                selectedQuest?.id === quest.id && styles.mapPinSelected
              ]}
              onPress={() => setSelectedQuest(quest)}
            >
              <Text style={styles.mapPinText}>📍</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity style={styles.filterIconButton} onPress={onFilterPress}>
          <Text style={styles.filterIcon}>🎚️</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {selectedQuest && (
        <TouchableOpacity style={styles.mapPreviewCard} onPress={() => onQuestPress(selectedQuest)}>
          <Image source={{ uri: selectedQuest.coverImageUrl }} style={styles.previewImage} />
          <View style={styles.previewInfo}>
            <Text style={Typography.headerMedium} numberOfLines={1}>{selectedQuest.title}</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]} numberOfLines={1}>{selectedQuest.tagline}</Text>
            <View style={styles.previewMeta}>
              <Text style={styles.star}>⭐ {selectedQuest.averageRating?.toFixed(1)}</Text>
              <Text style={[Typography.caption, { color: Colors.accentCyan }]}>{selectedQuest.difficulty}</Text>
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

  useEffect(() => {
    loadQuests().catch(() => setLoadError(true));
  }, []);

  const activeFiltersCount = [filters.priceRange, filters.difficulty, filters.category, filters.minRating].filter(Boolean).length;

  const filteredQuests = quests.filter((quest) => {
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
        <MapView
          quests={filteredQuests}
          onQuestPress={handleQuestPress}
          onFilterPress={() => setShowFilters(true)}
          activeFiltersCount={activeFiltersCount}
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
  viewToggle: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: Colors.surface, borderRadius: 12, padding: 4, borderWidth: 1.5, borderColor: Colors.border },
  toggleButton: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: 10 },
  toggleButtonActive: { backgroundColor: Colors.cyan },
  toggleText: { color: Colors.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: Colors.primaryBackground },
  mapContainer: { flex: 1, margin: Spacing.md, marginTop: 0 },
  mapPlaceholder: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, position: 'relative', overflow: 'hidden' },
  mapPins: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mapPin: { position: 'absolute', width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  mapPinSelected: { transform: [{ scale: 1.4 }] },
  mapPinText: { fontSize: 32 },
  filterIconButton: { position: 'absolute', top: Spacing.md, right: Spacing.md, width: 50, height: 50, backgroundColor: Colors.inputBg, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
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
