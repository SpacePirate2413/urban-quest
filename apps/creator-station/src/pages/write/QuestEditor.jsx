import { ArrowLeft, CircleCheckBig, Film, MapPin, RefreshCw, Rocket, Send, Settings, Star, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReReviewPrompt } from '../../components/ReReviewPrompt';
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { api } from '../../services/api';
import { useWriterStore } from '../../store/useWriterStore';
import { CreateTab } from './CreateTab';
import { QuestReviews } from './QuestReviews';
import { QuestSettings } from './QuestSettings';
import { ValidationPanel } from './ValidationPanel';
import { WaypointEditor } from './WaypointEditor';
import { validateQuest } from './questValidation';

export function QuestEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quests, setActiveQuest, activeQuestId, loadQuests, updateQuest, updateScene } = useWriterStore();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Controlled tab so the validation panel can switch tabs on click.
  const [activeTab, setActiveTab] = useState('settings');

  // Submit + popup state.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const quest = quests.find(q => q.id === id);

  useEffect(() => {
    if (id && id !== activeQuestId) {
      setActiveQuest(id);
    }
  }, [id, activeQuestId, setActiveQuest]);

  // Errors recompute live on every quest/scene change. The panel itself
  // decides whether to render based on `panelOpen` + non-empty errors.
  const errors = useMemo(() => validateQuest(quest), [quest]);

  // Auto-close the panel the instant all errors clear, so the creator
  // gets the satisfying "everything's good" state for free.
  useEffect(() => {
    if (panelOpen && errors.length === 0) setPanelOpen(false);
  }, [panelOpen, errors.length]);

  // Auto-flip `usesAI` to true the first time we detect AI-narrated audio
  // on any scene (signaled by `narratorVoiceId` being set). We only flip
  // it ON automatically — the creator can still toggle it off manually
  // afterwards, and we never auto-flip it OFF (creators may have used AI
  // outside our station and need the toggle to stay where they put it).
  useEffect(() => {
    if (!quest) return;
    if (quest.usesAI) return;
    const anyAi = (quest.scenes || []).some((s) => !!s.narratorVoiceId);
    if (anyAi) {
      updateQuest(quest.id, { usesAI: true });
    }
  }, [quest, updateQuest]);

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
  const isLockedForSubmit =
    quest.submissionStatus === 'pending' || quest.submissionStatus === 'approved' || quest.status === 'published';

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

  const handleSubmitForReview = async () => {
    if (errors.length > 0) {
      // Force the panel open so even if the user dismissed it earlier, the
      // submit click resurfaces the issues.
      setPanelOpen(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.submitQuest(quest.id);
      // Optimistically mirror the API state so the UI doesn't flash.
      (quest.scenes || []).forEach((s) => updateScene(quest.id, s.id, { mediaStatus: 'pending' }));
      updateQuest(quest.id, { submissionStatus: 'pending' });
    } catch (err) {
      console.error('Submit quest failed:', err);
      alert(`Submit failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
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

        {/* Submit for Review — moved up here so it's reachable from any tab.
            Disabled while a submission is already in flight or once approved. */}
        <Button
          variant="green"
          onClick={handleSubmitForReview}
          disabled={isSubmitting || isLockedForSubmit || (quest.scenes?.length ?? 0) === 0}
          title={
            isLockedForSubmit
              ? 'This quest is already submitted, approved, or published'
              : errors.length > 0
                ? `${errors.length} issue${errors.length === 1 ? '' : 's'} to fix before submitting`
                : 'Submit this quest for admin review'
          }
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit for Review
              {errors.length > 0 && (
                <span className="ml-1 text-[10px] bg-red-500/30 text-red-100 rounded px-1.5 py-0.5">
                  {errors.length}
                </span>
              )}
            </>
          )}
        </Button>
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

      <ReReviewPrompt questId={quest.id} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-panel-border flex items-center justify-between">
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
          {(() => {
            const s = computeQuestStatus(quest);
            return <Badge variant={s.variant}>{s.label}</Badge>;
          })()}
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

      <ValidationPanel
        errors={errors}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onJumpToTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}

// Maps the quest's lifecycle to a single high-signal pill the creator can
// glance at from the tab bar. Status is derived from `quest.status` +
// `quest.submissionStatus` rather than a single column because the review
// cycle layers on top of the publication state.
//
//   Draft        → never been submitted; needs more work
//   In Progress  → submitted before, came back as rejected / needs_re_review;
//                  the creator is in the middle of revisions
//   In Review    → submitted, awaiting admin
//   Approved     → admin OK'd it but creator hasn't pushed Publish yet
//   Published    → live to players
function computeQuestStatus(quest) {
  if (quest.status === 'published') {
    return { label: 'Published', variant: 'green-solid' };
  }
  if (quest.submissionStatus === 'pending') {
    return { label: 'In Review', variant: 'yellow-solid' };
  }
  if (quest.submissionStatus === 'approved') {
    return { label: 'Approved', variant: 'green-solid' };
  }
  if (
    quest.submissionStatus === 'rejected' ||
    quest.submissionStatus === 'needs_re_review'
  ) {
    return { label: 'In Progress', variant: 'orange-solid' };
  }
  return { label: 'Draft', variant: 'red-solid' };
}

export default QuestEditor;
