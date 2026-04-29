import {
    Bookmark,
    ChevronRight,
    MapPin,
    Plus,
    PlusCircle,
    RefreshCw,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Input, Textarea } from '../../components/ui';
import { useWriterStore } from '../../store/useWriterStore';

export function WaypointEditor({ questId }) {
  const {
    quests,
    addWaypoint,
    updateWaypoint,
    deleteWaypoint,
    scoutedWaypoints,
    scoutedWaypointsLoaded,
    isLoadingScoutedWaypoints,
    loadScoutedWaypoints,
    deleteScoutedWaypoint,
  } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  const [selectedWaypointId, setSelectedWaypointId] = useState(null);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [expandedScoutId, setExpandedScoutId] = useState(null);
  const mapRef = useRef(null);

  // Refetch every time the saved-waypoints panel is opened so updates from
  // the mobile app appear without a page reload. The previous gate
  // (scoutedWaypointsLoaded) cached the first response forever.
  useEffect(() => {
    if (showSavedPanel) {
      loadScoutedWaypoints();
    }
  }, [showSavedPanel, loadScoutedWaypoints]);

  if (!quest) return null;

  const selectedWaypoint = quest.waypoints.find(wp => wp.id === selectedWaypointId);

  const handleAddWaypoint = () => {
    addWaypoint(questId, {});
  };

  const handleMapClick = (e) => {
    if (!mapRef.current) return;
    if (e.target.closest('button')) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const lng = -74.0060 + (x - 50) * 0.002;
    const lat = 40.7128 + (50 - y) * 0.002;

    addWaypoint(questId, { lat, lng });
  };

  const handleUpdateWaypoint = (field, value) => {
    if (selectedWaypointId) {
      updateWaypoint(questId, selectedWaypointId, { [field]: value });
    }
  };

  const handleDeleteWaypoint = () => {
    if (selectedWaypointId) {
      deleteWaypoint(questId, selectedWaypointId);
      setSelectedWaypointId(null);
    }
  };

  // Copy a scouted waypoint into the quest as a new quest waypoint
  const handleAddScoutedToQuest = (scouted) => {
    addWaypoint(questId, {
      name: scouted.name,
      description: scouted.notes || '',
      notes: scouted.notes || '',
      lat: scouted.lat,
      lng: scouted.lng,
    });
    setShowSavedPanel(false);
  };

  const handleDeleteScouted = async (waypointId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this scouted waypoint? This cannot be undone.')) return;
    try {
      await deleteScoutedWaypoint(waypointId);
    } catch {
      alert('Failed to delete waypoint');
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">
      {/* ── Map panel ────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <Card className="h-full overflow-hidden">
          <div
            ref={mapRef}
            className="w-full h-full relative cursor-crosshair"
            onClick={handleMapClick}
            style={{
              background: `
                linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px),
                #0a1628
              `,
              backgroundSize: '40px 40px',
            }}
          >
            {quest.waypoints.map((waypoint, index) => {
              const isSelected = waypoint.id === selectedWaypointId;
              const x = ((waypoint.lng + 74.1) * 500) % 80 + 10;
              const y = ((waypoint.lat - 40.7) * 500) % 70 + 15;

              return (
                <button
                  key={waypoint.id}
                  onClick={() => {
                    setSelectedWaypointId(waypoint.id);
                    setShowSavedPanel(false);
                  }}
                  className={`
                    absolute transform -translate-x-1/2 -translate-y-full
                    transition-all duration-200
                    ${isSelected ? 'scale-130 z-10' : 'hover:scale-110'}
                  `}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="relative">
                    <MapPin
                      className={`w-8 h-8 ${isSelected ? 'text-neon-green' : 'text-cyan'}`}
                      fill={isSelected ? '#39ff14' : '#00d4ff'}
                      fillOpacity={0.3}
                    />
                    <span
                      className={`
                        absolute -bottom-5 left-1/2 -translate-x-1/2
                        font-bangers text-xs whitespace-nowrap
                        ${isSelected ? 'text-neon-green' : 'text-white/70'}
                      `}
                    >
                      {index + 1}. {waypoint.name}
                    </span>
                  </div>
                </button>
              );
            })}

            <div className="absolute bottom-4 right-4 z-20 flex gap-2">
              <Button variant="cyan" size="sm" onClick={handleAddWaypoint}>
                <Plus className="w-4 h-4" />
                Add Pin
              </Button>
              <Button
                variant={showSavedPanel ? 'yellow' : 'yellow-outline'}
                size="sm"
                onClick={() => {
                  setShowSavedPanel(!showSavedPanel);
                  if (!showSavedPanel) setSelectedWaypointId(null);
                }}
              >
                <Bookmark className="w-4 h-4" />
                Saved Waypoints
              </Button>
            </div>

            {quest.waypoints.length === 0 && !showSavedPanel && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="font-bangers text-white/70">No waypoints yet</p>
                  <p className="text-sm text-white/50">
                    Click "Add Pin" or use "Saved Waypoints" from scouting
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Right sidebar ────────────────────────────────────────────── */}
      <div className={showSavedPanel ? 'w-96' : 'w-72'}>
        <Card className="h-full overflow-hidden flex flex-col">
          {showSavedPanel ? (
            /* ── Saved Waypoints panel ─────────────────────────────── */
            <>
              <div className="p-4 border-b border-panel-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-yellow" />
                  <h3 className="font-bangers text-lg text-white">Saved Waypoints</h3>
                  <Badge variant="yellow">{scoutedWaypoints.length}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadScoutedWaypoints()}
                    disabled={isLoadingScoutedWaypoints}
                    title="Refresh from mobile"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isLoadingScoutedWaypoints ? 'animate-spin' : ''}`}
                    />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowSavedPanel(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {!scoutedWaypointsLoaded && isLoadingScoutedWaypoints && (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 text-cyan animate-spin mx-auto mb-2" />
                    <p className="text-sm text-white/50">Loading...</p>
                  </div>
                )}

                {scoutedWaypointsLoaded && scoutedWaypoints.length === 0 && (
                  <div className="text-center py-8">
                    <Bookmark className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="font-bangers text-white/70">No saved waypoints</p>
                    <p className="text-xs text-white/50 mt-1">
                      Use Scout Mode in the mobile app to save locations. Tap the refresh icon
                      above if you just saved one.
                    </p>
                  </div>
                )}

                {/* Photo / video / audio attachments removed from this view
                    on 2026-04-29 (mobile capture is also disabled — see
                    tracker entry F3). The columns still come back from the
                    API; they're just not rendered. */}
                {scoutedWaypoints.map((sw) => {
                  const isExpanded = expandedScoutId === sw.id;

                  return (
                    <Card
                      key={sw.id}
                      className={`transition-all ${isExpanded ? 'border-yellow/50' : ''}`}
                    >
                      {/* Header — always visible */}
                      <button
                        onClick={() => setExpandedScoutId(isExpanded ? null : sw.id)}
                        className="w-full p-3 text-left flex items-start gap-3"
                      >
                        <div className="w-12 h-12 rounded-lg bg-input-bg flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-white/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bangers text-sm text-white truncate">{sw.name}</p>
                          <p className="text-xs text-white/50 mt-0.5">
                            {sw.lat?.toFixed(4)}°, {sw.lng?.toFixed(4)}°
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-3">
                          {sw.notes && (
                            <p className="text-xs text-white/70 leading-relaxed bg-input-bg rounded-md p-2">
                              {sw.notes}
                            </p>
                          )}

                          <p className="text-[10px] text-white/40">
                            Scouted {new Date(sw.createdAt).toLocaleDateString()}
                          </p>

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant="green"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleAddScoutedToQuest(sw)}
                            >
                              <PlusCircle className="w-3 h-3" />
                              Add to Quest
                            </Button>
                            <Button
                              variant="danger-outline"
                              size="sm"
                              onClick={(e) => handleDeleteScouted(sw.id, e)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          ) : selectedWaypoint ? (
            /* ── Edit waypoint panel ───────────────────────────────── */
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-neon-green" />
                <h3 className="font-bangers text-lg text-white">Edit Waypoint</h3>
              </div>

              <Input
                label="Name"
                value={selectedWaypoint.name}
                onChange={(e) => handleUpdateWaypoint('name', e.target.value)}
                placeholder="Location name..."
              />

              <Textarea
                label="Description"
                value={selectedWaypoint.description}
                onChange={(e) => handleUpdateWaypoint('description', e.target.value)}
                placeholder="Describe this location..."
                rows={3}
              />

              <Textarea
                label="Notes"
                value={selectedWaypoint.notes}
                onChange={(e) => handleUpdateWaypoint('notes', e.target.value)}
                placeholder="Writer notes..."
                rows={2}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="0.0001"
                  value={selectedWaypoint.lat}
                  onChange={(e) => handleUpdateWaypoint('lat', parseFloat(e.target.value))}
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="0.0001"
                  value={selectedWaypoint.lng}
                  onChange={(e) => handleUpdateWaypoint('lng', parseFloat(e.target.value))}
                />
              </div>

              <Button
                variant="danger-outline"
                size="sm"
                className="w-full mt-4"
                onClick={handleDeleteWaypoint}
              >
                <Trash2 className="w-4 h-4" />
                Delete Waypoint
              </Button>
            </div>
          ) : (
            /* ── Empty state ───────────────────────────────────────── */
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="font-bangers text-white/70">Select a waypoint pin</p>
                <p className="text-xs text-white/50 mt-1">Click on a pin to edit its details</p>
              </div>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}

export default WaypointEditor;
