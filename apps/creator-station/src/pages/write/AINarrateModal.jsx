import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Headphones,
  Pause,
  Play,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Modal } from '../../components/ui';
import { ttsService } from '../../services/ttsService';
import { NARRATOR_VOICES, useWriterStore } from '../../store/useWriterStore';

// Default voice-tuning sliders. Hidden behind an "Advanced" disclosure per
// Q7b — most creators just want to pick a voice and hit go.
const DEFAULT_VOICE_CONTROLS = {
  exaggeration: 0.5,
  cfg_weight: 0.5,
  temperature: 0.8,
};

export function AINarrateModal({ isOpen, onClose, questId, sceneId, onMediaGenerated }) {
  const { quests, updateScene, updateQuest } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  const scene = quest?.scenes.find(s => s.id === sceneId);

  const [chatterboxVoices, setChatterboxVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [voiceControls, setVoiceControls] = useState(DEFAULT_VOICE_CONTROLS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState(null);
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  const previewAudioRef = useRef(null);
  const generatedAudioRef = useRef(null);
  const [isPlayingGenerated, setIsPlayingGenerated] = useState(false);

  // Merge our metadata catalog with the live list from chatterbox. Entries
  // from chatterbox are authoritative for "is this voice usable right now?";
  // the catalog provides display name / description / color.
  const voiceList = useMemo(() => {
    const liveIds = new Set(chatterboxVoices.map((v) => v.name));
    const catalogById = new Map(NARRATOR_VOICES.map((v) => [v.id, v]));

    // Catalog entries that ARE registered in chatterbox come first, in
    // catalog order so the personality lineup is consistent.
    const known = NARRATOR_VOICES.filter((v) => liveIds.has(v.id)).map((v) => ({
      ...v,
      ready: true,
    }));

    // Voices registered in chatterbox but missing from the catalog still
    // show up — useful when the team uploads ad-hoc voices.
    const adHoc = chatterboxVoices
      .filter((v) => !catalogById.has(v.name))
      .map((v) => ({
        id: v.name,
        name: v.name,
        style: '',
        description: 'Custom voice',
        color: '#94a3b8',
        ready: true,
      }));

    // Catalog entries that haven't been uploaded yet are shown as
    // "Coming soon" so the personality lineup is visible but not pickable.
    const pending = NARRATOR_VOICES.filter((v) => !liveIds.has(v.id)).map((v) => ({
      ...v,
      ready: false,
    }));

    return [...known, ...adHoc, ...pending];
  }, [chatterboxVoices]);

  // Load voices when the modal opens and reset selection.
  useEffect(() => {
    if (!isOpen) return;
    setVoicesLoading(true);
    setVoicesError(null);
    ttsService
      .listVoices()
      .then((voices) => {
        setChatterboxVoices(voices);
      })
      .catch((err) => {
        setVoicesError(err.message);
      })
      .finally(() => setVoicesLoading(false));
  }, [isOpen]);

  // Pre-select scene voice → quest voice → first ready voice once the list
  // is loaded.
  useEffect(() => {
    if (!isOpen) return;
    const ready = voiceList.filter((v) => v.ready);
    if (ready.length === 0) {
      setSelectedVoiceId(null);
      return;
    }
    const fallback = ready[0].id;
    const desired = scene?.narratorVoiceId || quest?.narratorVoiceId;
    setSelectedVoiceId(desired && ready.some((v) => v.id === desired) ? desired : fallback);
  }, [isOpen, voiceList, scene?.narratorVoiceId, quest?.narratorVoiceId]);

  // Tear down audio on close.
  useEffect(() => {
    if (isOpen) return;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (generatedAudioRef.current) {
      generatedAudioRef.current.pause();
      generatedAudioRef.current = null;
    }
    setPreviewingVoiceId(null);
    setIsPlayingGenerated(false);
    setGenerationError(null);
    if (generatedUrl) {
      URL.revokeObjectURL(generatedUrl);
    }
    setGeneratedBlob(null);
    setGeneratedUrl(null);
    setShowAdvanced(false);
    setVoiceControls(DEFAULT_VOICE_CONTROLS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handlePreview = (voiceId) => {
    if (previewingVoiceId === voiceId) {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      setPreviewingVoiceId(null);
      return;
    }
    previewAudioRef.current?.pause();
    const url = ttsService.voicePreviewUrl(voiceId);
    if (!url) return;
    const audio = new Audio(url);
    audio.onended = () => setPreviewingVoiceId(null);
    audio.onerror = () => setPreviewingVoiceId(null);
    audio.play().catch(() => setPreviewingVoiceId(null));
    previewAudioRef.current = audio;
    setPreviewingVoiceId(voiceId);
  };

  const handleGenerate = async () => {
    if (!scene?.script?.trim() || !selectedVoiceId || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    if (generatedUrl) {
      URL.revokeObjectURL(generatedUrl);
      setGeneratedUrl(null);
      setGeneratedBlob(null);
    }
    try {
      const blob = await ttsService.generateScript(
        scene.script,
        selectedVoiceId,
        voiceControls,
      );
      const url = URL.createObjectURL(blob);
      setGeneratedBlob(blob);
      setGeneratedUrl(url);
    } catch (err) {
      setGenerationError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayGenerated = () => {
    if (!generatedUrl) return;
    if (isPlayingGenerated) {
      generatedAudioRef.current?.pause();
      setIsPlayingGenerated(false);
      return;
    }
    if (!generatedAudioRef.current) {
      generatedAudioRef.current = new Audio(generatedUrl);
      generatedAudioRef.current.onended = () => setIsPlayingGenerated(false);
    }
    generatedAudioRef.current.play();
    setIsPlayingGenerated(true);
  };

  const handleAttachToScene = () => {
    if (!generatedBlob || !generatedUrl || !selectedVoiceId) return;
    // Wrap the blob as a File so the existing media-upload flow
    // (CreateTab.handleUploadMedia → /quests/scenes/:id/upload as multipart)
    // accepts it without modification.
    const file = new File(
      [generatedBlob],
      `scene_${sceneId}_ai_narration.wav`,
      { type: generatedBlob.type || 'audio/wav' },
    );

    // Stamp the chosen voice on the scene + quest so subsequent scenes
    // pre-select the same narrator (Q1c hybrid scope).
    updateScene(questId, sceneId, { narratorVoiceId: selectedVoiceId });
    if (quest && quest.narratorVoiceId !== selectedVoiceId) {
      updateQuest(questId, { narratorVoiceId: selectedVoiceId });
    }

    onMediaGenerated(sceneId, {
      file,
      name: file.name,
      size: file.size,
      type: 'audio',
      mimeType: file.type,
      localUrl: generatedUrl, // hand off ownership to CreateTab so we don't revoke it on close
      isGenerated: true,
      pending: true,
    });
    // Don't revoke generatedUrl on close — CreateTab now owns it.
    setGeneratedUrl(null);
    setGeneratedBlob(null);
    onClose();
  };

  const ready = !!selectedVoiceId;
  const noVoicesUploaded = !voicesLoading && voiceList.every((v) => !v.ready);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Narration" className="max-w-3xl">
      <div className="space-y-4">
        {/* Voice picker */}
        <div>
          <p className="font-bangers text-xs uppercase tracking-wider text-white/70 mb-3">
            Choose a narrator
          </p>

          {voicesError ? (
            <Card className="p-4 border-hot-pink/40 bg-hot-pink/10">
              <p className="flex items-center gap-2 text-sm text-hot-pink">
                <AlertCircle className="w-4 h-4" /> Could not reach Chatterbox: {voicesError}
              </p>
              <p className="text-xs text-white/60 mt-2">
                Start the Chatterbox TTS server and reopen this modal.
              </p>
            </Card>
          ) : voicesLoading ? (
            <div className="text-center py-6">
              <RefreshCw className="w-6 h-6 text-cyan animate-spin mx-auto mb-2" />
              <p className="text-sm text-white/60">Loading voice library…</p>
            </div>
          ) : noVoicesUploaded ? (
            <Card className="p-4 border-yellow/40 bg-yellow/10">
              <p className="flex items-center gap-2 text-sm text-yellow font-bangers">
                <AlertCircle className="w-4 h-4" /> No narrator voices uploaded yet
              </p>
              <p className="text-xs text-white/70 mt-2">
                The Chatterbox voice library is empty. Upload one or more voice samples
                (15–30 second clean MP3s) to chatterbox <code className="text-cyan">/v1/voices</code>{' '}
                and reopen this modal. See <code className="text-cyan">docs/Questions-Left.md</code> for
                LibriVox sourcing instructions.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {voiceList.map((voice) => {
                const isSelected = selectedVoiceId === voice.id;
                const isPreviewing = previewingVoiceId === voice.id;
                return (
                  <Card
                    key={voice.id}
                    className={`p-3 cursor-pointer transition-all border-[1.5px] ${
                      isSelected ? 'border-cyan bg-cyan/10' : 'border-panel-border'
                    } ${!voice.ready ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => voice.ready && setSelectedVoiceId(voice.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bangers"
                        style={{
                          backgroundColor: `${voice.color}20`,
                          border: `2px solid ${voice.color}`,
                          color: voice.color,
                        }}
                      >
                        {voice.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="font-bangers text-sm truncate"
                            style={{ color: voice.color }}
                          >
                            {voice.name}
                          </p>
                          {!voice.ready && (
                            <span className="text-[9px] uppercase tracking-wider font-bangers text-white/50 border border-white/20 rounded px-1.5">
                              Coming soon
                            </span>
                          )}
                        </div>
                        {voice.style && (
                          <p className="text-[10px] text-white/60">{voice.style}</p>
                        )}
                        {voice.description && (
                          <p className="text-xs text-white/70 mt-1 line-clamp-2">
                            {voice.description}
                          </p>
                        )}
                      </div>
                      {voice.ready && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(voice.id);
                          }}
                          aria-label={`Preview ${voice.name}`}
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            isPreviewing
                              ? 'bg-cyan text-navy-deep'
                              : 'bg-panel-border text-white hover:text-cyan'
                          }`}
                        >
                          {isPreviewing ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3 ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Advanced controls (collapsed by default) */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white"
          >
            {showAdvanced ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Advanced voice controls
          </button>
          {showAdvanced && (
            <div className="mt-2 space-y-3 p-3 bg-input-bg rounded-lg">
              <SliderRow
                label="Emotion"
                accent="#ffd60a"
                min={0.25}
                max={2}
                step={0.05}
                value={voiceControls.exaggeration}
                onChange={(v) =>
                  setVoiceControls((prev) => ({ ...prev, exaggeration: v }))
                }
              />
              <SliderRow
                label="Pace"
                accent="#00d4ff"
                min={0}
                max={1}
                step={0.05}
                value={voiceControls.cfg_weight}
                onChange={(v) =>
                  setVoiceControls((prev) => ({ ...prev, cfg_weight: v }))
                }
              />
              <SliderRow
                label="Creativity"
                accent="#39ff14"
                min={0.05}
                max={2}
                step={0.05}
                value={voiceControls.temperature}
                onChange={(v) =>
                  setVoiceControls((prev) => ({ ...prev, temperature: v }))
                }
              />
            </div>
          )}
        </div>

        {/* Generate */}
        <Button
          variant="green"
          className="w-full"
          onClick={handleGenerate}
          disabled={!ready || !scene?.script?.trim() || isGenerating || noVoicesUploaded}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating narration…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate Full Narration
            </>
          )}
        </Button>

        {generationError && (
          <Card className="p-3 border-hot-pink/40 bg-hot-pink/10">
            <p className="flex items-center gap-2 text-sm text-hot-pink">
              <AlertCircle className="w-4 h-4" /> {generationError}
            </p>
          </Card>
        )}

        {/* Result */}
        {generatedUrl && !isGenerating && (
          <Card className="p-3 border-cyan/40 bg-cyan/5">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayGenerated}
                className="w-10 h-10 rounded-full bg-cyan text-navy-deep flex items-center justify-center"
                aria-label={isPlayingGenerated ? 'Pause' : 'Play'}
              >
                {isPlayingGenerated ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  Narration ready —{' '}
                  {generatedBlob
                    ? `${(generatedBlob.size / 1024).toFixed(0)} KB`
                    : ''}
                </p>
                <p className="text-xs text-white/60">
                  Preview before attaching, or regenerate if it's not right.
                </p>
              </div>
            </div>
            <Button
              variant="cyan"
              className="w-full mt-3"
              onClick={handleAttachToScene}
            >
              <Headphones className="w-4 h-4" />
              Attach to scene
            </Button>
          </Card>
        )}
      </div>
    </Modal>
  );
}

function SliderRow({ label, accent, min, max, step, value, onChange }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-white/70">{label}</span>
        <span className="font-bangers" style={{ color: accent }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1"
        style={{ accentColor: accent }}
      />
    </div>
  );
}

export default AINarrateModal;
