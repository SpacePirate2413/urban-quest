import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import {
    Bookmark,
    ChevronRight,
    Loader2,
    Locate,
    MapPin,
    Plus,
    PlusCircle,
    RefreshCw,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Badge, Button, Card, Input, Textarea } from '../../components/ui';
import { useWriterStore } from '../../store/useWriterStore';

// Leaflet ships its marker icons as relative URLs that don't survive Vite's
// bundler. Re-point them at the imported asset URLs once when this module
// first loads. Lives here (not in main.jsx) so the leaflet import is lazy —
// /admin never has to load it.
if (typeof L?.Icon?.Default?.prototype === 'object') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
}

// Reasonable fallback when we have no GPS, no waypoints, and no search yet.
const DEFAULT_CENTER = [39.5, -98.35]; // continental US center
const DEFAULT_ZOOM = 4;

/**
 * Hits OpenStreetMap's Nominatim geocoder. Free, no API key, but the public
 * endpoint asks for a 1-req/sec ceiling and a real User-Agent. Fine for a
 * dev/creator tool. If we ever ship this to high-volume users we'll want to
 * proxy through our own API or swap to a paid provider.
 */
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const hit = data[0];
  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    label: hit.display_name,
  };
}

// Captures clicks on the map and forwards them to a handler. Has to live
// inside a MapContainer because react-leaflet's hooks need the map context.
function ClickToDrop({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Imperatively flies the map to a target the parent passes in. Used for
// search results and the "Show on map" button on saved waypoints.
function FlyToController({ flyTarget }) {
  const map = useMap();
  useEffect(() => {
    if (flyTarget) {
      map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom ?? 13, { duration: 0.6 });
    }
  }, [flyTarget, map]);
  return null;
}

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

  // Search bar state.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // The parent tells the map "go here" by mutating this object. The
  // FlyToController child reacts to the change and animates the camera.
  const [flyTarget, setFlyTarget] = useState(null);

  // Refetch every time the saved-waypoints panel is opened so updates from
  // the mobile app appear without a page reload. The previous gate
  // (scoutedWaypointsLoaded) cached the first response forever.
  useEffect(() => {
    if (showSavedPanel) {
      loadScoutedWaypoints();
    }
  }, [showSavedPanel, loadScoutedWaypoints]);

  // Auto-locate on mount via the browser geolocation API. One-shot — we
  // don't keep tracking, the creator just wants the map centered near them
  // when they land on this tab. Falls back silently if the user denies.
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        // Only fly to the user's location if they don't already have
        // waypoints — otherwise the existing waypoints' bounds win.
        const wpCount = quests.find((q) => q.id === questId)?.waypoints.length ?? 0;
        if (wpCount === 0) {
          setFlyTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 13 });
        }
      },
      () => {
        // Permission denied / timeout — leave the default region.
      },
      { timeout: 6000, maximumAge: 60_000 },
    );
    return () => {
      cancelled = true;
    };
    // Only run on mount; questId is stable for the lifetime of this editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial center: bounds of existing waypoints if any, else the default.
  // The map is only rendered once with this; FlyToController takes over after.
  const initialView = useMemo(() => {
    if (!quest || quest.waypoints.length === 0) {
      return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
    }
    const lats = quest.waypoints.map((w) => w.lat).filter(Number.isFinite);
    const lngs = quest.waypoints.map((w) => w.lng).filter(Number.isFinite);
    if (!lats.length) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    return { center: [lat, lng], zoom: 13 };
    // The map is initialized only once; we don't want to re-mount it just
    // because waypoints changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!quest) return null;

  const selectedWaypoint = quest.waypoints.find(wp => wp.id === selectedWaypointId);

  const handleAddWaypoint = () => {
    // Drop a pin at the map's current center. Better than the random-jiggle
    // fallback — the creator's center-of-attention is the real intent.
    const map = mapRef.current;
    if (map) {
      const c = map.getCenter();
      addWaypoint(questId, { lat: c.lat, lng: c.lng });
    } else {
      addWaypoint(questId, {});
    }
  };

  const handleMapClick = ({ lat, lng }) => {
    // Click-to-drop. Real coordinates straight from the leaflet event — no
    // more cartoon NYC offset math.
    addWaypoint(questId, { lat, lng });
  };

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchBusy(true);
    setSearchError(null);
    try {
      const hit = await geocode(q);
      if (!hit) {
        setSearchError(`No results for "${q}".`);
        return;
      }
      setFlyTarget({ lat: hit.lat, lng: hit.lng, zoom: 13 });
    } catch (err) {
      setSearchError(err?.message ?? 'Search failed.');
    } finally {
      setSearchBusy(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setSearchError('Browser location not available.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setFlyTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 13 }),
      (err) => setSearchError(err.message || 'Could not get your location.'),
      { timeout: 6000, maximumAge: 60_000 },
    );
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
      <div className="flex-1 relative flex flex-col gap-3">
        {/* Search bar — type any place, geocode via Nominatim, fly the map. */}
        <form onSubmit={handleSearch} className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a city, address, or landmark…"
              className="w-full bg-input-bg border-[1.5px] border-panel-border rounded-lg pl-9 pr-9 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchError(null);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button type="submit" variant="cyan" size="sm" disabled={searchBusy || !searchQuery.trim()}>
            {searchBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleLocateMe} title="Center on my location">
            <Locate className="w-4 h-4" />
          </Button>
        </form>
        {searchError && <p className="text-xs text-hot-pink -mt-1">{searchError}</p>}

        <Card className="flex-1 overflow-hidden relative">
          <MapContainer
            center={initialView.center}
            zoom={initialView.zoom}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <ClickToDrop onMapClick={handleMapClick} />
            <FlyToController flyTarget={flyTarget} />

            {quest.waypoints.map((waypoint, index) => {
              if (!Number.isFinite(waypoint.lat) || !Number.isFinite(waypoint.lng)) return null;
              const isSelected = waypoint.id === selectedWaypointId;
              return (
                <Marker
                  key={waypoint.id}
                  position={[waypoint.lat, waypoint.lng]}
                  eventHandlers={{
                    click: () => {
                      setSelectedWaypointId(waypoint.id);
                      setShowSavedPanel(false);
                    },
                  }}
                >
                  <Popup>
                    <strong>{index + 1}. {waypoint.name || 'Untitled'}</strong>
                    {isSelected && <div className="text-xs">Currently editing</div>}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating overlay buttons — sit above the map. */}
          <div className="absolute bottom-4 right-4 z-[400] flex gap-2">
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-input-bg/90 border-[1.5px] border-panel-border rounded-md px-3 py-1.5 pointer-events-none">
              <p className="text-xs text-white/70">
                Click anywhere on the map to drop a pin
              </p>
            </div>
          )}
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
