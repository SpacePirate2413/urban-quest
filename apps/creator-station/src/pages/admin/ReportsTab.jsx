import { AlertTriangle, Ban, Loader2, ShieldAlert, Trash2, UserX, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Textarea } from '../../components/ui';
import { api } from '../../services/api';

const REASON_LABELS = {
  spam: 'Spam / scam',
  harassment: 'Harassment / bullying',
  sexual_minors: 'Sexual content involving a minor',
  hate: 'Hate speech',
  violence: 'Violence / gore',
  illegal: 'Illegal activity',
  ip: 'IP infringement',
  scam: 'Scam',
  impersonation: 'Impersonation',
  other: 'Other',
};

const URGENT_REASONS = new Set(['sexual_minors', 'violence', 'illegal']);

const ENTITY_LABELS = {
  quest: 'Quest',
  scene: 'Scene',
  review: 'Review',
  user: 'User',
};

const ACTIONS = [
  {
    value: 'dismiss',
    label: 'Dismiss',
    description: 'No violation. Closes the report without acting on the content or user.',
    Icon: XCircle,
    variant: 'ghost',
  },
  {
    value: 'remove_content',
    label: 'Remove content',
    description: 'Unpublish or delete the reported item. The user keeps their account.',
    Icon: Trash2,
    variant: 'orange',
  },
  {
    value: 'suspend_user',
    label: 'Suspend user',
    description: "Lock the user's account. They can log in to see a suspended notice.",
    Icon: UserX,
    variant: 'pink',
  },
  {
    value: 'ban_user',
    label: 'Ban user',
    description: 'Anonymize the account, archive all their published quests, prevent return. Use for egregious or repeat offenders.',
    Icon: Ban,
    variant: 'danger',
  },
];

function timeAgo(dateString) {
  const ms = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function slaState(createdAt) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (ageHours < 12) return { label: '< 12h', color: 'green' };
  if (ageHours < 24) return { label: '< 24h', color: 'yellow' };
  return { label: 'OVER SLA', color: 'pink' };
}

export function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const result = await api.getReports();
      setReports(result.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const selected = reports.find((r) => r.id === selectedId) || null;

  const handleResolve = async (action) => {
    if (!selected || acting) return;
    if ((action === 'suspend_user' || action === 'ban_user') && !window.confirm(
      action === 'ban_user'
        ? "Ban this user? Their account will be anonymized and all published quests archived. This is irreversible."
        : "Suspend this user? They'll see a suspension notice on their next sign-in."
    )) {
      return;
    }

    setActing(action);
    try {
      await api.resolveReport(selected.id, action, notes.trim() || undefined);
      setSelectedId(null);
      setNotes('');
      await fetchReports();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Queue */}
      <div className="flex-1">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-panel-border flex items-center justify-between">
            <div>
              <h2 className="font-bangers text-lg text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange" />
                Pending reports
              </h2>
              <p className="text-xs text-white/60 mt-1">
                {reports.length} pending — Apple/Google require action within 24h
              </p>
            </div>
            <Button variant="ghost" onClick={fetchReports}>Refresh</Button>
          </div>

          <div className="divide-y divide-panel-border max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-cyan animate-spin mx-auto mb-3" />
                <p className="font-bangers text-white/70">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center">
                <ShieldAlert className="w-10 h-10 text-white/30 mx-auto mb-3" />
                <p className="font-bangers text-white/70">No pending reports</p>
                <p className="text-xs text-white/50 mt-1">Reports filed by users will appear here.</p>
              </div>
            ) : (
              reports.map((r) => {
                const sla = slaState(r.createdAt);
                const isSelected = r.id === selectedId;
                const urgent = URGENT_REASONS.has(r.reason);
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedId(r.id);
                      setNotes('');
                    }}
                    className={`p-4 cursor-pointer transition-all hover:bg-panel-border/30 ${
                      isSelected ? 'bg-cyan/10 border-l-4 border-cyan' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={urgent ? 'pink-solid' : 'orange'}>
                          {ENTITY_LABELS[r.entityType] || r.entityType}
                        </Badge>
                        {urgent && (
                          <span className="flex items-center gap-1 text-pink text-xs font-bangers">
                            <AlertTriangle className="w-3 h-3" /> URGENT
                          </span>
                        )}
                      </div>
                      <Badge variant={sla.color === 'pink' ? 'pink-solid' : sla.color}>
                        {sla.label}
                      </Badge>
                    </div>
                    <p className="text-white text-sm font-semibold">
                      {REASON_LABELS[r.reason] || r.reason}
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      Reported by {r.reporter?.name || 'Anonymous'} · {timeAgo(r.createdAt)}
                    </p>
                    {r.details && (
                      <p className="text-white/80 text-xs mt-2 italic line-clamp-2">"{r.details}"</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Detail / actions */}
      <div className="w-[420px]">
        <Card className="p-5">
          {!selected ? (
            <div className="py-12 text-center text-white/50">
              <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-white/30" />
              <p className="font-bangers">Select a report to review</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="font-bangers text-xl text-white">
                  Report on {ENTITY_LABELS[selected.entityType] || selected.entityType}
                </h3>
                <p className="text-xs text-white/60 mt-1">
                  ID: {selected.entityId.slice(0, 12)}…
                </p>
              </div>

              <dl className="space-y-3 mb-5 text-sm">
                <div>
                  <dt className="text-white/50 text-xs uppercase tracking-wide mb-0.5">Reason</dt>
                  <dd className="text-white font-semibold">
                    {REASON_LABELS[selected.reason] || selected.reason}
                  </dd>
                </div>
                {selected.details && (
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wide mb-0.5">Reporter notes</dt>
                    <dd className="text-white/90 italic">"{selected.details}"</dd>
                  </div>
                )}
                <div>
                  <dt className="text-white/50 text-xs uppercase tracking-wide mb-0.5">Reporter</dt>
                  <dd className="text-white/90">
                    {selected.reporter?.name || 'Anonymous'}
                    {selected.reporter?.email && (
                      <span className="text-white/50 text-xs ml-2">{selected.reporter.email}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/50 text-xs uppercase tracking-wide mb-0.5">Filed</dt>
                  <dd className="text-white/90">
                    {new Date(selected.createdAt).toLocaleString()}
                    <span className="text-white/50 ml-2">({timeAgo(selected.createdAt)})</span>
                  </dd>
                </div>
              </dl>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Resolution notes (optional, internal-only)"
                rows={3}
                className="mb-4"
              />

              <div className="space-y-2">
                {ACTIONS.map(({ value, label, description, Icon, variant }) => (
                  <Button
                    key={value}
                    variant={variant}
                    className="w-full !justify-start"
                    disabled={!!acting}
                    onClick={() => handleResolve(value)}
                  >
                    {acting === value ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="flex-1 text-left">
                      <span className="block">{label}</span>
                      <span className="block text-xs opacity-75 font-normal">{description}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
