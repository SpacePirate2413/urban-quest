import {
  Headphones,
  Pause,
  Play,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Modal } from '../../components/ui';
import { ttsService } from '../../services/ttsService';
import { useWriterStore } from '../../store/useWriterStore';

export function AINarrateModal({ isOpen, onClose, questId, sceneId, onMediaGenerated }) {
  const { quests } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  const scene = quest?.scenes.find(s => s.id === sceneId);

  const [parsedLines, setParsedLines] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [playingLineIndex, setPlayingLineIndex] = useState(null);
  const [generatedResults, setGeneratedResults] = useState(null);
  const [voiceControls, setVoiceControls] = useState({
    exaggeration: 0.5,
    cfg_weight: 0.5,
    temperature: 0.8,
  });

  const audioRef = useRef(null);

  useEffect(() => {
    if (isOpen && scene?.script) {
      setParsedLines(parseScript(scene.script));
      setGeneratedResults(null);
      setPlayingLineIndex(null);
    } else if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingLineIndex(null);
    }
  }, [isOpen, scene?.script]);

  const handleGenerate = async () => {
    if (parsedLines.length === 0 || !quest?.narratorVoiceId) return;

    setIsGenerating(true);
    setGenerateProgress(0);

    const linesToGenerate = parsedLines.map((line, index) => ({
      text: line.text,
      options: voiceControls,
      lineIndex: index,
    }));

    try {
      const results = await ttsService.generateScene(linesToGenerate, quest.narratorVoiceId, (progress) => {
        setGenerateProgress(progress.percent);
      });

      const newParsedLines = parsedLines.map((line, index) => {
        const result = results.find(r => r.lineIndex === index);
        if (result) {
          return { ...line, audioUrl: result.url, duration: result.duration, generated: true };
        }
        return line;
      });

      setParsedLines(newParsedLines);
      setGeneratedResults(results);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
      setGenerateProgress(0);
    }
  };

  const handlePlayLine = (index) => {
    const line = parsedLines[index];
    if (!line.audioUrl) return;

    if (playingLineIndex === index) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingLineIndex(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(line.audioUrl);
      audioRef.current = audio;
      audio.play();
      setPlayingLineIndex(index);
      audio.onended = () => setPlayingLineIndex(null);
    }
  };

  const handleUseAsMedia = () => {
    if (!generatedResults || generatedResults.length === 0) return;
    const totalDuration = generatedResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    onMediaGenerated(sceneId, {
      name: `scene_${sceneId}_ai_narration.wav`,
      size: 'AI Generated',
      type: 'audio',
      localUrl: generatedResults[0].url,
      isGenerated: true,
      duration: `${Math.floor(totalDuration / 60)}:${String(Math.floor(totalDuration % 60)).padStart(2, '0')}`,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Narration" className="max-w-2xl">
      {!quest?.narratorVoiceId ? (
        <div className="text-center py-8">
          <Headphones className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="font-bangers text-white/70">No narrator voice selected</p>
          <p className="text-sm text-white/50 mt-1">Set a narrator voice in Quest Info first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Voice controls */}
          <div className="space-y-3 p-3 bg-input-bg rounded-lg">
            <p className="font-bangers text-xs uppercase tracking-wider text-white/70">Voice Controls</p>
            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-white/70">Emotion</span>
                <span className="text-yellow font-bangers">{voiceControls.exaggeration.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.25" max="2" step="0.05"
                value={voiceControls.exaggeration}
                onChange={(e) => setVoiceControls(prev => ({ ...prev, exaggeration: parseFloat(e.target.value) }))}
                className="w-full h-1" style={{ accentColor: '#ffd60a' }}
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-white/70">Pace</span>
                <span className="text-cyan font-bangers">{voiceControls.cfg_weight.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05"
                value={voiceControls.cfg_weight}
                onChange={(e) => setVoiceControls(prev => ({ ...prev, cfg_weight: parseFloat(e.target.value) }))}
                className="w-full h-1" style={{ accentColor: '#00d4ff' }}
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-white/70">Creativity</span>
                <span className="text-neon-green font-bangers">{voiceControls.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.05" max="2" step="0.05"
                value={voiceControls.temperature}
                onChange={(e) => setVoiceControls(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full h-1" style={{ accentColor: '#39ff14' }}
              />
            </div>
          </div>

          {/* Parsed lines */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {parsedLines.map((line, index) => {
              const isPlaying = playingLineIndex === index;
              return (
                <Card key={index} className={`p-3 transition-all ${isPlaying ? 'border-cyan bg-cyan/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <p className="flex-1 font-courier text-sm text-white leading-relaxed">{line.text}</p>
                    {line.generated && (
                      <button
                        onClick={() => handlePlayLine(index)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          isPlaying ? 'bg-cyan text-navy-deep' : 'bg-panel-border text-white hover:text-cyan'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                      </button>
                    )}
                    {line.duration && (
                      <span className="text-xs text-white/70 font-courier w-10 text-right flex-shrink-0">
                        {line.duration.toFixed(1)}s
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
            {parsedLines.length === 0 && (
              <div className="text-center py-4">
                <Headphones className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/50">No script content to generate</p>
              </div>
            )}
          </div>

          {/* Generate button */}
          <Button
            variant="green"
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || parsedLines.length === 0}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating {generateProgress}%
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate {parsedLines.length} Lines
              </>
            )}
          </Button>

          {/* Use as scene media */}
          {generatedResults && generatedResults.length > 0 && (
            <Button variant="cyan" className="w-full" onClick={handleUseAsMedia}>
              Use as Scene Media
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

function parseScript(script) {
  const lines = [];
  const paragraphs = script.split(/\n\n+/).filter(p => p.trim());
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed) {
      lines.push({ text: trimmed, generated: false, audioUrl: null, duration: null });
    }
  }
  return lines;
}

export default AINarrateModal;
