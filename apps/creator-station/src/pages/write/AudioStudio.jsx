import {
    AlertTriangle,
    Check,
    CheckCircle,
    Clock,
    FileAudio,
    FileVideo,
    Headphones,
    Mic,
    Pause,
    Play,
    RefreshCw,
    Rocket,
    Send,
    Settings,
    Trash2,
    Upload,
    Volume2,
    Wand2,
    XCircle
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Badge, Button, Card, Select } from '../../components/ui';
import { api } from '../../services/api';
import { ttsService } from '../../services/ttsService';
import { NARRATOR_VOICES, useWriterStore } from '../../store/useWriterStore';

export function AudioStudio({ questId }) {
  const { quests, updateQuest, updateScene } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [parsedLines, setParsedLines] = useState([]);
  const [genderFilter, setGenderFilter] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [playingLineIndex, setPlayingLineIndex] = useState(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);
  const [audioMode, setAudioMode] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [voiceControls, setVoiceControls] = useState({
    exaggeration: 0.5,
    cfg_weight: 0.5,
    temperature: 0.8,
  });

  const audioRef = useRef(null);
  const previewAudioRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedScene = quest?.scenes.find(s => s.id === selectedSceneId);
  const selectedVoice = NARRATOR_VOICES.find(v => v.id === quest?.narratorVoiceId);

  const sceneOptions = quest?.scenes.map((scene, index) => ({
    value: scene.id,
    label: `Scene ${index + 1}`,
  })) || [];

  const filteredVoices = NARRATOR_VOICES.filter(voice => 
    genderFilter === 'all' || voice.gender === genderFilter
  );

  const handleSceneSelect = (sceneId) => {
    setSelectedSceneId(sceneId);
    setUploadedFile(null);
    const scene = quest?.scenes.find(s => s.id === sceneId);
    if (scene?.script) {
      const lines = parseScript(scene.script);
      setParsedLines(lines);
    } else {
      setParsedLines([]);
    }
    if (scene?.mediaFile) {
      setUploadedFile({
        name: scene.mediaFile,
        type: scene.mediaType,
        status: scene.mediaStatus,
      });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    if (!isVideo && !isAudio) {
      alert('Please upload an audio or video file');
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    setUploadedFile({
      name: file.name,
      size: formatFileSize(file.size),
      type: isVideo ? 'video' : 'audio',
      url: fileUrl,
      file: file,
      status: null,
    });
  };

  const handleRemoveFile = () => {
    if (uploadedFile?.url) {
      URL.revokeObjectURL(uploadedFile.url);
    }
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadMedia = async () => {
    if (!uploadedFile?.file || !selectedSceneId) return;
    
    setIsSubmitting(true);
    
    try {
      let sceneId = selectedSceneId;

      // If the scene has a local-only ID, sync it to the DB first
      if (sceneId.startsWith('scene-')) {
        const scene = quest?.scenes.find(s => s.id === sceneId);
        const created = await api.addScene(questId, {
          script: scene?.script || '(no script)',
          question: scene?.question || undefined,
          choices: scene?.choices ? JSON.stringify(scene.choices) : undefined,
          waypointId: scene?.waypointId || undefined,
        });
        // Update local store with the real DB id
        updateScene(questId, sceneId, { id: created.id });
        sceneId = created.id;
        setSelectedSceneId(sceneId);
      }

      // Upload real file to API (no submission status yet)
      const result = await api.uploadSceneMedia(sceneId, uploadedFile.file);
      
      // Update local scene state with the returned media info
      updateScene(questId, sceneId, {
        mediaFile: result.fileName,
        mediaUrl: result.mediaUrl,
        mediaType: result.mediaType,
      });
      
      setUploadedFile(prev => ({ ...prev, status: 'uploaded', mediaUrl: result.mediaUrl }));
    } catch (err) {
      console.error('Upload failed:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allScenesHaveMedia = quest?.scenes.length > 0 && quest.scenes.every(s => s.mediaUrl);

  const handleSubmitQuestForReview = async () => {
    if (!allScenesHaveMedia) return;
    setIsSubmitting(true);
    try {
      await api.submitQuest(questId);
      // Update all scenes locally to pending
      quest.scenes.forEach(s => {
        updateScene(questId, s.id, { mediaStatus: 'pending' });
      });
      updateQuest(questId, { submissionStatus: 'pending' });
    } catch (err) {
      console.error('Submit quest failed:', err);
      alert(`Submit failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishQuest = async () => {
    setIsPublishing(true);
    try {
      await api.publishQuest(questId);
      updateQuest(questId, { status: 'published', submissionStatus: 'approved' });
    } catch (err) {
      console.error('Publish failed:', err);
      alert(`Publish failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleVoiceSelect = (voiceId) => {
    updateQuest(questId, { narratorVoiceId: voiceId });
  };

  const handlePreviewVoice = async (voiceId) => {
    if (previewingVoiceId === voiceId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voiceId);
    
    try {
      const blob = await ttsService.previewVoice(voiceId);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.play();
      audio.onended = () => {
        setPreviewingVoiceId(null);
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Preview failed:', error);
      setPreviewingVoiceId(null);
    }
  };

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
          return {
            ...line,
            audioUrl: result.url,
            duration: result.duration,
            generated: true,
          };
        }
        return line;
      });

      setParsedLines(newParsedLines);

      if (results.length > 0) {
        const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
        setUploadedFile({
          name: `scene_${selectedSceneId}_generated.wav`,
          size: 'AI Generated',
          type: 'audio',
          url: results[0].url,
          status: null,
          duration: `${Math.floor(totalDuration / 60)}:${String(Math.floor(totalDuration % 60)).padStart(2, '0')}`,
          isGenerated: true,
        });
      }

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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(line.audioUrl);
      audioRef.current = audio;
      audio.play();
      setPlayingLineIndex(index);
      audio.onended = () => setPlayingLineIndex(null);
    }
  };

  const handleExportAll = () => {
    alert('Export functionality would download all generated audio files as a ZIP.');
  };

  if (!quest) return null;

  const statusBadge = {
    uploaded: { variant: 'cyan', icon: CheckCircle, text: 'Uploaded' },
    pending: { variant: 'yellow', icon: Clock, text: 'Pending Review' },
    needs_re_review: { variant: 'orange', icon: AlertTriangle, text: 'Needs Re-Review' },
    approved: { variant: 'green', icon: CheckCircle, text: 'Approved' },
    rejected: { variant: 'pink', icon: XCircle, text: 'Rejected' },
  };

  const scenesUploaded = quest?.scenes.filter(s => s.mediaUrl).length || 0;
  const totalScenes = quest?.scenes.length || 0;
  const questSubmissionStatus = quest?.submissionStatus;

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Headphones className="w-6 h-6 text-hot-pink" />
            <h3 className="font-bangers text-xl text-white">Scene Audio/Video</h3>
          </div>
        </div>

        <Select
          value={selectedSceneId || ''}
          onChange={(e) => handleSceneSelect(e.target.value)}
          options={sceneOptions}
          placeholder="Select a scene..."
        />

        {selectedSceneId && (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setAudioMode('upload')}
                className={`flex-1 py-2 px-4 rounded-lg font-bangers text-sm uppercase transition-all flex items-center justify-center gap-2 ${
                  audioMode === 'upload'
                    ? 'bg-cyan text-navy-deep'
                    : 'bg-panel-border text-white hover:bg-panel-border/80'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                onClick={() => setAudioMode('generate')}
                className={`flex-1 py-2 px-4 rounded-lg font-bangers text-sm uppercase transition-all flex items-center justify-center gap-2 ${
                  audioMode === 'generate'
                    ? 'bg-purple text-white'
                    : 'bg-panel-border text-white hover:bg-panel-border/80'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                AI Narrator
              </button>
            </div>

            <Card className="p-4">
              <h4 className="font-bangers text-sm text-white mb-3">Scene Media File</h4>
              
              {!uploadedFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-panel-border rounded-lg p-8 text-center cursor-pointer hover:border-cyan/50 transition-colors"
                >
                  <Upload className="w-10 h-10 text-white/30 mx-auto mb-3" />
                  <p className="font-bangers text-white/70">Drop audio or video file here</p>
                  <p className="text-xs text-white/50 mt-1">MP3, WAV, MP4, MOV supported</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="bg-input-bg rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      uploadedFile.type === 'video' ? 'bg-purple/20' : 'bg-cyan/20'
                    }`}>
                      {uploadedFile.type === 'video' ? (
                        <FileVideo className="w-6 h-6 text-purple" />
                      ) : (
                        <FileAudio className="w-6 h-6 text-cyan" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bangers text-sm text-white truncate">{uploadedFile.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-white/50">{uploadedFile.size}</span>
                        {uploadedFile.duration && (
                          <span className="text-xs text-white/50">{uploadedFile.duration}</span>
                        )}
                        {uploadedFile.isGenerated && (
                          <Badge variant="purple" className="text-[9px]">AI Generated</Badge>
                        )}
                      </div>
                      {uploadedFile.status && statusBadge[uploadedFile.status] && (
                        <div className="mt-2">
                          <Badge variant={statusBadge[uploadedFile.status].variant}>
                            {React.createElement(statusBadge[uploadedFile.status].icon, { className: 'w-3 h-3' })}
                            {statusBadge[uploadedFile.status].text}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {!uploadedFile.status && (
                      <button
                        onClick={handleRemoveFile}
                        className="p-2 text-white/50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {uploadedFile.url && uploadedFile.file && uploadedFile.status !== 'uploaded' && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="cyan"
                        className="flex-1"
                        onClick={handleUploadMedia}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Media
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {audioMode === 'generate' && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {parsedLines.map((line, index) => {
                  const isPlaying = playingLineIndex === index;
                  
                  return (
                    <Card 
                      key={index}
                      className={`p-4 transition-all ${
                        isPlaying ? 'border-cyan bg-cyan/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="font-courier text-sm text-white leading-relaxed">
                            {line.text}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {line.generated && (
                            <button
                              onClick={() => handlePlayLine(index)}
                              className={`
                                w-10 h-10 rounded-full flex items-center justify-center
                                transition-all
                                ${isPlaying 
                                  ? 'bg-cyan text-navy-deep' 
                                  : 'bg-panel-border text-white hover:text-cyan'
                                }
                              `}
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4 ml-0.5" />
                              )}
                            </button>
                          )}

                          {line.duration && (
                            <span className="text-xs text-white/70 font-courier w-12 text-right">
                              {line.duration.toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {parsedLines.length === 0 && (
                  <div className="text-center py-8">
                    <Headphones className="w-10 h-10 text-white/20 mx-auto mb-2" />
                    <p className="text-sm text-white/50">Add script content to generate audio</p>
                  </div>
                )}
              </div>
            )}

            {audioMode === 'upload' && !uploadedFile && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Upload className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="font-bangers text-white/70">Upload your own narration</p>
                  <p className="text-sm text-white/50 mt-1">
                    Record audio or video outside the app and upload it here
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedSceneId && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Headphones className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="font-bangers text-lg text-white/70">Select a scene</p>
              <p className="text-sm text-white/50 mt-1">
                Choose a scene to upload or generate audio
              </p>
            </div>
          </div>
        )}

        {totalScenes > 0 && (
          <Card className="p-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-orange" />
                <h4 className="font-bangers text-sm text-white">Submit Quest for Review</h4>
              </div>
              <span className="text-xs text-white/50 font-bangers">
                {scenesUploaded}/{totalScenes} scenes uploaded
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {quest.scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className={`rounded-lg px-3 py-2 text-xs font-bangers flex items-center gap-2 ${
                    scene.mediaUrl
                      ? scene.mediaStatus === 'pending'
                        ? 'bg-yellow/10 text-yellow border border-yellow/30'
                        : scene.mediaStatus === 'approved'
                        ? 'bg-neon-green/10 text-neon-green border border-neon-green/30'
                        : scene.mediaStatus === 'rejected'
                        ? 'bg-hot-pink/10 text-hot-pink border border-hot-pink/30'
                        : 'bg-cyan/10 text-cyan border border-cyan/30'
                      : 'bg-panel-border text-white/50'
                  }`}
                >
                  {scene.mediaUrl ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  Scene {idx + 1}
                </div>
              ))}
            </div>

            {questSubmissionStatus && statusBadge[questSubmissionStatus] && (
              <div className="mb-3">
                <Badge variant={statusBadge[questSubmissionStatus].variant}>
                  {React.createElement(statusBadge[questSubmissionStatus].icon, { className: 'w-3 h-3' })}
                  Quest {statusBadge[questSubmissionStatus].text}
                </Badge>
              </div>
            )}

            {(!questSubmissionStatus || questSubmissionStatus === 'rejected' || questSubmissionStatus === 'needs_re_review') && (
              <Button
                variant="green"
                className="w-full"
                onClick={handleSubmitQuestForReview}
                disabled={!allScenesHaveMedia || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {(questSubmissionStatus === 'rejected' || questSubmissionStatus === 'needs_re_review')
                      ? 'Resubmit All Scenes'
                      : 'Submit All Scenes for Review'}
                  </>
                )}
              </Button>
            )}

            {!allScenesHaveMedia && !questSubmissionStatus && (
              <p className="text-xs text-white/50 mt-2 text-center">
                Upload media for all scenes before submitting
              </p>
            )}
          </Card>
        )}

        {questSubmissionStatus === 'approved' && quest?.status !== 'published' && (
          <Card className="p-4 mt-2 border-neon-green/30 bg-neon-green/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <p className="font-bangers text-sm text-neon-green">Quest Approved!</p>
                <p className="text-xs text-white/60">Your quest has been approved by admin. Ready to publish?</p>
              </div>
            </div>
            <Button
              variant="green"
              className="w-full"
              onClick={handlePublishQuest}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Publish Quest
                </>
              )}
            </Button>
          </Card>
        )}
      </div>

      <div className="w-80 flex flex-col gap-4">
        <Card className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-panel-border">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-5 h-5 text-purple" />
              <h4 className="font-bangers text-sm text-white">Choose Narrator Voice</h4>
            </div>
            
            <div className="flex gap-2">
              {['all', 'male', 'female'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setGenderFilter(filter)}
                  className={`
                    px-3 py-1 rounded-full text-xs font-bangers uppercase
                    transition-all
                    ${genderFilter === filter
                      ? 'bg-purple text-white'
                      : 'bg-panel-border text-white hover:bg-panel-border/80'
                    }
                  `}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredVoices.map((voice) => {
              const isSelected = quest.narratorVoiceId === voice.id;
              const isPreviewing = previewingVoiceId === voice.id;
              
              return (
                <div
                  key={voice.id}
                  className={`
                    p-3 rounded-lg transition-all cursor-pointer
                    ${isSelected 
                      ? 'bg-panel-border border-2' 
                      : 'hover:bg-panel-border/50 border-2 border-transparent'
                    }
                  `}
                  style={{ borderColor: isSelected ? voice.color : 'transparent' }}
                  onClick={() => handleVoiceSelect(voice.id)}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: `${voice.color}20`,
                        border: `2px solid ${voice.color}`,
                      }}
                    >
                      {isSelected ? (
                        <Check className="w-4 h-4" style={{ color: voice.color }} />
                      ) : (
                        <Mic className="w-4 h-4" style={{ color: voice.color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p 
                          className="font-bangers text-sm"
                          style={{ color: voice.color }}
                        >
                          {voice.name}
                        </p>
                        {isSelected && (
                          <Badge variant="green" className="text-[9px]">Selected</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-white/70">
                        {voice.style} · {voice.age} {voice.gender}
                      </p>
                      <p className="text-[10px] text-white/50 mt-1 line-clamp-2">
                        {voice.description}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(voice.id);
                      }}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        transition-all
                        ${isPreviewing 
                          ? 'bg-hot-pink text-white' 
                          : 'bg-panel text-white/70 hover:text-white'
                        }
                      `}
                    >
                      {isPreviewing ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Volume2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-cyan" />
            <h4 className="font-bangers text-xs text-white">Voice Controls</h4>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-white/70">Emotion</span>
                <span className="text-yellow font-bangers">{voiceControls.exaggeration.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.05"
                value={voiceControls.exaggeration}
                onChange={(e) => setVoiceControls(prev => ({ 
                  ...prev, 
                  exaggeration: parseFloat(e.target.value) 
                }))}
                className="w-full h-1"
                style={{ accentColor: '#ffd60a' }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-white/70">Pace</span>
                <span className="text-cyan font-bangers">{voiceControls.cfg_weight.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={voiceControls.cfg_weight}
                onChange={(e) => setVoiceControls(prev => ({ 
                  ...prev, 
                  cfg_weight: parseFloat(e.target.value) 
                }))}
                className="w-full h-1"
                style={{ accentColor: '#00d4ff' }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-white/70">Creativity</span>
                <span className="text-neon-green font-bangers">{voiceControls.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="2"
                step="0.05"
                value={voiceControls.temperature}
                onChange={(e) => setVoiceControls(prev => ({ 
                  ...prev, 
                  temperature: parseFloat(e.target.value) 
                }))}
                className="w-full h-1"
                style={{ accentColor: '#39ff14' }}
              />
            </div>
          </div>
        </Card>

        <Button
          variant="green"
          className="w-full py-3"
          onClick={handleGenerate}
          disabled={isGenerating || parsedLines.length === 0 || !quest?.narratorVoiceId}
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

        <Card className="p-3 bg-hot-pink/10 border-hot-pink/30">
          <p className="font-bangers text-xs text-hot-pink mb-1">
            Powered by Chatterbox TTS
          </p>
          <p className="text-[10px] text-white/70 leading-relaxed">
            POST /v1/audio/speech · Voice cloning · Emotion & pace control · Auto text chunking
          </p>
        </Card>
      </div>
    </div>
  );
}

function parseScript(script) {
  const lines = [];
  const paragraphs = script.split(/\n\n+/).filter(p => p.trim());
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed) {
      lines.push({
        text: trimmed,
        generated: false,
        audioUrl: null,
        duration: null,
      });
    }
  }
  
  return lines;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default AudioStudio;
