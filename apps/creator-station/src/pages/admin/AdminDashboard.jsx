import { useState, useRef } from 'react';
import { 
  Shield, 
  FileAudio, 
  FileVideo, 
  Clock, 
  CheckCircle, 
  XCircle,
  Play,
  Pause,
  User,
  Mail,
  Calendar,
  Filter,
  BarChart3,
  Users,
  FileCheck,
  AlertCircle,
  Volume2,
  Loader2
} from 'lucide-react';
import { Button, Card, Badge, Input, Textarea } from '../../components/ui';
import { useWriterStore } from '../../store/useWriterStore';
import { ttsService } from '../../services/ttsService';

const SAMPLE_NARRATIONS = {
  'sub-1': "Morning dew clings to the rose petals as sunlight filters through the lattice. The garden is quiet, save for the distant song of a mockingbird.",
  'sub-2': "The warehouse smells of rust and old secrets. Shadows dance across the concrete floor as a single bulb flickers overhead.",
  'sub-3': "You lean over the blueprints spread across the makeshift table. The crew watches you, waiting for your lead.",
  'sub-4': "An elderly woman tends to the roses with practiced hands. She doesn't look up as you approach, but somehow she knows you're there.",
};

export function AdminDashboard() {
  const { submissions, approveSubmission, rejectSubmission } = useWriterStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
    uniqueWriters: new Set(submissions.map(s => s.writerId)).size,
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    if (typeFilter !== 'all' && sub.mediaType !== typeFilter) return false;
    return true;
  });

  const handleApprove = () => {
    if (!selectedSubmission) return;
    approveSubmission(selectedSubmission.id, reviewNotes);
    setSelectedSubmission(null);
    setReviewNotes('');
  };

  const handleReject = () => {
    if (!selectedSubmission) return;
    rejectSubmission(selectedSubmission.id, reviewNotes);
    setSelectedSubmission(null);
    setReviewNotes('');
  };

  const handlePlayPreview = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    if (!selectedSubmission) return;

    setIsLoading(true);
    
    try {
      const sampleText = SAMPLE_NARRATIONS[selectedSubmission.id] || 
        "This is a sample narration preview for the submitted audio content. The actual uploaded file would play here in production.";
      
      const blob = await ttsService.generateSpeech(sampleText, 'narrator-male-deep', {
        exaggeration: 0.5,
        cfg_weight: 0.5,
        temperature: 0.8,
      });
      
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };
      
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setIsLoading(false);
    }
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
    approved: { color: 'green', icon: CheckCircle, label: 'Approved' },
    rejected: { color: 'pink', icon: XCircle, label: 'Rejected' },
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard 
            icon={<BarChart3 className="w-5 h-5" />}
            value={stats.total}
            label="Total Submissions"
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
                <h2 className="font-bangers text-lg text-white">Submissions</h2>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-input-bg border border-panel-border rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
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
                {filteredSubmissions.map((submission) => {
                  const status = statusConfig[submission.status];
                  const isSelected = selectedSubmission?.id === submission.id;
                  
                  return (
                    <div
                      key={submission.id}
                      onClick={() => setSelectedSubmission(submission)}
                      className={`p-4 cursor-pointer transition-all hover:bg-panel-border/30 ${
                        isSelected ? 'bg-cyan/10 border-l-4 border-cyan' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          submission.mediaType === 'video' ? 'bg-purple/20' : 'bg-cyan/20'
                        }`}>
                          {submission.mediaType === 'video' ? (
                            <FileVideo className="w-5 h-5 text-purple" />
                          ) : (
                            <FileAudio className="w-5 h-5 text-cyan" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bangers text-sm text-white truncate">
                              {submission.questTitle}
                            </p>
                            <span className="text-xs text-white/50">
                              Scene {submission.sceneIndex}
                            </span>
                          </div>
                          <p className="text-xs text-white/70 truncate">{submission.fileName}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-white/50 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {submission.writerName}
                            </span>
                            <span className="text-xs text-white/50">
                              {submission.fileSize}
                            </span>
                            <span className="text-xs text-white/50">
                              {submission.duration}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={status.color}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          <span className="text-[10px] text-white/50">
                            {formatDate(submission.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredSubmissions.length === 0 && (
                  <div className="p-12 text-center">
                    <FileCheck className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="font-bangers text-white/70">No submissions found</p>
                    <p className="text-sm text-white/50 mt-1">
                      Adjust filters or wait for new submissions
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="w-96">
            <Card className="sticky top-6">
              {selectedSubmission ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-yellow" />
                    <h3 className="font-bangers text-lg text-white">Review Submission</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-input-bg rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          selectedSubmission.mediaType === 'video' ? 'bg-purple/20' : 'bg-cyan/20'
                        }`}>
                          {selectedSubmission.mediaType === 'video' ? (
                            <FileVideo className="w-6 h-6 text-purple" />
                          ) : (
                            <FileAudio className="w-6 h-6 text-cyan" />
                          )}
                        </div>
                        <div>
                          <p className="font-bangers text-sm text-white">{selectedSubmission.fileName}</p>
                          <p className="text-xs text-white/50">
                            {selectedSubmission.fileSize} · {selectedSubmission.duration}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="cyan-outline"
                        size="sm"
                        className="w-full"
                        onClick={handlePlayPreview}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                          </>
                        ) : isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause Preview
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            Play Preview
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bangers text-xs text-white/70 uppercase">Quest Info</h4>
                      <div className="bg-input-bg rounded-lg p-3">
                        <p className="font-bangers text-sm text-white">{selectedSubmission.questTitle}</p>
                        <p className="text-xs text-white/50">Scene {selectedSubmission.sceneIndex}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bangers text-xs text-white/70 uppercase">Writer Info</h4>
                      <div className="bg-input-bg rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple" />
                          <span className="text-sm text-white">{selectedSubmission.writerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-cyan" />
                          <span className="text-sm text-white/70">{selectedSubmission.writerEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow" />
                          <span className="text-sm text-white/70">{formatDate(selectedSubmission.submittedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {selectedSubmission.status === 'pending' ? (
                      <>
                        <Textarea
                          label="Review Notes"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add notes for the writer..."
                          rows={3}
                        />

                        <div className="flex gap-2">
                          <Button
                            variant="green"
                            className="flex-1"
                            onClick={handleApprove}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            variant="pink"
                            className="flex-1"
                            onClick={handleReject}
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="font-bangers text-xs text-white/70 uppercase">Review Result</h4>
                        <div className={`rounded-lg p-3 ${
                          selectedSubmission.status === 'approved' 
                            ? 'bg-neon-green/10 border border-neon-green/30' 
                            : 'bg-hot-pink/10 border border-hot-pink/30'
                        }`}>
                          <Badge variant={statusConfig[selectedSubmission.status].color} className="mb-2">
                            {statusConfig[selectedSubmission.status].label}
                          </Badge>
                          {selectedSubmission.reviewNotes && (
                            <p className="text-sm text-white/70 mt-2">{selectedSubmission.reviewNotes}</p>
                          )}
                          {selectedSubmission.reviewedAt && (
                            <p className="text-xs text-white/50 mt-2">
                              Reviewed: {formatDate(selectedSubmission.reviewedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="font-bangers text-white/70">Select a submission</p>
                  <p className="text-sm text-white/50 mt-1">
                    Click on a submission to review it
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
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
