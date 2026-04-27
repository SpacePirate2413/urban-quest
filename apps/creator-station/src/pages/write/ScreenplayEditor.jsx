import { useState } from 'react';
import { Film, Plus, Trash2, PlusCircle } from 'lucide-react';
import { Button, Card, Select, Textarea, Input } from '../../components/ui';
import { useWriterStore } from '../../store/useWriterStore';

export function ScreenplayEditor({ questId }) {
  const { quests, addScene, updateScene, deleteScene } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  const [selectedSceneId, setSelectedSceneId] = useState(null);

  if (!quest) return null;

  const selectedScene = quest.scenes.find(s => s.id === selectedSceneId);

  const waypointOptions = quest.waypoints.map(wp => ({
    value: wp.id,
    label: wp.name,
  }));

  const handleAddScene = () => {
    const newSceneId = `scene-${Date.now()}`;
    addScene(questId, { id: newSceneId });
    setSelectedSceneId(newSceneId);
  };

  const handleUpdateScene = (field, value) => {
    if (selectedSceneId) {
      updateScene(questId, selectedSceneId, { [field]: value });
    }
  };

  const handleDeleteScene = () => {
    if (selectedSceneId) {
      deleteScene(questId, selectedSceneId);
      setSelectedSceneId(null);
    }
  };

  const handleAddChoice = () => {
    if (selectedScene) {
      const newChoices = [
        ...selectedScene.choices,
        { text: '', waypointId: quest.waypoints[0]?.id || null },
      ];
      handleUpdateScene('choices', newChoices);
    }
  };

  const handleUpdateChoice = (index, field, value) => {
    if (selectedScene) {
      const newChoices = selectedScene.choices.map((choice, i) =>
        i === index ? { ...choice, [field]: value } : choice
      );
      handleUpdateScene('choices', newChoices);
    }
  };

  const handleRemoveChoice = (index) => {
    if (selectedScene) {
      const newChoices = selectedScene.choices.filter((_, i) => i !== index);
      handleUpdateScene('choices', newChoices);
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">
      <div className="w-52 flex flex-col gap-4">
        <Button variant="yellow" onClick={handleAddScene} className="w-full">
          <Plus className="w-4 h-4" />
          New Scene
        </Button>

        <div className="flex-1 overflow-y-auto space-y-2">
          {quest.scenes.map((scene, index) => {
            const waypoint = quest.waypoints.find(wp => wp.id === scene.waypointId);
            const isSelected = scene.id === selectedSceneId;
            
            return (
              <Card
                key={scene.id}
                hover
                onClick={() => setSelectedSceneId(scene.id)}
                className={`p-3 cursor-pointer transition-all ${
                  isSelected ? 'border-yellow ring-1 ring-yellow/50' : ''
                }`}
              >
                <p className="font-bangers text-sm text-white">
                  Scene {index + 1}
                </p>
                <p className="text-xs text-white/70 truncate mt-1">
                  {waypoint?.name || 'No waypoint'}
                </p>
              </Card>
            );
          })}

          {quest.scenes.length === 0 && (
            <div className="text-center py-8">
              <Film className="w-10 h-10 text-white/20 mx-auto mb-2" />
              <p className="text-xs text-white/50">No scenes yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Card className="min-h-full">
          {selectedScene ? (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-yellow" />
                  <h3 className="font-bangers text-xl text-white">
                    Scene {quest.scenes.findIndex(s => s.id === selectedSceneId) + 1}
                  </h3>
                </div>
                <Button
                  variant="danger-outline"
                  size="sm"
                  onClick={handleDeleteScene}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Select
                label="Location (Waypoint)"
                value={selectedScene.waypointId || ''}
                onChange={(e) => handleUpdateScene('waypointId', e.target.value)}
                options={waypointOptions}
                placeholder="Select waypoint..."
              />

              <div>
                <label className="font-bangers text-xs uppercase tracking-wider text-white block mb-2">
                  Narrative Script
                </label>
                <textarea
                  value={selectedScene.script}
                  onChange={(e) => handleUpdateScene('script', e.target.value)}
                  placeholder={`Write your narrative here...

The narrator will read this text aloud to guide the player through the scene.

Use vivid descriptions to set the mood and atmosphere. Include dialogue in quotes if needed.`}
                  rows={14}
                  className="w-full bg-input-bg border-[1.5px] border-panel-border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan transition-colors resize-none font-courier leading-7"
                />
              </div>

              <Input
                label="Question / Decision Prompt"
                value={selectedScene.question}
                onChange={(e) => handleUpdateScene('question', e.target.value)}
                placeholder="What will you do next?"
              />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-bangers text-xs uppercase tracking-wider text-white">
                    Choices
                  </label>
                  <Button variant="cyan-outline" size="sm" onClick={handleAddChoice}>
                    <PlusCircle className="w-3 h-3" />
                    Add Choice
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedScene.choices.map((choice, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <Input
                          value={choice.text}
                          onChange={(e) => handleUpdateChoice(index, 'text', e.target.value)}
                          placeholder={`Choice ${index + 1} text...`}
                        />
                      </div>
                      <div className="w-40">
                        <Select
                          value={choice.waypointId || ''}
                          onChange={(e) => handleUpdateChoice(index, 'waypointId', e.target.value)}
                          options={waypointOptions}
                          placeholder="→ Waypoint"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChoice(index)}
                        className="mt-1"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}

                  {selectedScene.choices.length === 0 && (
                    <p className="text-sm text-white/50 text-center py-4">
                      No choices yet. Add choices to create branching paths.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center p-6">
              <div className="text-center">
                <Film className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="font-bangers text-lg text-white/70">Select a scene</p>
                <p className="text-sm text-white/50 mt-1">
                  Choose a scene from the list or create a new one
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ScreenplayEditor;
