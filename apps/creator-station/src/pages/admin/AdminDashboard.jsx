import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Clock,
    DollarSign,
    FileAudio,
    FileCheck,
    FileVideo,
    Loader2,
    Mail,
    Shield,
    ShieldAlert,
    Sparkles,
    Tag,
    User,
    Users,
    XCircle
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Textarea } from '../../components/ui';
import { api } from '../../services/api';
import { ReportsTab } from './ReportsTab';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'reports'
  const [questSubmissions, setQuestSubmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [expandedQuestId, setExpandedQuestId] = useState(null);
  const [selectedScene, setSelectedScene] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const mediaRef = useRef(null);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const result = await api.getSubmissions({
        status: statusFilter,
        mediaType: typeFilter,
      });
      setQuestSubmissions(result.questSubmissions || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, typeFilter]);

  const stats = {
    total: questSubmissions.length,
    pending: questSubmissions.filter(q => q.submissionStatus === 'pending').length,
    approved: questSubmissions.filter(q => q.submissionStatus === 'approved').length,
    rejected: questSubmissions.filter(q => q.submissionStatus === 'rejected').length,
    uniqueWriters: new Set(questSubmissions.map(q => q.writerId)).size,
  };

  const handleApproveQuest = async () => {
    if (!selectedQuest || isReviewing) return;
    setIsReviewing(true);
    try {
      await api.reviewQuestSubmission(selectedQuest.questId, 'approved', reviewNotes);
      setSelectedQuest(null);
      setSelectedScene(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch (err) {
      console.error('Approve quest failed:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRejectQuest = async () => {
    if (!selectedQuest || isReviewing) return;
    setIsReviewing(true);
    try {
      await api.reviewQuestSubmission(selectedQuest.questId, 'rejected', reviewNotes);
      setSelectedQuest(null);
      setSelectedScene(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch (err) {
      console.error('Reject quest failed:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRejectScene = async (sceneId) => {
    if (isReviewing) return;
    setIsReviewing(true);
    try {
      await api.reviewSceneSubmission(sceneId, 'rejected', reviewNotes);
      setSelectedScene(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch (err) {
      console.error('Reject scene failed:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApproveScene = async (sceneId) => {
    if (isReviewing) return;
    setIsReviewing(true);
    try {
      await api.reviewSceneSubmission(sceneId, 'approved', reviewNotes);
      setSelectedScene(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch (err) {
      console.error('Approve scene failed:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const getMediaSrc = (mediaUrl) => {
    if (!mediaUrl) return null;
    const origin = new URL(API_BASE).origin;
    return `${origin}${mediaUrl}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusConfig = {
    pending: { color: 'yellow', icon: Clock, label: 'Pending' },
    needs_re_review: { color: 'orange', icon: AlertTriangle, label: 'Re-Review' },
    approved: { color: 'green', icon: CheckCircle, label: 'Approved' },
    rejected: { color: 'pink', icon: XCircle, label: 'Rejected' },
  };

  const handleSelectQuest = (quest) => {
    setSelectedQuest(quest);
    setSelectedScene(null);
    setReviewNotes('');
    setExpandedQuestId(quest.questId);
  };

  return (
    <div className="min-h-screen bg-navy-deep">
      <header className="h-16 bg-panel border-b border-panel-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Shield className="w-6 h-6 text-orange" />
          <h1 className="font-bangers text-2xl text-white">Admin Portal</h1>
          <Badge variant="orange-solid">Review Queue</Badge>
        </div>
        <a href="/write" className="text-sm text-cyan hover:underline">
          ← Back to Writer Studio
        </a>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex gap-2 mb-6 border-b border-panel-border">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 font-bangers uppercase tracking-wider text-sm transition-colors flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'submissions'
                ? 'text-cyan border-cyan'
                : 'text-white/50 border-transparent hover:text-white/80'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Submissions
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 font-bangers uppercase tracking-wider text-sm transition-colors flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'reports'
                ? 'text-orange border-orange'
                : 'text-white/50 border-transparent hover:text-white/80'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Reports
          </button>
        </div>

        {activeTab === 'reports' ? <ReportsTab /> : <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard 
            icon={<BarChart3 className="w-5 h-5" />}
            value={stats.total}
            label="Total Quests"
            color="cyan"
          />
          <StatCard 
            icon={<Clock className="w-5 h-5" />}
            value={stats.pending}
            label="Pending Review"
            color="yellow"
          />
          <StatCard 
            icon={<CheckCircle className="w-5 h-5" />}
            value={stats.approved}
            label="Approved"
            color="green"
          />
          <StatCard 
            icon={<XCircle className="w-5 h-5" />}
            value={stats.rejected}
            label="Rejected"
            color="pink"
          />
          <StatCard 
            icon={<Users className="w-5 h-5" />}
            value={stats.uniqueWriters}
            label="Writers"
            color="purple"
          />
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-panel-border flex items-center justify-between">
                <h2 className="font-bangers text-lg text-white">Quest Submissions</h2>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-input-bg border border-panel-border rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="needs_re_review">Re-Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-input-bg border border-panel-border rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-panel-border max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-cyan animate-spin mx-auto mb-3" />
                    <p className="font-bangers text-white/70">Loading submissions...</p>
                  </div>
                ) : questSubmissions.map((quest) => {
                  const status = statusConfig[quest.submissionStatus] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  const isSelected = selectedQuest?.questId === quest.questId;
                  const isExpanded = expandedQuestId === quest.questId;

                  return (
                    <div key={quest.questId}>
                      <div
                        onClick={() => handleSelectQuest(quest)}
                        className={`p-4 cursor-pointer transition-all hover:bg-panel-border/30 ${
                          isSelected ? 'bg-cyan/10 border-l-4 border-cyan' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedQuestId(isExpanded ? null : quest.questId);
                            }}
                            className="mt-1 text-white/50 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bangers text-sm text-white truncate">
                                {quest.questTitle}
                              </p>
                              <span className="text-xs text-white/50">
                                {quest.sceneCount} scene{quest.sceneCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-white/50 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {quest.writerName}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={status.color}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                            <span className="text-[10px] text-white/50">
                              {formatDate(quest.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-panel/50 border-t border-panel-border">
                          {quest.scenes.map((scene) => {
                            const sceneStatus = statusConfig[scene.mediaStatus] || statusConfig.pending;
                            const SceneStatusIcon = sceneStatus.icon;
                            const isSceneSelected = selectedScene?.id === scene.id;

                            return (
                              <div
                                key={scene.id}
                                onClick={() => setSelectedScene(scene)}
                                className={`pl-12 pr-4 py-3 cursor-pointer transition-all hover:bg-panel-border/20 border-b border-panel-border/50 last:border-b-0 ${
                                  isSceneSelected ? 'bg-purple/10' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center ${
                                    scene.mediaType === 'video' ? 'bg-purple/20' : 'bg-cyan/20'
                                  }`}>
                                    {scene.mediaType === 'video' ? (
                                      <FileVideo className="w-4 h-4 text-purple" />
                                    ) : (
                                      <FileAudio className="w-4 h-4 text-cyan" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white font-bangers">
                                      Scene {scene.sceneIndex + 1}
                                      {scene.waypointName && (
                                        <span className="text-white/50 ml-2">@ {scene.waypointName}</span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-white/50 uppercase">{scene.mediaType}</p>
                                  </div>
                                  <Badge variant={sceneStatus.color} className="text-[9px]">
                                    <SceneStatusIcon className="w-2.5 h-2.5" />
                                    {sceneStatus.label}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!isLoading && questSubmissions.length === 0 && (
                  <div className="p-12 text-center">
                    <FileCheck className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="font-bangers text-white/70">No submissions found</p>
                    <p className="text-sm text-white/50 mt-1">
                      Creators submit quests for review from the Audio Studio
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="w-96">
            <Card className="sticky top-6">
              {selectedScene ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-purple" />
                    <h3 className="font-bangers text-lg text-white">Scene Review</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-input-bg rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          selectedScene.mediaType === 'video' ? 'bg-purple/20' : 'bg-cyan/20'
                        }`}>
                          {selectedScene.mediaType === 'video' ? (
                            <FileVideo className="w-6 h-6 text-purple" />
                          ) : (
                            <FileAudio className="w-6 h-6 text-cyan" />
                          )}
                        </div>
                        <div>
                          <p className="font-bangers text-sm text-white uppercase">{selectedScene.mediaType}</p>
                          <p className="text-xs text-white/50">Scene {selectedScene.sceneIndex + 1}</p>
                        </div>
                      </div>

                      {selectedScene.mediaUrl && selectedScene.mediaType === 'audio' && (
                        <audio ref={mediaRef} controls className="w-full mt-2" src={getMediaSrc(selectedScene.mediaUrl)} />
                      )}
                      {selectedScene.mediaUrl && selectedScene.mediaType === 'video' && (
                        <video ref={mediaRef} controls className="w-full mt-2 rounded-lg max-h-48" src={getMediaSrc(selectedScene.mediaUrl)} />
                      )}
                      {!selectedScene.mediaUrl && (
                        <p className="text-xs text-white/50 mt-2 italic">No media file available</p>
                      )}
                    </div>

                    {selectedScene.script && (
                      <div className="space-y-2">
                        <h4 className="font-bangers text-xs text-white/70 uppercase">Scene Script</h4>
                        <div className="bg-input-bg rounded-lg p-3 max-h-32 overflow-y-auto">
                          <p className="text-xs text-white/70 whitespace-pre-wrap">{selectedScene.script}</p>
                        </div>
                      </div>
                    )}

                    {selectedScene.mediaStatus === 'pending' && (
                      <>
                        <Textarea
                          label="Scene Notes"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add notes for this scene..."
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button variant="green" className="flex-1" onClick={() => handleApproveScene(selectedScene.id)} disabled={isReviewing}>
                            {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Approve Scene
                          </Button>
                          <Button variant="pink" className="flex-1" onClick={() => handleRejectScene(selectedScene.id)} disabled={isReviewing}>
                            {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Reject Scene
                          </Button>
                        </div>
                        <p className="text-[10px] text-hot-pink/70 text-center">
                          Rejecting a scene will reject the entire quest
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedScene(null)}
                    className="mt-3 text-xs text-cyan hover:underline"
                  >
                    ← Back to quest overview
                  </button>
                </div>
              ) : selectedQuest ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-yellow" />
                    <h3 className="font-bangers text-lg text-white">Quest Review</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-bangers text-xs text-white/70 uppercase">Quest Details</h4>
                      <div className="bg-input-bg rounded-lg p-3 space-y-3">
                        {selectedQuest.coverImage && (
                          <img
                            src={selectedQuest.coverImage}
                            alt="Quest cover"
                            className="w-full h-28 object-cover rounded-lg"
                          />
                        )}
                        <p className="font-bangers text-sm text-white">{selectedQuest.questTitle}</p>
                        {selectedQuest.questDescription && (
                          <p className="text-xs text-white/60 leading-relaxed">{selectedQuest.questDescription}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-white/70">
                            <Tag className="w-3 h-3 text-cyan" />
                            {selectedQuest.genre || 'No genre'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white/70">
                            <Shield className="w-3 h-3 text-yellow" />
                            {selectedQuest.ageRating || 'E'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white/70">
                            <DollarSign className="w-3 h-3 text-neon-green" />
                            {selectedQuest.price > 0 ? `$${selectedQuest.price.toFixed(2)}` : 'Free'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white/70">
                            <Clock className="w-3 h-3 text-orange" />
                            {selectedQuest.estimatedDuration ? `${selectedQuest.estimatedDuration} min` : 'Not set'}
                          </div>
                        </div>
                        {selectedQuest.usesAI && (
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-cyan" />
                            <span className="text-xs text-cyan font-bangers">Uses AI Narration</span>
                          </div>
                        )}
                        <p className="text-[10px] text-white/40">{selectedQuest.sceneCount} scene{selectedQuest.sceneCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bangers text-xs text-white/70 uppercase">Scenes</h4>
                      <div className="space-y-1">
                        {selectedQuest.scenes.map((scene) => {
                          const scStatus = statusConfig[scene.mediaStatus] || statusConfig.pending;
                          return (
                            <div
                              key={scene.id}
                              onClick={() => setSelectedScene(scene)}
                              className="bg-input-bg rounded-lg p-2 flex items-center gap-2 cursor-pointer hover:bg-panel-border/50 transition-all"
                            >
                              <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                scene.mediaType === 'video' ? 'bg-purple/20' : 'bg-cyan/20'
                              }`}>
                                {scene.mediaType === 'video' ? (
                                  <FileVideo className="w-3 h-3 text-purple" />
                                ) : (
                                  <FileAudio className="w-3 h-3 text-cyan" />
                                )}
                              </div>
                              <span className="text-xs text-white font-bangers flex-1">Scene {scene.sceneIndex + 1}</span>
                              <Badge variant={scStatus.color} className="text-[9px]">
                                {scStatus.label}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-white/50">Click a scene to preview its media</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bangers text-xs text-white/70 uppercase">Writer Info</h4>
                      <div className="bg-input-bg rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple" />
                          <span className="text-sm text-white">{selectedQuest.writerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-cyan" />
                          <span className="text-sm text-white/70">{selectedQuest.writerEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow" />
                          <span className="text-sm text-white/70">{formatDate(selectedQuest.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {(selectedQuest.submissionStatus === 'pending' || selectedQuest.submissionStatus === 'needs_re_review') ? (
                      <>
                        <Textarea
                          label="Review Notes"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add notes for the writer..."
                          rows={3}
                        />

                        <div className="flex gap-2">
                          <Button variant="green" className="flex-1" onClick={handleApproveQuest} disabled={isReviewing}>
                            {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Approve All
                          </Button>
                          <Button variant="pink" className="flex-1" onClick={handleRejectQuest} disabled={isReviewing}>
                            {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Reject All
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="font-bangers text-xs text-white/70 uppercase">Review Result</h4>
                        <div className={`rounded-lg p-3 ${
                          selectedQuest.submissionStatus === 'approved' 
                            ? 'bg-neon-green/10 border border-neon-green/30' 
                            : 'bg-hot-pink/10 border border-hot-pink/30'
                        }`}>
                          <Badge variant={statusConfig[selectedQuest.submissionStatus]?.color || 'yellow'} className="mb-2">
                            {statusConfig[selectedQuest.submissionStatus]?.label || selectedQuest.submissionStatus}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="font-bangers text-white/70">Select a quest</p>
                  <p className="text-sm text-white/50 mt-1">
                    Click on a quest submission to review it
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  const colorClasses = {
    cyan: 'text-cyan border-cyan/30 bg-cyan/5',
    green: 'text-neon-green border-neon-green/30 bg-neon-green/5',
    yellow: 'text-yellow border-yellow/30 bg-yellow/5',
    pink: 'text-hot-pink border-hot-pink/30 bg-hot-pink/5',
    purple: 'text-purple border-purple/30 bg-purple/5',
  };

  return (
    <Card className={`p-4 border-[1.5px] ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-panel">
          {icon}
        </div>
        <div>
          <p className="font-bangers text-2xl">{value}</p>
          <p className="font-bangers text-[10px] uppercase tracking-wider text-white/70">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default AdminDashboard;
