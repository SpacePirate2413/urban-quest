import { ArrowLeft, CircleCheckBig, Film, MapPin, Rocket, Settings, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { api } from '../../services/api';
import { useWriterStore } from '../../store/useWriterStore';
import { CreateTab } from './CreateTab';
import { QuestReviews } from './QuestReviews';
import { QuestSettings } from './QuestSettings';
import { WaypointEditor } from './WaypointEditor';

export function QuestEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quests, setActiveQuest, activeQuestId, loadQuests } = useWriterStore();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const quest = quests.find(q => q.id === id);

  useEffect(() => {
    if (id && id !== activeQuestId) {
      setActiveQuest(id);
    }
  }, [id, activeQuestId, setActiveQuest]);

  if (!quest) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <p className="font-bangers text-xl text-white/70 mb-4">Quest not found</p>
          <Button variant="cyan" onClick={() => navigate('/write')}>
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isApproved = quest.submissionStatus === 'approved' && quest.status !== 'published';

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await api.publishQuest(quest.id);
      await loadQuests();
    } catch (err) {
      alert(`Publish failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="px-6 py-4 border-b border-panel-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/write')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-bangers text-2xl text-white">{quest.title}</h1>
          {isApproved && (
            <Badge variant="green-solid">
              <CircleCheckBig className="w-3 h-3" />
              Approved
            </Badge>
          )}
        </div>
      </div>

      {isApproved && !bannerDismissed && (
        <div className="px-6 py-3 bg-neon-green/10 border-b border-neon-green/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CircleCheckBig className="w-5 h-5 text-neon-green" />
            <p className="text-sm text-white">
              <span className="font-bangers text-neon-green">Quest approved!</span>
              {' '}Your quest has been reviewed and is ready to publish.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="cyan"
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              <Rocket className="w-4 h-4" />
              {isPublishing ? 'Publishing...' : 'Publish Now'}
            </Button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Tabs defaultValue="settings" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-panel-border">
          <TabsList>
            <TabsTrigger value="settings" icon={<Settings className="w-4 h-4" />}>
              Quest Info
            </TabsTrigger>
            <TabsTrigger value="waypoints" icon={<MapPin className="w-4 h-4" />}>
              Waypoints
            </TabsTrigger>
            <TabsTrigger value="create" icon={<Film className="w-4 h-4" />}>
              Create
            </TabsTrigger>
            <TabsTrigger value="reviews" icon={<Star className="w-4 h-4" />}>
              Reviews
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <TabsContent value="settings" className="h-full overflow-y-auto">
            <QuestSettings questId={quest.id} />
          </TabsContent>

          <TabsContent value="waypoints" className="h-full">
            <WaypointEditor questId={quest.id} />
          </TabsContent>

          <TabsContent value="create" className="h-full">
            <CreateTab questId={quest.id} />
          </TabsContent>

          <TabsContent value="reviews" className="h-full overflow-y-auto">
            <QuestReviews questId={quest.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default QuestEditor;
