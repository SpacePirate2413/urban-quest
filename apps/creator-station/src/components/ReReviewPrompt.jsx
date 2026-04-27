import { AlertTriangle, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Button, Modal } from './ui';
import { api } from '../services/api';
import { useWriterStore } from '../store/useWriterStore';

/**
 * Watches the active quest for `submissionStatus === 'needs_re_review'` and
 * shows a popup prompting the creator to resubmit for review.
 *
 * Mount this inside QuestEditor so it is always visible while editing.
 */
export function ReReviewPrompt({ questId }) {
  const { quests, updateQuest } = useWriterStore();
  const quest = quests.find(q => q.id === questId);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show the popup automatically when the quest enters 'needs_re_review'
  useEffect(() => {
    if (quest?.submissionStatus === 'needs_re_review') {
      setIsOpen(true);
    }
  }, [quest?.submissionStatus]);

  if (!quest || quest.submissionStatus !== 'needs_re_review') return null;

  const handleResubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.submitQuest(questId);
      updateQuest(questId, { submissionStatus: 'pending' });
      setIsOpen(false);
    } catch (err) {
      console.error('Resubmit failed:', err);
      alert(`Resubmit failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Persistent banner when popup is dismissed */}
      {!isOpen && (
        <div
          className="px-6 py-3 bg-yellow/10 border-b border-yellow/30 flex items-center justify-between cursor-pointer hover:bg-yellow/15 transition-colors"
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow" />
            <p className="text-sm text-white">
              <span className="font-bangers text-yellow">Changes need re-review.</span>
              {' '}Click to resubmit for admin approval.
            </p>
          </div>
          <Badge variant="yellow">
            <AlertTriangle className="w-3 h-3" />
            Needs Re-Review
          </Badge>
        </div>
      )}

      {/* Modal popup */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Resubmit for Review?">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow/10 rounded-lg border border-yellow/30">
            <AlertTriangle className="w-6 h-6 text-yellow flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">
                You've made changes to a published quest.
              </p>
              <p className="text-sm text-white/70 mt-1">
                Changes to quest info, scenes, or media on a published quest must be re-reviewed
                by an admin before they go live.
              </p>
            </div>
          </div>

          <div className="p-3 bg-input-bg rounded-lg border border-panel-border">
            <p className="text-xs text-white/50 font-bangers uppercase tracking-wider mb-1">
              What happens next
            </p>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• Your quest stays published while under review</li>
              <li>• Players will see the current live version</li>
              <li>• Once approved, your changes go live automatically</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
              Later
            </Button>
            <Button
              variant="cyan"
              className="flex-1"
              onClick={handleResubmit}
              disabled={isSubmitting}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Resubmit for Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
