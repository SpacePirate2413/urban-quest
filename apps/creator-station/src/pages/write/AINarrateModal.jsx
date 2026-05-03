import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Headphones,
  Loader2,
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

// Fixed sample line played by every preview button. Same text across all
// narrators so creators compare voices apples-to-apples (Q3a). ~6 seconds
// when spoken at a natural pace; gives enough material to evaluate tone,
// pitch, cadence.
const PREVIEW_SAMPLE_TEXT =
  'The street stretches ahead, lit by a single gas lamp. Your investigation begins here.';

// Cache key for a generated preview combines the voice and the slider values
// so that changing Emotion / Pace / Creativity invalidates the cache and
// forces a fresh generation.
function controlsCacheKey(voiceId, controls) {
  return `${voiceId}|${controls.exaggeration}|${controls.cfg_weight}|${controls.temperature}`;
}

export function AINarrateModal({ isOpen, onClose, questId, sceneId, onMediaGenerated }) {
  const { quests, updateScene, updateQuest } = useWriterStore();
  const quest = quests.find((q) => q.id === questId);
  const scene = quest?.scenes.find((s) => s.id === sceneId);

  const [chatterboxVoices, setChatterboxVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [voiceControls, setVoiceControls] = useState(DEFAULT_VOICE_CONTROLS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null); // { percent, currentStep, eta }
  const [generatedBlob, setGeneratedBlob] = useState(null);
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [isPlayingGenerated, setIsPlayingGenerated] = useState(false);

  // Cache of generated preview blob URLs keyed by `${voiceId}|sliders`. Lives
  // in a ref so it survives renders without triggering them. Cleared on modal
  // close to free blob URLs.
  const previewCacheRef = useRef(new Map());
  const previewAudioRef = useRef(null);
  const generatedAudioRef = useRef(null);

  const voiceList = useMemo(() => {
    const liveIds = new Set(chatterboxVoices.map((v) => v.name));
    const catalogById = new Map(NARRATOR_VOICES.map((v) => [v.id, v]));

    const known = NARRATOR_VOICES.filter((v) => liveIds.has(v.id)).map((v) => ({
      ...v,
      ready: true,
    }));

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

    const pending = NARRATOR_VOICES.filter((v) => !liveIds.has(v.id)).map((v) => ({
      ...v,
      ready: false,
    }));

    return [...known, ...adHoc, ...pending];
  }, [chatterboxVoices]);

  // Load voice library on open.
  useEffect(() => {
    if (!isOpen) return;
    setVoicesLoading(true);
    setVoicesError(null);
    ttsService
      .listVoices()
      .then((voices) => setChatterboxVoices(voices))
      .catch((err) => setVoicesError(err.message))
      .finally(() => setVoicesLoading(false));
  }, [isOpen]);

  // Pre-select scene voice → quest voice → first ready voice.
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

  // Tear down audio on close + flush preview cache so blob URLs get GC'd.
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
    setPreviewLoadingId(null);
    setIsPlayingGenerated(false);
    setGenerationError(null);
    if (generatedUrl) URL.revokeObjectURL(generatedUrl);
    setGeneratedBlob(null);
    setGeneratedUrl(null);
    setShowAdvanced(false);
    setVoiceControls(DEFAULT_VOICE_CONTROLS);
    // Revoke every cached preview URL.
    for (const url of previewCacheRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    previewCacheRef.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Preview is now a real TTS generation of the fixed sample text. Cached per
  // (voice, slider-state) so repeat clicks are instant. Sliders changing
  // invalidates the cache for that voice — a fresh sample is generated next
  // time the user clicks preview.
  const handlePreview = async (voiceId) => {
    // Toggle off if user clicks the currently-playing voice.
    if (previewingVoiceId === voiceId && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewingVoiceId(null);
      return;
    }
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;

    const cacheKey = controlsCacheKey(voiceId, voiceControls);
    let url = previewCacheRef.current.get(cacheKey);

    if (!url) {
      setPreviewLoadingId(voiceId);
      try {
        const blob = await ttsService.generateScript(
          PREVIEW_SAMPLE_TEXT,
          voiceId,
          voiceControls,
        );
        url = URL.createObjectURL(blob);
        previewCacheRef.current.set(cacheKey, url);
      } catch {
        // Fall back to the raw source clip so the user at least hears the
        // voice's source if TTS is unreachable.
        url = ttsService.voicePreviewUrl(voiceId);
      } finally {
        setPreviewLoadingId(null);
      }
    }

    if (!url) return;
    const audio = new Audio(url);
    audio.onended = () => setPreviewingVoiceId(null);
    audio.onerror = () => {
      console.error('Preview audio failed for voice:', voiceId, audio.error);
      setPreviewingVoiceId(null);
    };

    // Bug fix: previously the first click on a freshly-generated preview
    // would buffer but never play — the user had to click a second time.
    // Root cause: calling play() immediately on a `new Audio(blobUrl)` racing
    // the audio element's own buffering, so the play promise rejected
    // silently and the catch reset state. We now defer the play call until
    // the element reports `canplay` (or fire it immediately if the blob is
    // already buffered, e.g. on a cache hit).
    const startPlay = () => audio.play().catch((err) => {
      console.error('Preview play rejected:', voiceId, err);
      setPreviewingVoiceId(null);
    });
    if (audio.readyState >= 3) {
      startPlay();
    } else {
      audio.addEventListener('canplay', startPlay, { once: true });
      audio.load();
    }

    previewAudioRef.current = audio;
    setPreviewingVoiceId(voiceId);
  };

  const handleGenerate = async () => {
    if (!scene?.script?.trim() || !selectedVoiceId || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    const startedAt = Date.now();
    setGenerationProgress({
      percent: 0,
      currentStep: 'Starting…',
      elapsedSec: 0,
      remainingSec: null,
    });
    if (generatedUrl) {
      URL.revokeObjectURL(generatedUrl);
      setGeneratedUrl(null);
      setGeneratedBlob(null);
    }

    // Poll Chatterbox's /v1/status/progress endpoint at 250ms cadence so the
    // elapsed counter ticks up smoothly and chunk transitions feel snappy.
    // Estimated-remaining is computed locally from elapsed × (100 − percent)
    // ÷ percent once we have a stable percentage to extrapolate from — that
    // gives a self-correcting "~Ns remaining" display that gets tighter as
    // the run progresses.
    //
    // Stale-100% guard: Chatterbox's /progress endpoint can return the
    // *previous* run's completed state on the very first poll before it has
    // registered our new request. Without guards, the bar would snap to 100%
    // and stay there for the entire actual generation. We:
    //   1. Ignore any percent ≥ 95% during the first 1.5s of elapsed time —
    //      that's almost certainly the previous run leaking through.
    //   2. Never display 100% from polling; only the success branch below
    //      flips the bar to 100 once the blob actually arrives.
    //   3. Clamp the percent to be monotonically non-decreasing so any later
    //      stale reads can't jerk the bar backward.
    let cancelled = false;
    let lastShownPercent = 0;
    (async () => {
      while (!cancelled) {
        const progress = await ttsService.getProgress();
        if (cancelled) return;
        const elapsedMs = Date.now() - startedAt;
        const elapsedSec = elapsedMs / 1000;

        if (progress?.is_processing) {
          let percent = Math.max(0, Math.min(100, progress.progress_percentage ?? 0));
          if (elapsedMs < 1500 && percent >= 95) {
            // Likely stale data from the previous run — wait for the next
            // tick to confirm before showing anything high.
            percent = lastShownPercent;
          }
          // Cap at 95 while polling so the only path to 100 is real completion.
          percent = Math.min(95, percent);
          // Monotonically non-decreasing — resist any tick that would scrub
          // the bar backward.
          percent = Math.max(lastShownPercent, percent);
          lastShownPercent = percent;

          let remainingSec = null;
          if (percent >= 5 && percent < 95) {
            remainingSec = (elapsedMs / percent) * (100 - percent) / 1000;
          }
          setGenerationProgress({
            percent,
            currentStep: progress.current_step || 'Synthesizing audio…',
            currentChunk: progress.current_chunk,
            totalChunks: progress.total_chunks,
            elapsedSec,
            remainingSec,
          });
        } else {
          // Chatterbox hasn't started reporting yet (queueing / model
          // warmup) — keep the elapsed timer visible so the user sees
          // *something* moving.
          setGenerationProgress((prev) => ({
            ...(prev || { percent: 0, currentStep: 'Starting…' }),
            elapsedSec,
            remainingSec: null,
          }));
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    })();

    try {
      const blob = await ttsService.generateScript(
        scene.script,
        selectedVoiceId,
        voiceControls,
      );
      // Snap the bar to 100% on real completion — the polling loop is
      // capped at 95 to avoid stale-data false positives, so this is the
      // only place that ever shows a fully-filled bar.
      setGenerationProgress((prev) => ({
        ...(prev || { percent: 100, currentStep: 'Done' }),
        percent: 100,
        currentStep: 'Done',
        elapsedSec: (Date.now() - startedAt) / 1000,
        remainingSec: 0,
      }));
      const url = URL.createObjectURL(blob);
      setGeneratedBlob(blob);
      setGeneratedUrl(url);
    } catch (err) {
      setGenerationError(err.message || 'Generation failed.');
    } finally {
      cancelled = true;
      setIsGenerating(false);
      setGenerationProgress(null);
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
    const file = new File(
      [generatedBlob],
      `scene_${sceneId}_ai_narration.wav`,
      { type: generatedBlob.type || 'audio/wav' },
    );

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
      localUrl: generatedUrl,
      isGenerated: true,
      pending: true,
    });
    setGeneratedUrl(null);
    setGeneratedBlob(null);
    onClose();
  };

  const noVoicesUploaded = !voicesLoading && voiceList.every((v) => !v.ready);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Narration" className="max-w-3xl">
      <div className="space-y-4">
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
                Upload voice samples to chatterbox <code className="text-cyan">/v1/voices</code>{' '}
                and reopen this modal.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {voiceList.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  isSelected={selectedVoiceId === voice.id}
                  isPreviewing={previewingVoiceId === voice.id}
                  isPreviewLoading={previewLoadingId === voice.id}
                  onSelect={() => voice.ready && setSelectedVoiceId(voice.id)}
                  onPreview={() => handlePreview(voice.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced voice controls
          </button>
          {showAdvanced && (
            <div className="mt-2 space-y-3 p-3 bg-input-bg rounded-lg">
              <p className="text-[10px] text-white/50">
                Changes here apply to both the preview and the full generation. Click a voice's
                preview button after adjusting to hear the new values.
              </p>
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

        <Button
          variant="green"
          className="w-full"
          onClick={handleGenerate}
          disabled={
            !selectedVoiceId || !scene?.script?.trim() || isGenerating || noVoicesUploaded
          }
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

        {isGenerating && generationProgress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-white/70">
              <span className="truncate pr-2">
                {generationProgress.currentStep}
                {generationProgress.totalChunks > 1 && (
                  <span className="text-white/40 ml-1">
                    ({generationProgress.currentChunk}/{generationProgress.totalChunks})
                  </span>
                )}
              </span>
              <span className="font-bangers text-cyan flex-shrink-0">
                {Math.round(generationProgress.percent)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-input-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, generationProgress.percent))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/50">
              <span>{formatSeconds(generationProgress.elapsedSec)} elapsed</span>
              <span>
                {generationProgress.remainingSec != null
                  ? `~${formatSeconds(generationProgress.remainingSec)} remaining`
                  : 'Estimating…'}
              </span>
            </div>
          </div>
        )}

        {generationError && (
          <Card className="p-3 border-hot-pink/40 bg-hot-pink/10">
            <p className="flex items-center gap-2 text-sm text-hot-pink">
              <AlertCircle className="w-4 h-4" /> {generationError}
            </p>
          </Card>
        )}

        {generatedUrl && !isGenerating && (
          <Card className="p-3 border-cyan/40 bg-cyan/5">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayGenerated}
                className="w-10 h-10 rounded-full bg-cyan text-navy-deep flex items-center justify-center"
                aria-label={isPlayingGenerated ? 'Pause' : 'Play'}
              >
                {isPlayingGenerated ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  Narration ready —{' '}
                  {generatedBlob ? `${(generatedBlob.size / 1024).toFixed(0)} KB` : ''}
                </p>
                <p className="text-xs text-white/60">
                  Preview before attaching, or regenerate if it's not right.
                </p>
              </div>
            </div>
            <Button variant="cyan" className="w-full mt-3" onClick={handleAttachToScene}>
              <Headphones className="w-4 h-4" />
              Attach to scene
            </Button>
          </Card>
        )}
      </div>
    </Modal>
  );
}

// Plain button — sidesteps the `<Card>` component's hardcoded
// `border-panel-border` base class which was beating our `border-cyan`
// override in CSS source order, making the selected state invisible.
function VoiceCard({ voice, isSelected, isPreviewing, isPreviewLoading, onSelect, onPreview }) {
  const disabled = !voice.ready;
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-label={`Select ${voice.name}`}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        'p-3 rounded-panel transition-all flex items-start gap-3 text-left',
        'border-[2px]',
        isSelected
          ? 'border-cyan bg-cyan/15 ring-2 ring-cyan/40'
          : 'border-panel-border bg-panel hover:border-white/30',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
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
          <p className="font-bangers text-sm truncate" style={{ color: voice.color }}>
            {voice.name}
          </p>
          {isSelected && (
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bangers text-cyan border border-cyan rounded px-1.5">
              <Check className="w-3 h-3" />
              Selected
            </span>
          )}
          {!voice.ready && (
            <span className="text-[9px] uppercase tracking-wider font-bangers text-white/50 border border-white/20 rounded px-1.5">
              Coming soon
            </span>
          )}
        </div>
        {voice.style && <p className="text-[10px] text-white/60">{voice.style}</p>}
        {voice.description && (
          <p className="text-xs text-white/70 mt-1 line-clamp-2">{voice.description}</p>
        )}
      </div>
      {voice.ready && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          aria-label={`Preview ${voice.name}`}
          className={[
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
            isPreviewing
              ? 'bg-cyan text-navy-deep'
              : 'bg-panel-border text-white hover:text-cyan',
          ].join(' ')}
        >
          {isPreviewLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isPreviewing ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3 ml-0.5" />
          )}
        </button>
      )}
    </div>
  );
}

// Format seconds for the elapsed/remaining display. Sub-minute values stay
// in seconds ("8s"); past 60s we use "Xm Ys" so 90 seconds shows as "1m 30s"
// rather than "90s". Negative or NaN inputs render as "—".
function formatSeconds(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '—';
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
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
