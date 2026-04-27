import { ImagePlus, Mic, Settings, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Input, Select, Textarea } from '../../components/ui';
import { api } from '../../services/api';
import { GENRES, NARRATOR_VOICES, useWriterStore } from '../../store/useWriterStore';

export function QuestSettings({ questId }) {
  const { quests, updateQuest, deleteQuest, writer } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!quest) return null;

  const selectedVoice = NARRATOR_VOICES.find(v => v.id === quest.narratorVoiceId);

  const fileInputRef = useRef(null);

  const genreOptions = GENRES.map(genre => ({
    value: genre,
    label: genre,
  }));

  const ageRatingOptions = [
    { value: 'E', label: 'E - Everyone' },
    { value: 'E10+', label: 'E10+ - Everyone 10+' },
    { value: 'T', label: 'T - Teen' },
    { value: 'M', label: 'M - Mature 17+' },
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdate('coverImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    handleUpdate('coverImage', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'In Review' },
    { value: 'published', label: 'Published' },
  ];

  const handleUpdate = (field, value) => {
    updateQuest(questId, { [field]: value });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-cyan" />
          <h3 className="font-bangers text-xl text-white">Quest Details</h3>
        </div>

        <div className="space-y-5">
          <Input
            label="Title"
            value={quest.title}
            onChange={(e) => handleUpdate('title', e.target.value)}
            placeholder="Quest title..."
          />

          <Textarea
            label="Description"
            value={quest.description}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="Describe your quest..."
            rows={4}
          />

          <Input
            label="Tagline"
            value={quest.tagline || ''}
            onChange={(e) => handleUpdate('tagline', e.target.value)}
            placeholder="A short catchy tagline..."
            maxLength={100}
          />

          <div>
            <label className="font-bangers text-xs uppercase tracking-wider text-white block mb-2">
              Quest Cover Image
            </label>
            <div className="flex items-start gap-4">
              {quest.coverImage ? (
                <div className="relative group">
                  <img
                    src={quest.coverImage}
                    alt="Quest cover"
                    className="w-32 h-32 object-cover rounded-lg border border-panel-border"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-panel-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-cyan transition-colors"
                >
                  <ImagePlus className="w-8 h-8 text-white/40 mb-2" />
                  <span className="text-xs text-white/50">Upload Image</span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-white/70 mb-2">
                  This image will be displayed on the quest tile and as the background in the app.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {quest.coverImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4" />
                    Change Image
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Genre"
              value={quest.genre}
              onChange={(e) => handleUpdate('genre', e.target.value)}
              options={genreOptions}
            />

            <Select
              label="Age Rating"
              value={quest.ageRating || 'E'}
              onChange={(e) => handleUpdate('ageRating', e.target.value)}
              options={ageRatingOptions}
            />

            <div>
              <Select
                label="Price"
                placeholder=""
                value={String(quest.price ?? 0)}
                onChange={(e) => handleUpdate('price', parseFloat(e.target.value))}
                options={[
                  { value: '0', label: 'Free (ad-supported)' },
                  { value: '0.99', label: '$0.99' },
                  { value: '1.99', label: '$1.99' },
                  { value: '2.99', label: '$2.99' },
                  { value: '4.99', label: '$4.99' },
                  { value: '9.99', label: '$9.99' },
                ]}
              />
              <p className="text-xs text-white/50 mt-1">
                Apple/Google require fixed price tiers. Free quests show ads between scenes; Premium subscribers see no ads.
              </p>
            </div>



            <div>
              <label className="font-bangers text-xs uppercase tracking-wider text-white block mb-1">
                Estimated Duration
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={quest.estimatedDuration || ''}
                  onChange={(e) => handleUpdate('estimatedDuration', parseInt(e.target.value) || null)}
                  placeholder="45"
                  className="w-full bg-input-bg border-[1.5px] border-panel-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan transition-colors"
                />
              </div>
              <p className="text-xs text-white/50 mt-1">
                Time in minutes
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-input-bg rounded-lg border border-panel-border">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-cyan" />
              <div>
                <p className="font-bangers text-sm text-white">Uses AI Audio</p>
                <p className="text-xs text-white/50">Enable AI-generated narration</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {quest.usesAI && (
                <Badge variant="cyan">
                  <Sparkles className="w-3 h-3" />
                  AI
                </Badge>
              )}
              <button
                onClick={() => handleUpdate('usesAI', !quest.usesAI)}
                className={`
                  w-12 h-6 rounded-full transition-all relative
                  ${quest.usesAI ? 'bg-cyan' : 'bg-panel-border'}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                    ${quest.usesAI ? 'left-7' : 'left-1'}
                  `}
                />
              </button>
            </div>
          </div>

          {selectedVoice && (
            <div 
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{ 
                backgroundColor: `${selectedVoice.color}10`,
                border: `1px solid ${selectedVoice.color}40`,
              }}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: `${selectedVoice.color}20`,
                  border: `2px solid ${selectedVoice.color}`,
                }}
              >
                <Mic className="w-4 h-4" style={{ color: selectedVoice.color }} />
              </div>
              <div>
                <p className="text-sm">
                  <span style={{ color: selectedVoice.color }} className="font-bangers">
                    {selectedVoice.name}
                  </span>
                  <span className="text-white/70"> will narrate this quest</span>
                </p>
                <p className="text-xs text-white/50">{selectedVoice.style}</p>
              </div>
            </div>
          )}

          <Select
            label="Status"
            value={quest.status}
            onChange={(e) => handleUpdate('status', e.target.value)}
            options={statusOptions}
          />
        </div>
      </Card>

      <Card className="p-6 border-red-500/30">
        <h3 className="font-bangers text-lg text-red-500 mb-4">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Delete Quest</p>
            <p className="text-xs text-white/50">
              This action cannot be undone. All waypoints and scenes will be deleted.
            </p>
          </div>
          <Button
            variant="danger-outline"
            size="sm"
            disabled={isDeleting}
            onClick={async () => {
              if (!window.confirm('Are you sure you want to delete this quest? This cannot be undone.')) return;
              setIsDeleting(true);
              try {
                await api.deleteQuest(questId);
                deleteQuest(questId);
                navigate('/write');
              } catch (err) {
                console.error('Delete failed:', err);
                alert(`Delete failed: ${err.message}`);
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Quest'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default QuestSettings;
