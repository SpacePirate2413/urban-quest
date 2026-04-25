import { BookOpen, CheckCircle, CreditCard, DollarSign, Link2, Mail, Pencil, Save, Tag, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import { api } from '../../services/api';
import { GENRES, useWriterStore } from '../../store/useWriterStore';

export function CreatorProfile() {
  const navigate = useNavigate();
  const { writer, quests } = useWriterStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    genres: [],
  });

  useEffect(() => {
    if (writer) {
      setForm({
        name: writer.name || '',
        bio: writer.bio || '',
        genres: writer.genres ? writer.genres.split(',').map((g) => g.trim()) : [],
      });
    }
  }, [writer]);

  const publishedQuests = quests.filter((q) => q.status === 'published');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateProfile({
        name: form.name,
        bio: form.bio,
        genres: form.genres.join(', '),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGenre = (genre) => {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  if (!writer) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bangers text-2xl text-white">Creator Profile</h2>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button variant="cyan" size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-purple/20 border-2 border-purple flex items-center justify-center shrink-0">
            {writer.avatarUrl ? (
              <img
                src={writer.avatarUrl}
                alt={writer.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-purple" />
            )}
          </div>

          <div className="flex-1 space-y-4">
            {isEditing ? (
              <div>
                <label className="font-bangers text-xs uppercase tracking-wider text-white block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-input-bg border-[1.5px] border-panel-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan transition-colors"
                  placeholder="Your creator name..."
                />
              </div>
            ) : (
              <div>
                <h3 className="font-bangers text-xl text-white">{writer.name || 'Unnamed Creator'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-3 h-3 text-white/40" />
                  <span className="text-xs text-white/50">{writer.email}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-white/70">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-cyan" />
                {quests.length} quests
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-neon-green" />
                {publishedQuests.length} published
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-cyan" />
          <h3 className="font-bangers text-lg text-white">About</h3>
        </div>

        {isEditing ? (
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={4}
            className="w-full bg-input-bg border-[1.5px] border-panel-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan transition-colors resize-none"
            placeholder="Tell players about yourself as a quest creator..."
          />
        ) : (
          <p className="text-sm text-white/70 leading-relaxed">
            {writer.bio || 'No bio yet. Click Edit Profile to add one.'}
          </p>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-yellow" />
          <h3 className="font-bangers text-lg text-white">Genres</h3>
        </div>

        {isEditing ? (
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.genres.includes(genre)
                    ? 'bg-cyan/20 border-cyan text-cyan'
                    : 'bg-input-bg border-panel-border text-white/50 hover:border-white/30'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {form.genres.length > 0 ? (
              form.genres.map((genre) => (
                <Badge key={genre} variant="cyan">{genre}</Badge>
              ))
            ) : (
              <p className="text-sm text-white/50">No genres selected. Click Edit Profile to add your specialties.</p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-neon-green" />
          <h3 className="font-bangers text-lg text-white">Published Quests</h3>
        </div>

        {publishedQuests.length === 0 ? (
          <p className="text-sm text-white/50">No published quests yet. Your published quests will appear here.</p>
        ) : (
          <div className="space-y-3">
            {publishedQuests.map((quest) => (
              <div
                key={quest.id}
                onClick={() => navigate(`/write/quest/${quest.id}`)}
                className="flex items-center gap-4 p-3 bg-input-bg rounded-lg border border-panel-border hover:border-cyan/50 cursor-pointer transition-colors"
              >
                {quest.coverImage ? (
                  <img
                    src={quest.coverImage}
                    alt={quest.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-panel-border flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bangers text-sm text-white truncate">{quest.title}</p>
                  <p className="text-xs text-white/50 truncate">{quest.description || 'No description'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="purple" className="text-[10px]">{quest.genre}</Badge>
                    <span className="text-[10px] text-white/40">
                      {quest.price === 0 ? 'Free' : `$${quest.price.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-neon-green" />
          <h3 className="font-bangers text-xl text-white">Monetization</h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg">
            <p className="font-bangers text-lg text-neon-green mb-1">
              Writers earn 33% revenue share
            </p>
            <p className="text-sm text-white/70">
              You'll receive 33% of every sale after payment processing fees.
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-panel-border/50 rounded-lg">
            <DollarSign className="w-5 h-5 text-yellow" />
            <div>
              <p className="font-bangers text-sm text-white">$20 Minimum Payout</p>
              <p className="text-xs text-white/50">
                Earnings are paid out monthly once you reach the minimum threshold.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-panel-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bangers text-sm text-white">Stripe Connect</p>
                <p className="text-xs text-white/50">
                  {writer.stripeConnected
                    ? 'Your account is connected and ready to receive payments.'
                    : 'Connect your Stripe account once to get paid on any quest you create.'
                  }
                </p>
              </div>
              {writer.stripeConnected ? (
                <Badge variant="green">Connected</Badge>
              ) : (
                <Button variant="purple-outline" size="sm">
                  <CreditCard className="w-4 h-4" />
                  Connect Stripe
                </Button>
              )}
            </div>

            {writer.totalEarnings > 0 && (
              <div className="flex items-center justify-between p-3 bg-input-bg rounded-lg">
                <span className="text-sm text-white/70">Total Earnings</span>
                <span className="font-bangers text-lg text-neon-green">
                  ${writer.totalEarnings.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default CreatorProfile;
