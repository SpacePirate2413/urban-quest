import { useState, useRef } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Textarea } from '../../components/ui';
import { useWriterStore } from '../../store/useWriterStore';

export function WaypointEditor({ questId }) {
  const { quests, addWaypoint, updateWaypoint, deleteWaypoint } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  const [selectedWaypointId, setSelectedWaypointId] = useState(null);
  const mapRef = useRef(null);

  if (!quest) return null;

  const selectedWaypoint = quest.waypoints.find(wp => wp.id === selectedWaypointId);

  const handleAddWaypoint = () => {
    addWaypoint(questId, {});
  };

  const handleMapClick = (e) => {
    if (!mapRef.current) return;
    
    // Don't create waypoint if clicking on an existing pin or button
    if (e.target.closest('button')) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Convert percentage position to lat/lng (reverse of display formula)
    // Display formula: x = ((lng + 74.1) * 500) % 80 + 10
    // Display formula: y = ((lat - 40.7) * 500) % 70 + 15
    // We'll use a simpler direct mapping for the prototype
    const lng = -74.0060 + (x - 50) * 0.002;
    const lat = 40.7128 + (50 - y) * 0.002;
    
    const newWaypoint = addWaypoint(questId, { lat, lng });
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

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">
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
                  onClick={() => setSelectedWaypointId(waypoint.id)}
                  className={`
                    absolute transform -translate-x-1/2 -translate-y-full
                    transition-all duration-200
                    ${isSelected ? 'scale-130 z-10' : 'hover:scale-110'}
                  `}
                  style={{ 
                    left: `${x}%`, 
                    top: `${y}%`,
                  }}
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

            <Button
              variant="cyan"
              size="sm"
              className="absolute bottom-4 right-4 z-20"
              onClick={handleAddWaypoint}
            >
              <Plus className="w-4 h-4" />
              Add Pin
            </Button>

            {quest.waypoints.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="font-bangers text-white/70">No waypoints yet</p>
                  <p className="text-sm text-white/50">Click "Add Pin" to create your first location</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="w-72">
        <Card className="h-full">
          {selectedWaypoint ? (
            <div className="p-4 space-y-4">
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
