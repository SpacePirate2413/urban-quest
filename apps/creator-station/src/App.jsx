import { CheckCircle, Rocket } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from './components/layout';
import { Badge, Button, Modal } from './components/ui';
import { useNotifications } from './hooks/useNotifications';
import { AdminDashboard } from './pages/admin';
import { CreatorProfile } from './pages/profile';
import { QuestEditor, WriterDashboard } from './pages/write';
import { api } from './services/api';
import { useWriterStore } from './store/useWriterStore';

// Fixed test user for development
const DEV_USER = { email: 'creator@urbanquest.dev', name: 'Test Creator' };

function LoginScreen() {
  const { login, isLoading, error } = useWriterStore();
  const [email, setEmail] = useState(DEV_USER.email);
  const [name, setName] = useState(DEV_USER.name);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (email) {
      await login(email, name || email.split('@')[0]);
    }
  };

  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center p-4">
      <div className="bg-panel border border-panel-border rounded-xl p-8 max-w-md w-full">
        <h1 className="font-bangers text-3xl text-center mb-2">
          <span className="text-cyan">URBAN</span>
          <span className="text-neon-green">QUEST</span>
        </h1>
        <p className="text-white/70 text-center mb-8">Creator Station</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-input border border-panel-border rounded-lg px-4 py-3 text-white focus:border-cyan focus:outline-none"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-2">Display Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-input border border-panel-border rounded-lg px-4 py-3 text-white focus:border-cyan focus:outline-none"
              placeholder="Your Name"
            />
          </div>
          {error && <p className="text-hot-pink text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan text-navy-deep font-bangers py-3 rounded-lg hover:bg-cyan/90 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { isAuthenticated, checkAuth } = useWriterStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth().finally(() => setChecking(false));
  }, [checkAuth]);

  // Admin portal doesn't require auth
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-navy-deep">
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-cyan font-bangers text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-navy-deep">
      <TopBar />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/write" replace />} />
          <Route path="/write" element={<WriterDashboard />} />
          <Route path="/write/quest/:id" element={<QuestEditor />} />
          <Route path="/profile" element={<CreatorProfile />} />
        </Routes>
      </main>
      <QuestApprovalListener />
    </div>
  );
}

function QuestApprovalListener() {
  const navigate = useNavigate();
  const { loadQuests } = useWriterStore();
  const [approved, setApproved] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleEvent = useCallback((data) => {
    if (data.event === 'quest:approved') {
      loadQuests();
      setApproved({ questId: data.questId, questTitle: data.questTitle });
    }
  }, [loadQuests]);

  useNotifications(handleEvent);

  const handlePublish = async () => {
    if (!approved) return;
    setIsPublishing(true);
    try {
      await api.publishQuest(approved.questId);
      await loadQuests();
      setApproved(null);
      navigate(`/write/quest/${approved.questId}`);
    } catch (err) {
      alert(`Publish failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Modal
      isOpen={!!approved}
      onClose={() => setApproved(null)}
      title="Quest Approved!"
    >
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-neon-green/20 border-2 border-neon-green flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-neon-green" />
        </div>
        <div>
          <p className="font-bangers text-xl text-white mb-1">
            {approved?.questTitle}
          </p>
          <p className="text-sm text-white/70">
            Your quest has been reviewed and approved by the admin team.
            It's ready to go live!
          </p>
        </div>
        <Badge variant="green">All Scenes Approved</Badge>
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setApproved(null)}
          >
            Later
          </Button>
          <Button
            variant="cyan"
            className="flex-1"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            <Rocket className="w-4 h-4" />
            {isPublishing ? 'Publishing...' : 'Publish Now'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
