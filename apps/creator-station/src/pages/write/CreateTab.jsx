import {
    AlertCircle,
    Check,
    Eye,
    FileAudio,
    FileVideo,
    Film,
    Loader2,
    Plus,
    PlusCircle,
    RefreshCw,
    Send,
    Trash2,
    Upload,
    Wand2,
    X
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Button, Card, Input, Modal, Select } from '../../components/ui';
import { api } from '../../services/api';
import { useWriterStore } from '../../store/useWriterStore';
import { AINarrateModal } from './AINarrateModal';
import { SaveButton } from './SaveButton';

function SaveIndicator({ sceneId }) {
  const state = useWriterStore((s) => s.sceneSaveState[sceneId]);
  if (!state || state.status === 'idle') return null;
  if (state.status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-xs text-white/60">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (state.status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-neon-green">
        <Check className="w-3 h-3" /> Saved
      </span>
    );
  }
  if (state.status === 'error') {
    return (
      <span
        className="flex items-center gap-1 text-xs text-hot-pink"
        title={state.error}
      >
        <AlertCircle className="w-3 h-3" /> Save failed
      </span>
    );
  }
  return null;
}

export function CreateTab({ questId }) {
  const { quests, addScene, updateScene, deleteScene, flushSceneSave } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [pendingMedia, setPendingMedia] = useState({});
  const [showAINarrate, setShowAINarrate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewModal, setPreviewModal] = useState(null);
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);

  if (!quest) return null;

  const selectedScene = quest.scenes.find(s => s.id === selectedSceneId);

  // Choice-destination dropdown: lists every *scene* in the quest so the
  // creator can branch to a specific scene even when two scenes share a
  // waypoint, plus the END sentinel that the mobile player treats as
  // "quest finished, prompt for review". Sentinel must match END_SCENE_ID
  // in apps/api/src/features/quests/quests.service.ts.
  const sceneDestinationOptions = [
    ...quest.scenes.map((s, i) => {
      const wp = quest.waypoints.find((w) => w.id === s.waypointId);
      const wpName = wp?.name || 'no location';
      return { value: s.id, label: `Scene ${i + 1} \u2014 ${wpName}` };
    }),
    { value: '__END__', label: '\uD83C\uDFC1 End Quest' },
  ];

  // Get media for a scene: pending local file OR already-uploaded server file
  const getSceneMedia = (sceneId) => {
    if (pendingMedia[sceneId]) return { ...pendingMedia[sceneId], pending: true };
    const scene = quest.scenes.find(s => s.id === sceneId);
    if (scene?.mediaUrl) {
      return { name: scene.mediaFile, type: scene.mediaType, url: scene.mediaUrl, pending: false };
    }
    return null;
  };

  const currentMedia = selectedSceneId ? getSceneMedia(selectedSceneId) : null;
  const hasMedia = !!currentMedia;

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleAddScene = () => {
    const newSceneId = `scene-${Date.now()}`;
    addScene(questId, { id: newSceneId });
    setSelectedSceneId(newSceneId);
  };

  const handleDeleteScene = () => {
    if (!selectedSceneId) return;
    if (pendingMedia[selectedSceneId]?.localUrl) {
      URL.revokeObjectURL(pendingMedia[selectedSceneId].localUrl);
    }
    setPendingMedia(prev => {
      const next = { ...prev };
      delete next[selectedSceneId];
      return next;
    });
    deleteScene(questId, selectedSceneId);
    setSelectedSceneId(null);
  };

  const handleUploadClick = (sceneId, e) => {
    e?.stopPropagation();
    uploadTargetRef.current = sceneId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    const targetSceneId = uploadTargetRef.current;
    if (!file || !targetSceneId) return;

    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    if (!isVideo && !isAudio) {
      alert('Please upload an audio or video file');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPendingMedia(prev => ({
      ...prev,
      [targetSceneId]: {
        file,
        name: file.name,
        size: formatFileSize(file.size),
        type: isVideo ? 'video' : 'audio',
        localUrl,
      },
    }));
    fileInputRef.current.value = '';
  };

  const handleRemoveMedia = (sceneId) => {
    if (pendingMedia[sceneId]?.localUrl) {
      URL.revokeObjectURL(pendingMedia[sceneId].localUrl);
    }
    setPendingMedia(prev => {
      const next = { ...prev };
      delete next[sceneId];
      return next;
    });
    updateScene(questId, sceneId, { mediaFile: null, mediaUrl: null, mediaType: null });
  };

  const handleUploadMedia = async (sceneId, pendingArg) => {
    // Optional `pendingArg` lets callers (e.g. the AI Narrate modal's
    // auto-upload after Attach) hand the freshly-staged media in directly,
    // avoiding the React-state-batching window where pendingMedia[sceneId]
    // hasn't yet been written when the upload fires.
    const pending = pendingArg ?? pendingMedia[sceneId];
    if (!pending?.file) return;

    setIsUploading(true);
    try {
      let dbSceneId = sceneId;

      // Sync local-only scene to DB first
      if (sceneId.startsWith('scene-')) {
        const scene = quest.scenes.find(s => s.id === sceneId);
        const created = await api.addScene(questId, {
          script: scene?.script || '(no script)',
          question: scene?.question || undefined,
          choices: scene?.choices ? JSON.stringify(scene.choices) : undefined,
          waypointId: scene?.waypointId || undefined,
        });
        updateScene(questId, sceneId, { id: created.id });
        dbSceneId = created.id;
        setSelectedSceneId(dbSceneId);
      }

      const result = await api.uploadSceneMedia(dbSceneId, pending.file);
      updateScene(questId, dbSceneId, {
        mediaFile: result.fileName,
        mediaUrl: result.mediaUrl,
        mediaType: result.mediaType,
      });

      URL.revokeObjectURL(pending.localUrl);
      setPendingMedia(prev => {
        const next = { ...prev };
        delete next[sceneId];
        return next;
      });
    } catch (err) {
      console.error('Upload failed:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateScene = (field, value) => {
    if (selectedSceneId) {
      updateScene(questId, selectedSceneId, { [field]: value });
    }
  };

  const handleAddChoice = () => {
    if (!selectedScene) return;
    // Default the destination to the END sentinel — clearest intent for the
    // creator to override, and never picks the wrong scene by accident.
    const newChoices = [
      ...selectedScene.choices,
      { text: '', sceneId: '__END__' },
    ];
    handleUpdateScene('choices', newChoices);
  };

  const handleUpdateChoice = (index, field, value) => {
    if (!selectedScene) return;
    const newChoices = selectedScene.choices.map((c, i) => {
      if (i !== index) return c;
      // When setting the destination, drop any legacy `waypointId` so we
      // store the new shape only. Other fields (e.g. `text`) merge as-is.
      if (field === 'sceneId') {
        const { waypointId: _legacy, ...rest } = c;
        return { ...rest, sceneId: value };
      }
      return { ...c, [field]: value };
    });
    handleUpdateScene('choices', newChoices);
  };

  const handleRemoveChoice = (index) => {
    if (!selectedScene) return;
    handleUpdateScene('choices', selectedScene.choices.filter((_, i) => i !== index));
  };

  // Submission validation lives in QuestEditor now (via questValidation.js)
  // because the floating ValidationPanel needs to persist across tab
  // switches. The Submit-for-Review button also moved up to the QuestEditor
  // header so it's reachable from any tab.

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Hidden file input shared across all scene upload buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <div className="w-56 flex flex-col gap-3">
        <Button variant="yellow" onClick={handleAddScene} className="w-full">
          <Plus className="w-4 h-4" />
          New Scene
        </Button>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {quest.scenes.map((scene, index) => {
            const waypoint = quest.waypoints.find(wp => wp.id === scene.waypointId);
            const isSelected = scene.id === selectedSceneId;
            const media = getSceneMedia(scene.id);
            const reviewState = sceneReviewState(scene);

            return (
              <Card
                key={scene.id}
                hover
                onClick={() => setSelectedSceneId(scene.id)}
                className={`p-3 cursor-pointer transition-all ${
                  isSelected ? 'border-yellow ring-1 ring-yellow/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-bangers text-sm text-white">Scene {index + 1}</p>
                    <p className="text-xs text-white/70 truncate mt-0.5">
                      {waypoint?.name || 'No waypoint'}
                    </p>
                  </div>
                  {media && (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        media.type === 'video' ? 'bg-purple/20' : 'bg-cyan/20'
                      }`}
                    >
                      {media.type === 'video' ? (
                        <FileVideo className="w-3 h-3 text-purple" />
                      ) : (
                        <FileAudio className="w-3 h-3 text-cyan" />
                      )}
                    </div>
                  )}
                </div>

                {reviewState && (
                  <div
                    className={`mt-2 rounded-md border-[1.5px] px-2 py-1.5 text-xs ${reviewState.boxClass}`}
                  >
                    <p className={`font-bangers uppercase tracking-wider text-[10px] ${reviewState.labelClass}`}>
                      {reviewState.label}
                    </p>
                    {scene.reviewNotes && (
                      <p className={`mt-0.5 leading-snug whitespace-pre-wrap ${reviewState.notesClass}`}>
                        {scene.reviewNotes}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={(e) => handleUploadClick(scene.id, e)}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bangers uppercase bg-panel-border/50 text-white/70 hover:bg-cyan/20 hover:text-cyan transition-all"
                >
                  <Upload className="w-3 h-3" />
                  {media ? 'Replace' : 'Upload'}
                </button>
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

        {/* Submission status */}
        {quest.submissionStatus && (
          <Badge
            variant={
              quest.submissionStatus === 'pending'
                ? 'yellow'
                : quest.submissionStatus === 'needs_re_review'
                  ? 'orange'
                  : quest.submissionStatus === 'approved'
                    ? 'green'
                    : 'pink'
            }
            className="w-full justify-center"
          >
            {quest.submissionStatus === 'pending' && 'Pending Review'}
            {quest.submissionStatus === 'needs_re_review' && 'Needs Re-Review'}
            {quest.submissionStatus === 'approved' && 'Approved'}
            {quest.submissionStatus === 'rejected' && 'Rejected'}
          </Badge>
        )}
        {/* Submit-for-Review button moved up to the QuestEditor header on
             2026-05-01 so it's visible from any tab; the floating
             ValidationPanel surfaces submission errors. */}
      </div>

      {/* ── Main panel ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <Card className="min-h-full">
          {selectedScene ? (
            <div className="p-6 space-y-5">
              {/* Scene header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-yellow" />
                  <h3 className="font-bangers text-xl text-white">
                    Scene {quest.scenes.findIndex(s => s.id === selectedSceneId) + 1}
                  </h3>
                  {hasMedia && (
                    <Badge variant={currentMedia.pending ? 'yellow' : 'cyan'} className="text-[9px]">
                      {currentMedia.pending ? 'Media pending upload' : 'Media uploaded'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <SaveIndicator sceneId={selectedSceneId} />
                  <SaveButton
                    onSave={async () => {
                      // Force any pending debounced save to land right
                      // now. If nothing is pending, fall back to a direct
                      // re-write of the scene's editable fields so the
                      // creator still gets confirmation it's persisted.
                      if (selectedSceneId.startsWith('scene-')) return;
                      await flushSceneSave(selectedSceneId);
                      await api.updateScene(selectedSceneId, {
                        script: selectedScene.script || '',
                        question: selectedScene.question || '',
                        choices: JSON.stringify(selectedScene.choices || []),
                        waypointId: selectedScene.waypointId || undefined,
                      });
                    }}
                  />
                  <Button variant="danger-outline" size="sm" onClick={handleDeleteScene}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Waypoint selector — multiple scenes can share a waypoint
                   (revisits with different content), so all waypoints stay
                   selectable. Choice destinations point at scenes, not
                   waypoints, so there's no ambiguity at playback. */}
              <Select
                label="Location (Waypoint)"
                value={selectedScene.waypointId || ''}
                onChange={(e) => handleUpdateScene('waypointId', e.target.value)}
                options={quest.waypoints.map(wp => ({ value: wp.id, label: wp.name }))}
                placeholder="Select waypoint..."
              />

              {/* Media preview card */}
              {currentMedia && (
                <div className="bg-input-bg rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        currentMedia.type === 'video' ? 'bg-purple/20' : 'bg-cyan/20'
                      }`}
                    >
                      {currentMedia.type === 'video' ? (
                        <FileVideo className="w-6 h-6 text-purple" />
                      ) : (
                        <FileAudio className="w-6 h-6 text-cyan" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bangers text-sm text-white truncate">{currentMedia.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {currentMedia.size && (
                          <span className="text-xs text-white/50">{currentMedia.size}</span>
                        )}
                        {currentMedia.duration && (
                          <span className="text-xs text-white/50">{currentMedia.duration}</span>
                        )}
                        {currentMedia.isGenerated && (
                          <Badge variant="purple" className="text-[9px]">AI Generated</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(currentMedia.localUrl || currentMedia.url) && (
                        <button
                          onClick={() => setPreviewModal(currentMedia)}
                          className="p-2 text-cyan hover:text-cyan/80 transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMedia(selectedSceneId)}
                        className="p-2 text-white/50 hover:text-red-500 transition-colors"
                        title="Remove media"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Upload-to-server button for pending local files */}
                  {currentMedia.pending && currentMedia.file && (
                    <div className="mt-3">
                      <Button
                        variant="cyan"
                        className="w-full"
                        onClick={() => handleUploadMedia(selectedSceneId)}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload to Server
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Narrative Script — greyed out when media is attached */}
              <div className={hasMedia ? 'opacity-40' : ''}>
                <label className="font-bangers text-xs uppercase tracking-wider text-white block mb-2">
                  Narrative Script
                </label>
                <textarea
                  value={selectedScene.script}
                  onChange={(e) => handleUpdateScene('script', e.target.value)}
                  disabled={hasMedia}
                  placeholder={`Write your narrative here...\n\nThe narrator will read this text aloud to guide the player through the scene.\n\nUse vivid descriptions to set the mood and atmosphere. Include dialogue in quotes if needed.`}
                  rows={5}
                  className="w-full bg-input-bg border-[1.5px] border-panel-border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan transition-colors resize-none font-courier leading-7 disabled:cursor-not-allowed"
                />
                {hasMedia && (
                  <p className="text-xs text-white/40 mt-1">
                    Script is locked while media is attached. Remove media to edit.
                  </p>
                )}
              </div>

              {/* Question — always active */}
              <Input
                label="Question / Decision Prompt"
                value={selectedScene.question}
                onChange={(e) => handleUpdateScene('question', e.target.value)}
                placeholder="What will you do next?"
              />

              {/* Choices — always active */}
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
                      <div className="w-56">
                        <Select
                          value={choice.sceneId || choice.waypointId || ''}
                          onChange={(e) => handleUpdateChoice(index, 'sceneId', e.target.value)}
                          options={sceneDestinationOptions}
                          placeholder="\u2192 Destination"
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

              {/* AI Narrate button */}
              <Button
                variant="purple-outline"
                className="w-full"
                onClick={() => setShowAINarrate(true)}
                disabled={!selectedScene.script?.trim()}
              >
                <Wand2 className="w-4 h-4" />
                AI Narrate This Scene
              </Button>
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

      {/* ── Media Preview Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={!!previewModal}
        onClose={() => setPreviewModal(null)}
        title="Scene Preview"
        className="max-w-2xl"
      >
        {previewModal && (
          <div className="flex justify-center">
            {previewModal.type === 'video' ? (
              <video
                src={previewModal.localUrl || previewModal.url}
                controls
                className="max-w-full max-h-[60vh] rounded-lg"
              />
            ) : (
              <div className="w-full">
                <div className="flex items-center justify-center py-8">
                  <div className="w-20 h-20 rounded-full bg-cyan/20 flex items-center justify-center">
                    <FileAudio className="w-10 h-10 text-cyan" />
                  </div>
                </div>
                <audio
                  src={previewModal.localUrl || previewModal.url}
                  controls
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── AI Narrate Modal ─────────────────────────────────────────── */}
      <AINarrateModal
        isOpen={showAINarrate}
        onClose={() => setShowAINarrate(false)}
        questId={questId}
        sceneId={selectedSceneId}
        onMediaGenerated={async (sceneId, mediaData) => {
          setPendingMedia((prev) => ({ ...prev, [sceneId]: mediaData }));
          setShowAINarrate(false);
          // Auto-upload AI-generated media. Manual uploads still need an
          // explicit Upload-to-Server click (the user is mid-decision-making
          // about a file they just picked), but for AI narration there's
          // nothing left to decide — they pressed "Attach to scene", they
          // want it on the server.
          if (mediaData.isGenerated) {
            await handleUploadMedia(sceneId, mediaData);
          }
        }}
      />
    </div>
  );
}

// Computes the review-status badge to render under each scene card. Returns
// null when the scene hasn't been reviewed yet (no badge), so creators
// see a clean editor when starting fresh.
function sceneReviewState(scene) {
  if (scene.mediaStatus === 'approved') {
    return {
      label: 'Approved',
      boxClass: 'bg-neon-green/10 border-neon-green/40',
      labelClass: 'text-neon-green',
      notesClass: 'text-neon-green/80',
    };
  }
  if (scene.mediaStatus === 'rejected') {
    return {
      label: 'Changes requested',
      boxClass: 'bg-hot-pink/10 border-hot-pink/40',
      labelClass: 'text-hot-pink',
      notesClass: 'text-hot-pink/80',
    };
  }
  return null;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default CreateTab;
