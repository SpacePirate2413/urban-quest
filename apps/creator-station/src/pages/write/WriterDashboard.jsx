import {
    BookOpen,
    CheckCircle,
    DollarSign,
    Film,
    MapPin,
    Mic,
    Plus,
    ShoppingCart,
    Sparkles,
    Theater
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import { NARRATOR_VOICES, useWriterStore } from '../../store/useWriterStore';

const statusColors = {
  draft: 'gray',
  review: 'yellow',
  published: 'green-solid',
};

const statusLabels = {
  draft: 'Draft',
  review: 'In Review',
  published: 'Published',
};

export function WriterDashboard() {
  const navigate = useNavigate();
  const { quests, addQuest, setActiveQuest } = useWriterStore();

  const stats = {
    total: quests.length,
    published: quests.filter(q => q.status === 'published').length,
    totalSales: quests.reduce((sum, q) => sum + q.sales, 0),
    revenue: quests.reduce((sum, q) => sum + q.revenue, 0),
  };

  const handleNewQuest = async () => {
    try {
      const newQuest = await addQuest({
        title: 'Untitled Quest',
        description: '',
        genre: 'Adventure',
        price: 0,
      });
      if (newQuest?.id) {
        setActiveQuest(newQuest.id);
        navigate(`/write/quest/${newQuest.id}`);
      }
    } catch (err) {
      console.error('Failed to create quest:', err);
    }
  };

  const handleQuestClick = (quest) => {
    setActiveQuest(quest.id);
    navigate(`/write/quest/${quest.id}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<BookOpen className="w-6 h-6" />}
          value={stats.total}
          label="Total Quests"
          color="cyan"
        />
        <StatCard 
          icon={<CheckCircle className="w-6 h-6" />}
          value={stats.published}
          label="Published"
          color="green"
        />
        <StatCard 
          icon={<ShoppingCart className="w-6 h-6" />}
          value={stats.totalSales}
          label="Total Sales"
          color="yellow"
        />
        <StatCard 
          icon={<DollarSign className="w-6 h-6" />}
          value={`$${stats.revenue.toFixed(2)}`}
          label="Revenue"
          color="pink"
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bangers text-2xl text-white">Your Quests</h2>
        <Button variant="cyan" onClick={handleNewQuest}>
          <Plus className="w-4 h-4" />
          New Quest
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {quests.map((quest) => (
          <QuestCard 
            key={quest.id} 
            quest={quest} 
            onClick={() => handleQuestClick(quest)}
          />
        ))}
      </div>

      {quests.length === 0 && (
        <div className="text-center py-16">
          <Theater className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h3 className="font-bangers text-xl text-white mb-2">No Quests Yet</h3>
          <p className="text-white/70 mb-6">Create your first interactive story</p>
          <Button variant="cyan" onClick={handleNewQuest}>
            <Plus className="w-4 h-4" />
            Create Quest
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  const colorClasses = {
    cyan: 'text-cyan border-cyan/30 bg-cyan/5',
    green: 'text-neon-green border-neon-green/30 bg-neon-green/5',
    yellow: 'text-yellow border-yellow/30 bg-yellow/5',
    pink: 'text-hot-pink border-hot-pink/30 bg-hot-pink/5',
  };

  return (
    <Card className={`p-4 border-[1.5px] ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bangers text-3xl">{value}</p>
          <p className="font-bangers text-xs uppercase tracking-wider text-white/70 mt-1">
            {label}
          </p>
        </div>
        <div className={`p-2 rounded-lg bg-panel`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function QuestCard({ quest, onClick }) {
  const voice = NARRATOR_VOICES.find(v => v.id === quest.narratorVoiceId);

  return (
    <Card hover onClick={onClick} className="overflow-hidden">
      <div 
        className="h-32 flex items-center justify-center relative"
        style={{
          background: quest.coverImage 
            ? `url(${quest.coverImage}) center/cover`
            : 'linear-gradient(to bottom right, var(--panel-border), var(--navy-deep))',
        }}
      >
        {!quest.coverImage && <Theater className="w-12 h-12 text-white/20" />}
        {quest.coverImage && <div className="absolute inset-0 bg-black/30" />}
        
        <div className="absolute top-3 left-3 z-10">
          <Badge variant={statusColors[quest.status]}>
            {statusLabels[quest.status]}
          </Badge>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          {quest.ageRating && (
            <Badge variant="gray">{quest.ageRating}</Badge>
          )}
          {quest.usesAI && (
            <Badge variant="cyan">
              <Sparkles className="w-3 h-3" />
              AI
            </Badge>
          )}
          <Badge variant="purple">{quest.genre}</Badge>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bangers text-lg text-white mb-2 truncate">
          {quest.title}
        </h3>

        <div className="flex items-center gap-4 text-xs text-white/70 mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {quest.waypoints.length}
          </span>
          <span className="flex items-center gap-1">
            <Film className="w-3 h-3" />
            {quest.scenes.length}
          </span>
          {voice && (
            <span className="flex items-center gap-1" style={{ color: voice.color }}>
              <Mic className="w-3 h-3" />
              {voice.name}
            </span>
          )}
        </div>

        {quest.status === 'published' && (
          <div className="flex items-center justify-between pt-3 border-t border-panel-border">
            <div className="flex items-center gap-3">
              <span className="text-xs">
                {quest.price === 0 ? (
                  <span className="text-neon-green font-bangers">FREE</span>
                ) : (
                  <span className="text-yellow font-bangers">${quest.price.toFixed(2)}</span>
                )}
              </span>
              <span className="text-xs text-white/70">
                <span className="text-yellow font-bangers">{quest.sales}</span> plays
              </span>
            </div>
            <span className="text-xs text-neon-green font-bangers">
              ${quest.revenue.toFixed(2)}
            </span>
          </div>
        )}

        {quest.status !== 'published' && (
          <div className="pt-3 border-t border-panel-border">
            <span className="text-xs text-white/70">
              {quest.price === 0 ? (
                <span className="text-neon-green font-bangers">FREE <span className="text-white/50 font-sans text-[10px]">(ad revenue)</span></span>
              ) : (
                <span className="text-yellow font-bangers">${quest.price.toFixed(2)}</span>
              )}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default WriterDashboard;
