import { ArrowLeft, Film, Headphones, MapPin, Settings, Star } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { useWriterStore } from '../../store/useWriterStore';
import { AudioStudio } from './AudioStudio';
import { QuestReviews } from './QuestReviews';
import { QuestSettings } from './QuestSettings';
import { ScreenplayEditor } from './ScreenplayEditor';
import { WaypointEditor } from './WaypointEditor';

export function QuestEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quests, setActiveQuest, activeQuestId } = useWriterStore();

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

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="px-6 py-4 border-b border-panel-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/write')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-bangers text-2xl text-white">{quest.title}</h1>
        </div>
      </div>

      <Tabs defaultValue="waypoints" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-panel-border">
          <TabsList>
            <TabsTrigger value="waypoints" icon={<MapPin className="w-4 h-4" />}>
              Waypoints
            </TabsTrigger>
            <TabsTrigger value="story" icon={<Film className="w-4 h-4" />}>
              Story
            </TabsTrigger>
            <TabsTrigger value="media" icon={<Headphones className="w-4 h-4" />}>
              Media
            </TabsTrigger>
            <TabsTrigger value="settings" icon={<Settings className="w-4 h-4" />}>
              Quest Details
            </TabsTrigger>
            <TabsTrigger value="reviews" icon={<Star className="w-4 h-4" />}>
              Reviews
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <TabsContent value="waypoints" className="h-full">
            <WaypointEditor questId={quest.id} />
          </TabsContent>
          
          <TabsContent value="story" className="h-full">
            <ScreenplayEditor questId={quest.id} />
          </TabsContent>
          
          <TabsContent value="media" className="h-full">
            <AudioStudio questId={quest.id} />
          </TabsContent>
          
          <TabsContent value="settings" className="h-full overflow-y-auto">
            <QuestSettings questId={quest.id} />
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
